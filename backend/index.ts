import { Hono, type Context } from 'hono'
import { cors } from 'hono/cors'
import { createClient } from '@blinkdotnew/sdk'

const app = new Hono()
app.use('*', cors())

const getBlink = (env: Record<string, string>) => createClient({
  projectId: env.BLINK_PROJECT_ID,
  secretKey: env.BLINK_SECRET_KEY,
})

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const clean = (value: unknown, maxLength: number) => typeof value === 'string' ? value.trim().slice(0, maxLength) : ''

app.get('/health', (c) => c.json({ ok: true }))

app.post('/api/contact', async (c) => {
  const body = await c.req.json<Record<string, unknown>>()
  const name = clean(body.name, 120)
  const email = clean(body.email, 240)
  const phone = clean(body.phone, 60)
  const programInterest = clean(body.programInterest, 160)
  const message = clean(body.message, 2000)

  if (!name || !email || !email.includes('@')) {
    return c.json({ error: 'Please provide your name and a valid email address.' }, 400)
  }

  const blink = getBlink(c.env as Record<string, string>)
  const emailText = [
    'New ELEVIQ inquiry',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || 'Not provided'}`,
    `Interest: ${programInterest || 'Not specified'}`,
    '',
    message || 'I would like more information about ELEVIQ Prep.',
  ].join('\n')
  const safeMessage = escapeHtml(message || 'I would like more information about ELEVIQ Prep.').replaceAll('\n', '<br />')

  try {
    await blink.notifications.email({
      to: 'info@eleviqprep.com',
      replyTo: email,
      subject: `${programInterest || 'Website'} inquiry from ${name}`,
      text: emailText,
      html: `<h2>New ELEVIQ inquiry</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Phone:</strong> ${escapeHtml(phone || 'Not provided')}</p><p><strong>Interest:</strong> ${escapeHtml(programInterest || 'Not specified')}</p><p>${safeMessage}</p>`,
    })

    await blink.db.table('leads').create({
      name,
      email,
      phone: phone || undefined,
      programInterest: programInterest || undefined,
      notes: message || undefined,
      source: 'public_website',
    })

    return c.json({ success: true })
  } catch (error) {
    console.error('Contact inquiry failed', error)
    const message = error instanceof Error ? error.message : 'Unable to send inquiry.'
    return c.json({ error: message }, 500)
  }
})

const authAttemptTimes = new Map<string, number[]>()
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const normalizeEmail = (value: unknown) => clean(value, 240).toLowerCase()

const isRateLimited = (key: string, limit: number, windowMs: number) => {
  const now = Date.now()
  const recent = (authAttemptTimes.get(key) || []).filter((time) => now - time < windowMs)
  recent.push(now)
  authAttemptTimes.set(key, recent)
  return recent.length > limit
}

const requestIp = (c: Context) => {
  const cfIp = c.req.header('CF-Connecting-IP')
  if (cfIp) return clean(cfIp, 80)
  return clean(c.req.header('X-Forwarded-For')?.split(',')[0], 80) || 'unknown'
}

app.post('/api/auth/log-attempt', async (c) => {
  const body = await c.req.json<Record<string, unknown>>()
  const email = normalizeEmail(body.email)
  const result = body.result === 'success' || body.result === 'failure' ? body.result : ''
  if (!emailPattern.test(email) || email.split('@')[1] !== 'eleviqprep.com' || !result) return c.json({ success: true })

  const ip = requestIp(c)
  if (isRateLimited(`${ip}:${email}`, 12, 10 * 60 * 1000)) return c.json({ success: true })
  const userAgent = clean(c.req.header('User-Agent'), 500) || 'unknown'
  const reason = clean(body.reason, 240)
  const timestamp = new Date().toISOString()
  const blink = getBlink(c.env as Record<string, string>)

  let auditRecorded = true
  try {
    // Use service-role SQL for this unauthenticated audit endpoint. The audit_logs
    // table intentionally denies client writes, while the backend secret may write.
    await blink.db.sql(
      'INSERT INTO audit_logs (id, action, resource_type, result, metadata_json) VALUES (?, ?, ?, ?, ?)',
      [
        `audit_${crypto.randomUUID()}`,
        'auth_attempt',
        'authentication',
        result,
        JSON.stringify({ email, ip, userAgent, reason }),
      ],
    )
  } catch (error) {
    auditRecorded = false
    console.error('Auth attempt persistence failed', error)
  }
  // Audit logging is observability, not an authentication gate. Never turn a
  // successful or failed sign-in into a 503 when audit storage is unavailable.
  if (result === 'failure') {
    const safeReason = reason || 'Authentication failed'
    try {
      await blink.notifications.email({
        to: 'info@eleviqprep.com',
        subject: 'ELEVIQ authentication failure alert',
        text: `Authentication failure alert\\nTimestamp: ${timestamp}\\nAttempted email: ${email}\\nIP: ${ip}\\nReason: ${safeReason}`,
        html: `<h2>Authentication failure alert</h2><p><strong>Timestamp:</strong> ${escapeHtml(timestamp)}</p><p><strong>Attempted email:</strong> ${escapeHtml(email)}</p><p><strong>IP:</strong> ${escapeHtml(ip)}</p><p><strong>Reason:</strong> ${escapeHtml(safeReason)}</p>`,
      })
    } catch (error) {
      console.error('Auth failure alert email failed', error)
    }
  }
  return c.json({ success: true })
})

const adminOverview = async (c: Context) => {
  const blink = getBlink(c.env as Record<string, string>)
  let auth
  try {
    auth = await blink.auth.verifyToken(c.req.header('Authorization'))
  } catch (error) {
    console.error('Admin token verification failed', error)
    return c.json({ error: 'Unable to verify authorization.' }, 401)
  }
  if (!auth.valid) return c.json({ error: 'A valid bearer token is required.' }, 401)

  try {
    const verifiedUserResult = await blink.db.sql(
      'SELECT email, email_verified FROM users WHERE id = ? LIMIT 1',
      [auth.userId],
    )
    const verifiedUser = verifiedUserResult.rows[0] as { email?: string; emailVerified?: string | number } | undefined
    const verifiedEmail = verifiedUser?.email?.trim().toLowerCase()
    if (!verifiedUser || verifiedEmail?.split('@')[1] !== 'eleviqprep.com' || Number(verifiedUser.emailVerified) !== 1) {
      return c.json({ error: 'A verified ELEVIQ administrator account is required.' }, 403)
    }

    const roleResult = await blink.db.sql(
      `SELECT r.name AS roleName FROM user_roles ur JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = ? AND r.name IN (?, ?, ?) LIMIT 1`,
      [auth.userId, 'system_admin', 'admin', 'super_admin'],
    )
    const role = roleResult.rows[0] as { roleName?: string } | undefined
    if (!role?.roleName) return c.json({ error: 'Administrator role required.' }, 403)

    const [leadCount, studentCount, questionCount, productCount, leads, students, auditLogs] = await Promise.all([
      blink.db.sql('SELECT COUNT(*) AS total FROM leads'),
      blink.db.sql('SELECT COUNT(*) AS total FROM student_profiles'),
      blink.db.sql('SELECT COUNT(*) AS total FROM questions'),
      blink.db.sql('SELECT COUNT(*) AS total FROM products'),
      blink.db.sql(
        `SELECT id, name, email, stage, program_interest, created_at FROM leads
         ORDER BY created_at DESC LIMIT ?`,
        [10],
      ),
      blink.db.sql(
        `SELECT id, user_id, school, program_type, exam_type, status, readiness_score, created_at
         FROM student_profiles ORDER BY created_at DESC LIMIT ?`,
        [10],
      ),
      blink.db.sql(
        `SELECT id, user_id, action, resource_type, resource_id, result, metadata_json, created_at
         FROM audit_logs ORDER BY created_at DESC LIMIT ?`,
        [10],
      ),
    ])

    return c.json({
      success: true,
      authorized: true,
      role: role.roleName,
      counts: {
        leads: Number(leadCount.rows[0]?.total || 0),
        students: Number(studentCount.rows[0]?.total || 0),
        questions: Number(questionCount.rows[0]?.total || 0),
        products: Number(productCount.rows[0]?.total || 0),
      },
      recent: {
        leads: leads.rows,
        students: students.rows,
        auditLogs: auditLogs.rows,
      },
      health: { status: 'ok', database: 'ok', checkedAt: new Date().toISOString() },
    })
  } catch (error) {
    console.error('Admin overview query failed', error)
    return c.json({ error: 'The admin overview is temporarily unavailable.' }, 503)
  }
}

app.post('/api/admin/summary', adminOverview)
app.get('/api/admin/overview', adminOverview)

export default app
