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
    await blink.db.table('audit_logs').create({
      action: 'auth_attempt',
      resourceType: 'authentication',
      result,
      metadataJson: JSON.stringify({ email, ip, userAgent, reason }),
    })
  } catch (error) {
    auditRecorded = false
    console.error('Auth attempt persistence failed', error)
  }
  if (!auditRecorded) return c.json({ success: false, auditRecorded: false }, 503)
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

app.post('/api/admin/summary', async (c) => {
  const blink = getBlink(c.env as Record<string, string>)
  const auth = await blink.auth.verifyToken(c.req.header('Authorization'))
  if (!auth.valid) return c.json({ error: 'Unauthorized' }, 401)

  const verifiedUserResult = await blink.db.sql(
    'SELECT email, email_verified FROM users WHERE id = ? LIMIT 1',
    [auth.userId],
  )
  const verifiedUser = verifiedUserResult.rows[0] as { email?: string; emailVerified?: string | number } | undefined
  const verifiedEmail = verifiedUser?.email?.toLowerCase()
  if (!verifiedUser || verifiedEmail?.split('@')[1] !== 'eleviqprep.com' || Number(verifiedUser.emailVerified) !== 1) {
    return c.json({ error: 'Forbidden' }, 403)
  }

  const roleResult = await blink.db.sql(
    `SELECT r.name AS roleName FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ? AND r.name IN (?, ?, ?) LIMIT 1`,
    [auth.userId, 'system_admin', 'admin', 'super_admin'],
  )
  if (!roleResult.rows.length) return c.json({ error: 'Forbidden' }, 403)

  const counts = await Promise.all([
    ['leads', 'leadsCount'],
    ['student_profiles', 'studentProfilesCount'],
    ['questions', 'questionsCount'],
    ['products', 'productsCount'],
  ].map(async ([table, alias]) => {
    const result = await blink.db.sql(`SELECT COUNT(*) AS ${alias} FROM ${table}`)
    return [table, Number(result.rows[0]?.[alias] || 0)] as const
  }))
  const countMap = Object.fromEntries(counts)
  return c.json({
    success: true,
    authorized: true,
    counts: {
      leads: Number(countMap.leads || 0),
      students: Number(countMap.student_profiles || 0),
      questions: Number(countMap.questions || 0),
      products: Number(countMap.products || 0),
    },
  })
})

export default app
