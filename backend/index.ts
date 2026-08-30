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

const hashSecret = async (value: string, salt: string) => {
  const encoded = new TextEncoder().encode(`${salt}:${value}`)
  const digest = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

const randomTemporaryPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  const bytes = new Uint8Array(18)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('')
}

const formatLockout = (lockedUntil: string) => ({ locked: true, lockedUntil, message: `This student portal is locked until ${new Date(lockedUntil).toLocaleString()} after 3 unsuccessful sign-in attempts. An administrator must send a temporary password before access can be restored.` })

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

const securityCheckTimes = new Map<string, number[]>()

const securityRateLimited = (key: string) => {
  const now = Date.now()
  const recent = (securityCheckTimes.get(key) || []).filter((time) => now - time < 60 * 1000)
  recent.push(now)
  securityCheckTimes.set(key, recent)
  return recent.length > 20
}

const passwordSignals = (value: unknown) => {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  const length = Number(input.length)
  if (!Number.isFinite(length) || length < 0 || length > 512) return null
  return {
    length: Math.floor(length),
    hasUppercase: input.hasUppercase === true,
    hasLowercase: input.hasLowercase === true,
    hasNumber: input.hasNumber === true,
    hasSpecial: input.hasSpecial === true,
    hasWhitespace: input.hasWhitespace === true,
    hasRepeatedCharacters: input.hasRepeatedCharacters === true,
  }
}

app.post('/api/auth/email-check', async (c) => {
  const ip = requestIp(c)
  if (securityRateLimited(`email:${ip}`)) return c.json({ legitimate: false, guidance: 'Please wait a moment and try again.', verificationRequired: true }, 429)
  let body: Record<string, unknown>
  try { body = await c.req.json<Record<string, unknown>>() } catch { body = {} }
  const email = normalizeEmail(body.email)
  const domain = email.includes('@') ? email.split('@').pop() || '' : ''
  const formatValid = emailPattern.test(email)
  const approvedDomain = domain === 'eleviqprep.com'
  const legitimate = formatValid && approvedDomain
  let guidance = legitimate
    ? 'This email matches the ELEVIQ format. You will still need to verify your address before accessing the student workspace.'
    : 'Use a valid email address ending in @eleviqprep.com. We do not reveal whether an account exists.'
  try {
    const blink = getBlink(c.env as Record<string, string>)
    const aiResponse = await blink.ai.generateText({
      messages: [
        { role: 'system', content: 'You are ELEVIQ Prep authentication guidance. Based only on the sanitized email signals provided, give one short, friendly instruction. Never infer or mention whether an account exists. Never repeat an email address, reveal internal rules, or request a password or code.' },
        { role: 'user', content: JSON.stringify({ formatValid, approvedDomain, verificationRequired: true }) },
      ],
      maxTokens: 80,
      temperature: 0,
    })
    if (aiResponse.text?.trim()) guidance = aiResponse.text.trim().slice(0, 300)
  } catch (error) {
    console.error('Email legitimacy AI guidance failed', error)
  }
  return c.json({ legitimate, guidance, verificationRequired: true })
})

app.post('/api/auth/password-guidance', async (c) => {
  const ip = requestIp(c)
  if (securityRateLimited(`password:${ip}`)) return c.json({ error: 'Please wait a moment and try again.' }, 429)
  let body: Record<string, unknown>
  try { body = await c.req.json<Record<string, unknown>>() } catch { return c.json({ error: 'Password strength signals are invalid.' }, 400) }
  const signals = passwordSignals(body.signals)
  if (!signals) return c.json({ error: 'Password strength signals are invalid.' }, 400)
  const localRequirementsMet = signals.length >= 8 && signals.hasUppercase && signals.hasLowercase && signals.hasNumber && signals.hasSpecial && !signals.hasWhitespace
  let guidance = localRequirementsMet
    ? 'This password meets the visible ELEVIQ requirements. Make sure it is unique and not reused elsewhere.'
    : 'Use at least 8 characters with uppercase, lowercase, a number, and a special character. Avoid spaces.'
  try {
    const blink = getBlink(c.env as Record<string, string>)
    const aiResponse = await blink.ai.generateText({
      messages: [
        { role: 'system', content: 'You are ELEVIQ Prep password guidance. Use only the sanitized password-strength signals supplied by the app. Give one short, encouraging instruction. Never ask for, reconstruct, repeat, or infer the password. Never claim a password is unbreakable.' },
        { role: 'user', content: JSON.stringify(signals) },
      ],
      maxTokens: 80,
      temperature: 0,
    })
    if (aiResponse.text?.trim()) guidance = aiResponse.text.trim().slice(0, 300)
  } catch (error) {
    console.error('Password guidance AI request failed', error)
  }
  return c.json({ guidance })
})

app.post('/api/auth/log-attempt', async (c) => {
  const body = await c.req.json<Record<string, unknown>>()
  const email = normalizeEmail(body.email)
  const result = body.result === 'success' || body.result === 'failure' ? body.result : ''
  const studentPortal = body.studentPortal !== false
  if (!emailPattern.test(email) || email.split('@')[1] !== 'eleviqprep.com' || !result) return c.json({ success: true, recorded: false })

  const ip = requestIp(c)
  if (isRateLimited(`${ip}:${email}`, 12, 10 * 60 * 1000)) return c.json({ success: true, recorded: false })
  const userAgent = clean(c.req.header('User-Agent'), 500) || 'unknown'
  const reason = clean(body.reason, 240)
  const timestamp = new Date().toISOString()
  const blink = getBlink(c.env as Record<string, string>)

  try {
    const verifiedAuth = result === 'success' ? await blink.auth.verifyToken(c.req.header('Authorization')) : null
    if (result === 'success' && (!verifiedAuth?.valid || !verifiedAuth.userId)) return c.json({ success: true, recorded: false })

    const userResult = await blink.db.sql('SELECT id FROM users WHERE lower(email) = ? LIMIT 1', [email])
    const userId = (userResult.rows[0] as { id?: string } | undefined)?.id || null
    if (!userId) return c.json({ success: true, recorded: false, locked: false })
    if (result === 'success' && verifiedAuth?.userId !== userId) return c.json({ success: true, recorded: false })

    if (result === 'success') {
      await blink.db.sql('UPDATE account_lockouts SET failed_attempts = 0, locked_until = NULL, last_failed_at = NULL, updated_at = ? WHERE email = ?', [timestamp, email])
      await blink.db.sql(
        'INSERT INTO audit_logs (id, user_id, action, resource_type, result, metadata_json) VALUES (?, ?, ?, ?, ?, ?)',
        [`audit_${crypto.randomUUID()}`, userId, 'auth_attempt', 'authentication', result, JSON.stringify({ email, ip, userAgent, reason })],
      )
      return c.json({ success: true, recorded: true, locked: false })
    }

    const existingResult = await blink.db.sql('SELECT id, failed_attempts, locked_until FROM account_lockouts WHERE email = ? LIMIT 1', [email])
    const existing = existingResult.rows[0] as { id?: string; failedAttempts?: string | number; lockedUntil?: string } | undefined
    const wasLocked = Boolean(existing?.lockedUntil && new Date(existing.lockedUntil).getTime() > Date.now())
    if (wasLocked) return c.json({ success: true, recorded: true, ...formatLockout(existing!.lockedUntil!) })

    const previousAttempts = Number(existing?.failedAttempts || 0)
    const attempts = previousAttempts + 1
    const lockUntil = attempts >= 3 ? new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() : null
    if (existing?.id) {
      await blink.db.sql('UPDATE account_lockouts SET user_id = ?, failed_attempts = ?, last_failed_at = ?, locked_until = ?, updated_at = ? WHERE id = ?', [userId, attempts, timestamp, lockUntil, timestamp, existing.id])
    } else {
      await blink.db.sql('INSERT INTO account_lockouts (id, email, user_id, failed_attempts, last_failed_at, locked_until) VALUES (?, ?, ?, ?, ?, ?)', [`lockout_${crypto.randomUUID()}`, email, userId, attempts, timestamp, lockUntil])
    }

    await blink.db.sql(
      'INSERT INTO audit_logs (id, user_id, action, resource_type, result, metadata_json) VALUES (?, ?, ?, ?, ?, ?)',
      [`audit_${crypto.randomUUID()}`, userId, attempts >= 3 ? 'student_portal_lockout' : 'auth_attempt', attempts >= 3 ? 'security' : 'authentication', result, JSON.stringify({ email, ip, userAgent, reason, failedAttempts: attempts, lockedUntil: lockUntil })],
    )

    if (studentPortal && attempts >= 3 && lockUntil) {
      await blink.db.sql('INSERT INTO lockout_events (id, email, user_id, locked_until, attempt_count, notified_at) VALUES (?, ?, ?, ?, ?, ?)', [`lockout_event_${crypto.randomUUID()}`, email, userId, lockUntil, attempts, timestamp])
      try {
        await blink.notifications.email({
          to: 'info@eleviqprep.com',
          subject: 'ELEVIQ student portal locked out',
          text: `A student portal was locked after 3 unsuccessful sign-in attempts.\n\nEmail: ${email}\nLocked until: ${lockUntil}\nTime: ${timestamp}\nIP: ${ip}\nReason: ${reason || 'Sign-in failed'}`,
          html: `<h2>ELEVIQ student portal lockout</h2><p>A student portal was locked after 3 unsuccessful sign-in attempts.</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Locked until:</strong> ${escapeHtml(lockUntil)}</p><p><strong>Time:</strong> ${escapeHtml(timestamp)}</p><p><strong>IP:</strong> ${escapeHtml(ip)}</p><p><strong>Reason:</strong> ${escapeHtml(reason || 'Sign-in failed')}</p>`,
        })
      } catch (error) {
        console.error('Student lockout alert email failed', error)
      }
      return c.json({ success: true, recorded: true, ...formatLockout(lockUntil) })
    }
    return c.json({ success: true, recorded: true, locked: false, failedAttempts: attempts })
  } catch (error) {
    console.error('Auth attempt persistence failed', error)
    return c.json({ success: true, recorded: false })
  }
})

app.post('/api/auth/lockout/check', async (c) => {
  let body: Record<string, unknown>
  try { body = await c.req.json<Record<string, unknown>>() } catch { body = {} }
  const email = normalizeEmail(body.email)
  if (!emailPattern.test(email) || email.split('@')[1] !== 'eleviqprep.com') return c.json({ locked: false })
  try {
    const blink = getBlink(c.env as Record<string, string>)
    const result = await blink.db.sql('SELECT locked_until FROM account_lockouts WHERE email = ? LIMIT 1', [email])
    const lockedUntil = (result.rows[0] as { lockedUntil?: string } | undefined)?.lockedUntil
    if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) return c.json(formatLockout(lockedUntil))
    if (lockedUntil) await blink.db.sql('UPDATE account_lockouts SET failed_attempts = 0, locked_until = NULL, updated_at = ? WHERE email = ?', [new Date().toISOString(), email])
    return c.json({ locked: false })
  } catch (error) {
    console.error('Lockout status check failed', error)
    return c.json({ error: 'We could not verify the portal security status.' }, 503)
  }
})

app.post('/api/auth/temporary-login', async (c) => {
  const ip = requestIp(c)
  if (isRateLimited(`temporary:${ip}`, 10, 10 * 60 * 1000)) return c.json({ error: 'Too many recovery attempts. Please wait and try again.' }, 429)
  let body: Record<string, unknown>
  try { body = await c.req.json<Record<string, unknown>>() } catch { return c.json({ error: 'Recovery details are invalid.' }, 400) }
  const email = normalizeEmail(body.email)
  const temporaryPassword = clean(body.password, 200)
  if (!emailPattern.test(email) || email.split('@')[1] !== 'eleviqprep.com' || !temporaryPassword) return c.json({ error: 'Recovery details are invalid.' }, 400)
  try {
    const blink = getBlink(c.env as Record<string, string>)
    const result = await blink.db.sql(`SELECT id, user_id, salt, password_hash FROM temporary_passwords WHERE email = ? AND used_at IS NULL AND expires_at > ? ORDER BY created_at DESC LIMIT 1`, [email, new Date().toISOString()])
    const row = result.rows[0] as { id?: string; userId?: string; salt?: string; passwordHash?: string } | undefined
    if (!row?.id || !row.salt || !row.passwordHash || (await hashSecret(temporaryPassword, row.salt)) !== row.passwordHash) return c.json({ error: 'That temporary password is not valid or has expired.' }, 401)
    const reset = await blink.auth.generatePasswordResetToken(email)
    const resetToken = (reset as { token?: string }).token
    if (!resetToken) return c.json({ error: 'We could not start the secure password update.' }, 503)
    const proof = crypto.randomUUID()
    const proofHash = await hashSecret(proof, row.salt)
    await blink.db.sql('UPDATE temporary_passwords SET used_at = ?, reset_proof_hash = ? WHERE id = ?', [new Date().toISOString(), proofHash, row.id])
    return c.json({ success: true, resetToken, resetProof: proof, email })
  } catch (error) {
    console.error('Temporary password login failed', error)
    return c.json({ error: 'We could not start the secure password update.' }, 503)
  }
})

app.post('/api/auth/lockout/complete-reset', async (c) => {
  let body: Record<string, unknown>
  try { body = await c.req.json<Record<string, unknown>>() } catch { return c.json({ error: 'Reset confirmation is invalid.' }, 400) }
  const email = normalizeEmail(body.email)
  const proof = clean(body.proof, 120)
  if (!emailPattern.test(email) || !proof) return c.json({ error: 'Reset confirmation is invalid.' }, 400)
  try {
    const blink = getBlink(c.env as Record<string, string>)
    const result = await blink.db.sql('SELECT id, salt, reset_proof_hash FROM temporary_passwords WHERE email = ? AND used_at IS NOT NULL AND completed_at IS NULL AND expires_at > ? ORDER BY created_at DESC LIMIT 1', [email, new Date().toISOString()])
    const row = result.rows[0] as { id?: string; salt?: string; resetProofHash?: string } | undefined
    if (!row?.id || !row.salt || !row.resetProofHash || (await hashSecret(proof, row.salt)) !== row.resetProofHash) return c.json({ error: 'This secure reset session is invalid or expired.' }, 401)
    const now = new Date().toISOString()
    await blink.db.sql('UPDATE temporary_passwords SET completed_at = ? WHERE id = ?', [now, row.id])
    await blink.db.sql('UPDATE account_lockouts SET failed_attempts = 0, locked_until = NULL, last_failed_at = NULL, updated_at = ? WHERE email = ?', [now, email])
    await blink.db.sql('UPDATE lockout_events SET resolved_at = ?, resolution = ?, resolved_by = (SELECT user_id FROM account_lockouts WHERE email = ? LIMIT 1) WHERE email = ? AND resolved_at IS NULL', [now, 'temporary_password_reset', email, email])
    return c.json({ success: true })
  } catch (error) {
    console.error('Lockout reset completion failed', error)
    return c.json({ error: 'We could not complete the account recovery.' }, 503)
  }
})

const isAdminUser = async (blink: ReturnType<typeof getBlink>, userId: string) => {
  const roleResult = await blink.db.sql(`SELECT r.name AS roleName FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ? AND r.name IN (?, ?, ?) LIMIT 1`, [userId, 'system_admin', 'admin', 'super_admin'])
  return Boolean((roleResult.rows[0] as { roleName?: string } | undefined)?.roleName)
}

const chatAuth = async (c: Context) => {
  const blink = getBlink(c.env as Record<string, string>)
  const auth = await blink.auth.verifyToken(c.req.header('Authorization'))
  if (!auth.valid || !auth.userId) return { blink, auth: null }
  return { blink, auth }
}

app.get('/api/chat/contacts', async (c) => {
  try {
    const { blink, auth } = await chatAuth(c)
    if (!auth) return c.json({ error: 'A valid session is required.' }, 401)
    const admin = await isAdminUser(blink, auth.userId)
    const result = admin
      ? await blink.db.sql(`SELECT u.id, u.display_name, u.email FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id WHERE r.name IN (?, ?, ?) AND u.id != ? ORDER BY u.display_name, u.email LIMIT ?`, ['system_admin', 'admin', 'super_admin', auth.userId, 100])
      : await blink.db.sql(`SELECT u.id, u.display_name, u.email FROM users u JOIN user_roles ur ON ur.user_id = u.id JOIN roles r ON r.id = ur.role_id WHERE r.name IN (?, ?, ?) ORDER BY u.display_name, u.email LIMIT ?`, ['system_admin', 'admin', 'super_admin', 10])
    return c.json({ contacts: result.rows.map(item => ({ id: item.id, displayName: item.displayName, email: item.email })) })
  } catch (error) {
    console.error('Chat contacts read failed', error)
    return c.json({ error: 'Chat contacts are temporarily unavailable.' }, 503)
  }
})

app.get('/api/chat/messages', async (c) => {
  try {
    const { blink, auth } = await chatAuth(c)
    if (!auth) return c.json({ error: 'A valid session is required.' }, 401)
    const participantId = clean(c.req.query('participantId'), 120)
    const admin = await isAdminUser(blink, auth.userId)
    if (!admin && participantId && participantId !== auth.userId) return c.json({ error: 'You can only access your own conversations.' }, 403)
    const target = participantId || auth.userId
    const result = admin && participantId
      ? await blink.db.sql(`SELECT id, sender_user_id, recipient_user_id, message_type, body, audio_url, audio_duration_seconds, created_at, read_at FROM chat_messages WHERE (sender_user_id = ? AND recipient_user_id = ?) OR (sender_user_id = ? AND recipient_user_id = ?) ORDER BY created_at ASC LIMIT ?`, [auth.userId, target, target, auth.userId, 100])
      : await blink.db.sql(`SELECT id, sender_user_id, recipient_user_id, message_type, body, audio_url, audio_duration_seconds, created_at, read_at FROM chat_messages WHERE sender_user_id = ? OR recipient_user_id = ? ORDER BY created_at DESC LIMIT ?`, [auth.userId, auth.userId, 100])
    return c.json({ messages: admin && !participantId ? result.rows.reverse() : result.rows })
  } catch (error) {
    console.error('Chat messages read failed', error)
    return c.json({ error: 'Messages are temporarily unavailable.' }, 503)
  }
})

app.post('/api/chat/messages', async (c) => {
  try {
    const { blink, auth } = await chatAuth(c)
    if (!auth) return c.json({ error: 'A valid session is required.' }, 401)
    const body = await c.req.json<Record<string, unknown>>()
    const recipientUserId = clean(body.recipientUserId, 120)
    const messageType = body.messageType === 'voice' ? 'voice' : 'text'
    const text = clean(body.body, 4000)
    const audioUrl = clean(body.audioUrl, 1000)
    const rawDuration = Number(body.audioDurationSeconds || 0)
    const audioDurationSeconds = Number.isFinite(rawDuration) ? Math.min(3600, Math.max(0, rawDuration)) : 0
    if (!recipientUserId || recipientUserId === auth.userId) return c.json({ error: 'A valid recipient is required.' }, 400)
    if (messageType === 'text' && !text) return c.json({ error: 'Message text is required.' }, 400)
    if (messageType === 'voice' && (!audioUrl || !audioUrl.startsWith('https://'))) return c.json({ error: 'A secure voice note URL is required.' }, 400)
    const admin = await isAdminUser(blink, auth.userId)
    const recipientResult = await blink.db.sql('SELECT id FROM users WHERE id = ? LIMIT 1', [recipientUserId])
    if (!recipientResult.rows[0]) return c.json({ error: 'That recipient does not exist.' }, 404)
    if (!admin) {
      const recipientIsAdmin = await isAdminUser(blink, recipientUserId)
      if (!recipientIsAdmin) return c.json({ error: 'Students may message their assigned ELEVIQ administrator.' }, 403)
    }
    const id = `chat_${crypto.randomUUID()}`
    await blink.db.sql(`INSERT INTO chat_messages (id, sender_user_id, recipient_user_id, message_type, body, audio_url, audio_duration_seconds) VALUES (?, ?, ?, ?, ?, ?, ?)`, [id, auth.userId, recipientUserId, messageType, text || null, audioUrl || null, messageType === 'voice' ? audioDurationSeconds : null])
    const created = await blink.db.sql(`SELECT id, sender_user_id, recipient_user_id, message_type, body, audio_url, audio_duration_seconds, created_at, read_at FROM chat_messages WHERE id = ? LIMIT 1`, [id])
    try {
      const channelName = `eleviq-chat-${[auth.userId, recipientUserId].sort().join('-')}`
      await blink.realtime.publish(channelName, 'chat', { message: created.rows[0] })
    } catch (realtimeError) {
      console.error('Realtime chat publish failed; persisted message remains available to polling fallback', realtimeError)
    }
    return c.json({ message: created.rows[0] }, 201)
  } catch (error) {
    console.error('Chat message send failed', error)
    return c.json({ error: 'Message could not be sent.' }, 503)
  }
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

    const range = clean(c.req.query('range'), 30) || '30d'
    const customStart = clean(c.req.query('start'), 40)
    const customEnd = clean(c.req.query('end'), 40)
    const end = new Date()
    const start = new Date(end)
    if (range === 'custom' && customStart && customEnd) {
      const parsedStart = new Date(`${customStart}T00:00:00.000Z`)
      const parsedEnd = new Date(`${customEnd}T23:59:59.999Z`)
      if (!Number.isNaN(parsedStart.getTime()) && !Number.isNaN(parsedEnd.getTime()) && parsedStart <= parsedEnd) {
        start.setTime(parsedStart.getTime())
        end.setTime(parsedEnd.getTime())
      } else {
        return c.json({ error: 'The custom date range is invalid.' }, 400)
      }
    } else if (range === 'today') start.setHours(0, 0, 0, 0)
    else if (range === 'yesterday') { start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0); end.setHours(0, 0, 0, 0) }
    else if (range === '7d') start.setDate(start.getDate() - 7)
    else if (range === 'this_month') { start.setDate(1); start.setHours(0, 0, 0, 0) }
    else if (range === 'last_month') { start.setMonth(start.getMonth() - 1, 1); start.setHours(0, 0, 0, 0); end.setDate(1); end.setHours(0, 0, 0, 0) }
    else if (range === 'this_year') { start.setMonth(0, 1); start.setHours(0, 0, 0, 0) }
    else start.setDate(start.getDate() - 30)
    const startIso = start.toISOString()
    const endIso = end.toISOString()

    const [
      leadCount, newLeadCount, studentCount, questionCount, activeQuestionCount, draftQuestionCount,
      productCount, orders, sessions, enrollments, packages, leads, students, auditLogs,
      readiness, paymentSummary, questionSummary, systemEvents,
      productSales, lowInventory, recentOrders, leadPipeline, todaySessions, weakAreas, questionPerformance, testSummary,
    ] = await Promise.all([
      blink.db.sql('SELECT COUNT(*) AS total FROM leads'),
      blink.db.sql('SELECT COUNT(*) AS total FROM leads WHERE created_at >= ? AND created_at < ?', [startIso, endIso]),
      blink.db.sql("SELECT COUNT(*) AS total FROM student_profiles WHERE status IN ('active', 'onboarding')"),
      blink.db.sql('SELECT COUNT(*) AS total FROM questions'),
      blink.db.sql("SELECT COUNT(*) AS total FROM questions WHERE status = 'active'"),
      blink.db.sql("SELECT COUNT(*) AS total FROM questions WHERE status = 'draft'"),
      blink.db.sql('SELECT COUNT(*) AS total FROM products'),
      blink.db.sql(`SELECT COUNT(*) AS total, COALESCE(SUM(total_cents), 0) AS revenue,
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN payment_status = 'failed' THEN 1 ELSE 0 END) AS failed,
        SUM(CASE WHEN payment_status IN ('past_due', 'overdue') THEN 1 ELSE 0 END) AS past_due,
        SUM(CASE WHEN payment_status = 'refunded' THEN total_cents ELSE 0 END) AS refunds
        FROM orders WHERE created_at >= ? AND created_at < ?`, [startIso, endIso]),
      blink.db.sql(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN date(starts_at) = date('now') THEN 1 ELSE 0 END) AS today,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) AS noShows
        FROM tutoring_sessions WHERE starts_at >= ? AND starts_at < ?`, [startIso, endIso]),
      blink.db.sql("SELECT COUNT(*) AS total FROM enrollments WHERE status = 'active' AND created_at >= ? AND created_at < ?", [startIso, endIso]),
      blink.db.sql("SELECT p.name AS packageName, COUNT(e.id) AS activeStudents FROM packages p LEFT JOIN enrollments e ON e.package_id = p.id AND e.status = 'active' GROUP BY p.id, p.name ORDER BY p.name"),
      blink.db.sql(`SELECT id, name, email, stage, program_interest, source, follow_up_at, created_at FROM leads
        WHERE follow_up_at IS NOT NULL AND follow_up_at <= ? ORDER BY follow_up_at ASC LIMIT ?`, [endIso, 10]),
      blink.db.sql(`SELECT sp.id, sp.user_id, u.display_name, sp.school, sp.program_type, sp.exam_type,
        sp.status, sp.readiness_score, sp.assigned_tutor_id, sp.updated_at
        FROM student_profiles sp LEFT JOIN users u ON u.id = sp.user_id
        WHERE sp.status IN ('active', 'onboarding') AND (sp.readiness_score IS NULL OR sp.readiness_score < 70)
        ORDER BY COALESCE(sp.readiness_score, 0) ASC, sp.updated_at DESC LIMIT ?`, [10]),
      blink.db.sql(`SELECT id, user_id, action, resource_type, resource_id, result, created_at
        FROM audit_logs ORDER BY created_at DESC LIMIT ?`, [15]),
      blink.db.sql(`SELECT COUNT(*) AS total, COALESCE(AVG(readiness_score), 0) AS average,
        SUM(CASE WHEN readiness_score >= 70 THEN 1 ELSE 0 END) AS exitReady,
        SUM(CASE WHEN readiness_score < 50 OR readiness_score IS NULL THEN 1 ELSE 0 END) AS intervention
        FROM student_profiles WHERE status IN ('active', 'onboarding')`),
      blink.db.sql(`SELECT
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_cents ELSE 0 END), 0) AS collected,
        COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN total_cents ELSE 0 END), 0) AS pendingAmount,
        COALESCE(SUM(CASE WHEN payment_status IN ('failed', 'past_due', 'overdue') THEN total_cents ELSE 0 END), 0) AS outstanding
        FROM orders WHERE created_at >= ? AND created_at < ?`, [startIso, endIso]),
      blink.db.sql(`SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft,
        SUM(CASE WHEN question_type = 'case_study' OR clinical_judgment_category IS NOT NULL THEN 1 ELSE 0 END) AS ngn
        FROM questions`),
      blink.db.sql(`SELECT id, action, resource_type, result, created_at FROM audit_logs
        WHERE resource_type IN ('authentication', 'security', 'ai') OR action LIKE '%security%' OR action LIKE '%auth%'
        ORDER BY created_at DESC LIMIT ?`, [10]),
      blink.db.sql(`SELECT p.name AS productName, COALESCE(SUM(oi.quantity), 0) AS unitsSold,
        COALESCE(SUM(oi.quantity * oi.unit_price_cents), 0) AS revenueCents
        FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id
        WHERE o.payment_status = 'paid' AND o.created_at >= ? AND o.created_at < ?
        GROUP BY p.id, p.name ORDER BY unitsSold DESC LIMIT ?`, [startIso, endIso, 5]),
      blink.db.sql(`SELECT id, name, inventory_available, low_stock_threshold FROM products
        WHERE status = 'active' AND inventory_available <= low_stock_threshold ORDER BY inventory_available ASC LIMIT ?`, [10]),
      blink.db.sql(`SELECT o.id, o.order_number, o.user_id, u.display_name, o.total_cents, o.payment_status,
        o.fulfillment_status, o.created_at, GROUP_CONCAT(p.name, ', ') AS products
        FROM orders o LEFT JOIN users u ON u.id = o.user_id LEFT JOIN order_items oi ON oi.order_id = o.id
        LEFT JOIN products p ON p.id = oi.product_id WHERE o.created_at >= ? AND o.created_at < ?
        GROUP BY o.id ORDER BY o.created_at DESC LIMIT ?`, [startIso, endIso, 10]),
      blink.db.sql(`SELECT stage, COUNT(*) AS total FROM leads GROUP BY stage ORDER BY total DESC`),
      blink.db.sql(`SELECT ts.id, ts.student_id, ts.tutor_id, ts.starts_at, ts.ends_at, ts.status, sp.program_type
        FROM tutoring_sessions ts LEFT JOIN student_profiles sp ON sp.user_id = ts.student_id
        WHERE date(ts.starts_at) = date('now') ORDER BY ts.starts_at ASC LIMIT ?`, [10]),
      blink.db.sql(`SELECT COALESCE(q.topic, 'Uncategorized') AS topic, COUNT(*) AS attempts,
        SUM(CASE WHEN sa.is_correct = '1' OR sa.is_correct = 1 THEN 1 ELSE 0 END) AS correct,
        ROUND(100.0 * SUM(CASE WHEN sa.is_correct = '1' OR sa.is_correct = 1 THEN 1 ELSE 0 END) / COUNT(*), 0) AS percentCorrect
        FROM student_answers sa JOIN questions q ON q.id = sa.question_id
        GROUP BY q.topic ORDER BY percentCorrect ASC LIMIT ?`, [8]),
      blink.db.sql(`SELECT q.id, q.question_text, q.topic, q.difficulty, q.question_type, COUNT(sa.id) AS attempts,
        SUM(CASE WHEN sa.is_correct = '0' OR sa.is_correct = 0 THEN 1 ELSE 0 END) AS incorrect,
        ROUND(100.0 * SUM(CASE WHEN sa.is_correct = '1' OR sa.is_correct = 1 THEN 1 ELSE 0 END) / COUNT(sa.id), 0) AS percentCorrect
        FROM student_answers sa JOIN questions q ON q.id = sa.question_id
        GROUP BY q.id, q.question_text, q.topic, q.difficulty, q.question_type
        HAVING COUNT(sa.id) > 0 ORDER BY percentCorrect ASC, attempts DESC LIMIT ?`, [8]),
      blink.db.sql(`SELECT COUNT(*) AS testsCreated,
        SUM(CASE WHEN ta.status = 'submitted' THEN 1 ELSE 0 END) AS testsCompleted,
        COALESCE(AVG(CASE WHEN ta.status = 'submitted' THEN ta.score_percent END), 0) AS averageScore
        FROM tests t LEFT JOIN test_attempts ta ON ta.test_id = t.id`),
    ])

    const orderRow = orders.rows[0] || {}
    const sessionRow = sessions.rows[0] || {}
    const readinessRow = readiness.rows[0] || {}
    const paymentRow = paymentSummary.rows[0] || {}
    const questionRow = questionSummary.rows[0] || {}
    const testRow = testSummary.rows[0] || {}
    const count = (value: unknown) => Number(value || 0)

    return c.json({
      success: true,
      authorized: true,
      role: role.roleName,
      range: { key: range, start: startIso, end: endIso },
      counts: {
        leads: count(leadCount.rows[0]?.total),
        newLeads: count(newLeadCount.rows[0]?.total),
        students: count(studentCount.rows[0]?.total),
        questions: count(questionCount.rows[0]?.total),
        activeQuestions: count(activeQuestionCount.rows[0]?.total),
        draftQuestions: count(draftQuestionCount.rows[0]?.total),
        products: count(productCount.rows[0]?.total),
      },
      business: {
        revenueCents: count(paymentRow.collected),
        outstandingCents: count(paymentRow.outstanding),
        pendingPaymentsCents: count(paymentRow.pendingAmount),
        orders: count(orderRow.total),
        refundsCents: count(orderRow.refunds),
        booksSold: count(orderRow.total),
      },
      attention: {
        failedPayments: count(orderRow.failed),
        pastDuePayments: count(orderRow.pastDue),
        followUps: leads.rows.length,
        lowReadiness: students.rows.length,
        securityEvents: systemEvents.rows.length,
      },
      performance: {
        activeStudents: count(readinessRow.total),
        averageReadiness: Math.round(count(readinessRow.average)),
        exitReady: count(readinessRow.exitReady),
        intervention: count(readinessRow.intervention),
      },
      tutoring: {
        sessions: count(sessionRow.total),
        today: count(sessionRow.today),
        completed: count(sessionRow.completed),
        cancelled: count(sessionRow.cancelled),
        noShows: count(sessionRow.noShows),
        newEnrollments: count(enrollments.rows[0]?.total),
        packages: packages.rows,
      },
      testing: {
        totalQuestions: count(questionRow.total),
        activeQuestions: count(questionRow.active),
        draftQuestions: count(questionRow.draft),
        ngnCases: count(questionRow.ngn),
      },
      recent: {
        leads: leads.rows,
        students: students.rows,
        auditLogs: auditLogs.rows,
        securityEvents: systemEvents.rows,
        orders: recentOrders.rows,
        todaySessions: todaySessions.rows,
      },
      bookstore: {
        websiteRevenueCents: productSales.rows.reduce((total, item) => total + count(item.revenueCents), 0),
        booksSold: productSales.rows.reduce((total, item) => total + count(item.unitsSold), 0),
        lowInventory: lowInventory.rows,
        topProducts: productSales.rows,
      },
      payments: {
        collectedCents: count(paymentRow.collected),
        pendingCents: count(paymentRow.pendingAmount),
        outstandingCents: count(paymentRow.outstanding),
        failed: count(orderRow.failed),
        pastDue: count(orderRow.pastDue),
        refundsCents: count(orderRow.refunds),
      },
      crm: { pipeline: leadPipeline.rows },
      academics: {
        weakAreas: weakAreas.rows,
        mostMissedQuestions: questionPerformance.rows,
      },
      testingOverview: {
        testsCreated: count(testRow.testsCreated),
        testsCompleted: count(testRow.testsCompleted),
        averageScore: Math.round(count(testRow.averageScore)),
      },
      health: { status: 'ok', database: 'ok', email: 'configured', payments: 'tracked_in_orders', store: 'ok', security: 'monitoring', message: 'Core data services are responding.', checkedAt: new Date().toISOString() },
    })
  } catch (error) {
    console.error('Admin overview query failed', error)
    return c.json({ error: 'The admin overview is temporarily unavailable.' }, 503)
  }
}

app.post('/api/admin/summary', adminOverview)
app.get('/api/admin/overview', adminOverview)

const requireAdmin = async (c: Context, blink: ReturnType<typeof getBlink>) => {
  try {
    const auth = await blink.auth.verifyToken(c.req.header('Authorization'))
    if (!auth.valid || !auth.userId) return { auth: null, error: c.json({ error: 'A valid bearer token is required.' }, 401) }
    const userResult = await blink.db.sql('SELECT email, email_verified FROM users WHERE id = ? LIMIT 1', [auth.userId])
    const user = userResult.rows[0] as { email?: string; emailVerified?: string | number } | undefined
    if (!user || user.email?.toLowerCase().split('@')[1] !== 'eleviqprep.com' || Number(user.emailVerified) !== 1 || !(await isAdminUser(blink, auth.userId))) return { auth: null, error: c.json({ error: 'Administrator access required.' }, 403) }
    return { auth, error: null }
  } catch (error) {
    console.error('Admin authorization failed', error)
    return { auth: null, error: c.json({ error: 'Unable to verify administrator access.' }, 403) }
  }
}

const readAdminLockouts = async (c: Context) => {
  const blink = getBlink(c.env as Record<string, string>)
  try {
    const { auth, error } = await requireAdmin(c, blink)
    if (error || !auth) return error
    const now = new Date().toISOString()
    const result = await blink.db.sql(`SELECT al.id, al.email, al.user_id, al.failed_attempts, al.locked_until, al.last_failed_at, al.reset_sent_at, al.updated_at, u.display_name
      FROM account_lockouts al LEFT JOIN users u ON u.id = al.user_id
      WHERE al.locked_until IS NOT NULL AND al.locked_until > ? ORDER BY al.locked_until ASC LIMIT ?`, [now, 50])
    const events = await blink.db.sql(`SELECT id, email, user_id, locked_until, attempt_count, notified_at, created_at FROM lockout_events WHERE resolved_at IS NULL ORDER BY created_at DESC LIMIT ?`, [50])
    return c.json({ lockouts: result.rows, events: events.rows })
  } catch (error) {
    console.error('Admin lockout read failed', error)
    return c.json({ error: 'Locked student records are temporarily unavailable.' }, 503)
  }
}

app.get('/api/admin/lockouts', readAdminLockouts)
app.post('/api/auth/lockout/admin-list', readAdminLockouts)

app.get('/api/admin/search', async (c) => {
  const blink = getBlink(c.env as Record<string, string>)
  let auth
  try {
    auth = await blink.auth.verifyToken(c.req.header('Authorization'))
  } catch (error) {
    console.error('Admin search token verification failed', error)
    return c.json({ error: 'Unable to verify authorization.' }, 401)
  }
  if (!auth.valid) return c.json({ error: 'A valid bearer token is required.' }, 401)

  try {
    const userResult = await blink.db.sql('SELECT email, email_verified FROM users WHERE id = ? LIMIT 1', [auth.userId])
    const user = userResult.rows[0] as { email?: string; emailVerified?: string | number } | undefined
    if (!user || user.email?.toLowerCase().split('@')[1] !== 'eleviqprep.com' || Number(user.emailVerified) !== 1) return c.json({ error: 'Administrator access required.' }, 403)
    const roleResult = await blink.db.sql(`SELECT r.name AS roleName FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ? AND r.name IN (?, ?, ?) LIMIT 1`, [auth.userId, 'system_admin', 'admin', 'super_admin'])
    if (!(roleResult.rows[0] as { roleName?: string } | undefined)?.roleName) return c.json({ error: 'Administrator role required.' }, 403)

    const query = clean(c.req.query('q'), 80)
    if (query.length < 2) return c.json({ results: [] })
    const like = `%${query.replaceAll('%', '\\%').replaceAll('_', '\\_')}%`
    const [users, leads, products, orders, questions] = await Promise.all([
      blink.db.sql(`SELECT id, display_name, email FROM users WHERE display_name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' ORDER BY display_name LIMIT ?`, [like, like, 5]),
      blink.db.sql(`SELECT id, name, email, program_interest FROM leads WHERE name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' ORDER BY created_at DESC LIMIT ?`, [like, like, 5]),
      blink.db.sql(`SELECT id, name, product_type, status FROM products WHERE name LIKE ? ESCAPE '\\' ORDER BY name LIMIT ?`, [like, 5]),
      blink.db.sql(`SELECT id, order_number, payment_status, total_cents FROM orders WHERE order_number LIKE ? ESCAPE '\\' ORDER BY created_at DESC LIMIT ?`, [like, 5]),
      blink.db.sql(`SELECT id, question_text, topic, difficulty FROM questions WHERE question_text LIKE ? ESCAPE '\\' OR topic LIKE ? ESCAPE '\\' ORDER BY updated_at DESC LIMIT ?`, [like, like, 5]),
    ])
    return c.json({ results: [
      ...users.rows.map(item => ({ type: 'Student or user', id: item.id, title: item.displayName || item.email, subtitle: item.email })),
      ...leads.rows.map(item => ({ type: 'Lead', id: item.id, title: item.name, subtitle: `${item.email || 'No email'} · ${item.programInterest || 'General inquiry'}` })),
      ...products.rows.map(item => ({ type: 'Product', id: item.id, title: item.name, subtitle: `${item.productType || 'Product'} · ${item.status || 'draft'}` })),
      ...orders.rows.map(item => ({ type: 'Order', id: item.id, title: item.orderNumber, subtitle: `${item.paymentStatus || 'pending'} · $${(Number(item.totalCents || 0) / 100).toFixed(2)}` })),
      ...questions.rows.map(item => ({ type: 'Question', id: item.id, title: String(item.questionText || '').slice(0, 100), subtitle: `${item.topic || 'Uncategorized'} · ${item.difficulty || 'unspecified'}` })),
    ] })
  } catch (error) {
    console.error('Admin search failed', error)
    return c.json({ error: 'Admin search is temporarily unavailable.' }, 503)
  }
})

app.post('/api/admin/assistant', async (c) => {
  const blink = getBlink(c.env as Record<string, string>)
  let auth
  try {
    auth = await blink.auth.verifyToken(c.req.header('Authorization'))
  } catch (error) {
    console.error('Admin assistant token verification failed', error)
    return c.json({ error: 'Unable to verify authorization.' }, 401)
  }
  if (!auth.valid || !auth.userId) return c.json({ error: 'A valid bearer token is required.' }, 401)

  try {
    const userResult = await blink.db.sql('SELECT email, email_verified FROM users WHERE id = ? LIMIT 1', [auth.userId])
    const user = userResult.rows[0] as { email?: string; emailVerified?: string | number } | undefined
    if (!user || user.email?.toLowerCase().split('@')[1] !== 'eleviqprep.com' || Number(user.emailVerified) !== 1) return c.json({ error: 'Administrator access required.' }, 403)
    const roleResult = await blink.db.sql(`SELECT r.name AS roleName FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ? AND r.name IN (?, ?, ?) LIMIT 1`, [auth.userId, 'system_admin', 'admin', 'super_admin'])
    if (!(roleResult.rows[0] as { roleName?: string } | undefined)?.roleName) return c.json({ error: 'Administrator role required.' }, 403)

    const body = await c.req.json<Record<string, unknown>>()
    const question = clean(body.question, 1200)
    if (!question) return c.json({ error: 'Ask the operations assistant a question first.' }, 400)
    const range = clean(body.range, 30) || '30d'
    const [leads, students, readiness, orders, payments, questions, sessions, audit] = await Promise.all([
      blink.db.sql('SELECT COUNT(*) AS total FROM leads'),
      blink.db.sql("SELECT COUNT(*) AS total FROM student_profiles WHERE status IN ('active', 'onboarding')"),
      blink.db.sql("SELECT COALESCE(AVG(readiness_score), 0) AS average, SUM(CASE WHEN readiness_score < 50 OR readiness_score IS NULL THEN 1 ELSE 0 END) AS intervention FROM student_profiles WHERE status IN ('active', 'onboarding')"),
      blink.db.sql("SELECT COUNT(*) AS total FROM orders WHERE created_at >= datetime('now', '-30 days')"),
      blink.db.sql("SELECT COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_cents ELSE 0 END), 0) AS collected, SUM(CASE WHEN payment_status IN ('failed', 'past_due', 'overdue') THEN 1 ELSE 0 END) AS issues FROM orders WHERE created_at >= datetime('now', '-30 days')"),
      blink.db.sql("SELECT COUNT(*) AS total FROM questions WHERE status = 'active'"),
      blink.db.sql("SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed FROM tutoring_sessions WHERE starts_at >= datetime('now', '-30 days')"),
      blink.db.sql('SELECT action, resource_type, result, created_at FROM audit_logs ORDER BY created_at DESC LIMIT ?', [8]),
    ])
    const value = (row: Record<string, unknown> | undefined, key: string) => Number(row?.[key] || 0)
    const context = JSON.stringify({
      selectedRange: range,
      totals: { leads: value(leads.rows[0], 'total'), activeStudents: value(students.rows[0], 'total'), activeQuestions: value(questions.rows[0], 'total') },
      studentPerformance: { averageReadiness: Math.round(value(readiness.rows[0], 'average')), interventionProfiles: value(readiness.rows[0], 'intervention') },
      commerceLast30Days: { orders: value(orders.rows[0], 'total'), collectedCents: value(payments.rows[0], 'collected'), paymentIssues: value(payments.rows[0], 'issues') },
      tutoringLast30Days: { sessions: value(sessions.rows[0], 'total'), completed: value(sessions.rows[0], 'completed') },
      recentAuditActivity: audit.rows,
    })
    const response = await blink.ai.generateText({
      messages: [
        { role: 'system', content: `You are the ELEVIQ Prep Operations Assistant for authorized administrators. ELEVIQ is an education platform serving Phlebotomy, CNA, and LPN learners through tutoring, testing, remediation, and workbooks. Use only the live operational context supplied by the application. Never invent metrics, trends, records, names, payment details, credentials, tokens, private student conversations, answer keys, or security implementation details. If the data is missing, say so clearly. Give concise, action-oriented guidance with a short "What I see" summary and "Recommended next steps" list. Readiness is an educational indicator, not a guarantee of exam results. Do not provide medical, legal, or financial advice.` },
        { role: 'user', content: `Administrator question: ${question}\n\nLive operational context (selected range: ${range}):\n${context}` },
      ],
      maxTokens: 500,
    })
    return c.json({ answer: response.text })
  } catch (error) {
    console.error('Admin assistant failed', error)
    return c.json({ error: 'The operations assistant is temporarily unavailable.' }, 503)
  }
})

const sendAdminTemporaryPassword = async (c: Context) => {
  const blink = getBlink(c.env as Record<string, string>)
  let auth
  try { auth = await blink.auth.verifyToken(c.req.header('Authorization')) } catch { return c.json({ error: 'Unable to verify authorization.' }, 401) }
  if (!auth.valid || !auth.userId) return c.json({ error: 'A valid bearer token is required.' }, 401)
  try {
    const adminUser = await blink.db.sql('SELECT email, email_verified FROM users WHERE id = ? LIMIT 1', [auth.userId])
    const admin = adminUser.rows[0] as { email?: string; emailVerified?: string | number } | undefined
    if (!admin || admin.email?.toLowerCase().split('@')[1] !== 'eleviqprep.com' || Number(admin.emailVerified) !== 1 || !(await isAdminUser(blink, auth.userId))) return c.json({ error: 'Administrator access required.' }, 403)
    const body = await c.req.json<Record<string, unknown>>()
    const email = normalizeEmail(body.email)
    if (!emailPattern.test(email) || email.split('@')[1] !== 'eleviqprep.com') return c.json({ error: 'Enter a valid ELEVIQ student email.' }, 400)
    const lockoutResult = await blink.db.sql('SELECT user_id, locked_until FROM account_lockouts WHERE email = ? LIMIT 1', [email])
    const lockout = lockoutResult.rows[0] as { userId?: string; lockedUntil?: string } | undefined
    if (!lockout?.lockedUntil || new Date(lockout.lockedUntil).getTime() <= Date.now()) return c.json({ error: 'That student does not have an active portal lockout.' }, 400)
    const userResult = await blink.db.sql('SELECT id, display_name FROM users WHERE lower(email) = ? LIMIT 1', [email])
    const student = userResult.rows[0] as { id?: string; displayName?: string } | undefined
    if (!student?.id) return c.json({ error: 'No student account was found for that locked email.' }, 404)
    const temporaryPassword = randomTemporaryPassword()
    const salt = crypto.randomUUID()
    const passwordHash = await hashSecret(temporaryPassword, salt)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    await blink.db.sql('UPDATE temporary_passwords SET completed_at = ? WHERE email = ? AND completed_at IS NULL', [new Date().toISOString(), email])
    await blink.db.sql('INSERT INTO temporary_passwords (id, email, user_id, salt, password_hash, expires_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)', [`temporary_password_${crypto.randomUUID()}`, email, student.id, salt, passwordHash, expiresAt, auth.userId])
    await blink.notifications.email({
      to: email,
      subject: 'Your ELEVIQ temporary sign-in password',
      text: `Your ELEVIQ portal was locked for security. An administrator issued a temporary password that expires in 60 minutes.\n\nTemporary password: ${temporaryPassword}\n\nGo to the ELEVIQ sign-in page, enter your ELEVIQ email and this temporary password, then choose a new password when prompted. Never share this password.`,
      html: `<h2>ELEVIQ temporary sign-in password</h2><p>Your ELEVIQ portal was locked for security. An administrator issued a temporary password that expires in 60 minutes.</p><p><strong>Temporary password:</strong> <code>${escapeHtml(temporaryPassword)}</code></p><p>Go to the ELEVIQ sign-in page, enter your ELEVIQ email and this temporary password, then choose a new password when prompted.</p><p>Never share this password.</p>`,
    })
    const now = new Date().toISOString()
    await blink.db.sql('UPDATE account_lockouts SET reset_sent_at = ?, reset_sent_by = ?, updated_at = ? WHERE email = ?', [now, auth.userId, now, email])
    await blink.db.sql('UPDATE lockout_events SET notified_at = COALESCE(notified_at, ?), resolution = ? WHERE email = ? AND resolved_at IS NULL', [now, 'temporary_password_sent', email])
    return c.json({ success: true, email })
  } catch (error) {
    console.error('Temporary password dispatch failed', error)
    return c.json({ error: error instanceof Error ? error.message : 'The temporary password could not be sent.' }, 503)
  }
}

app.post('/api/admin/send-temporary-password', sendAdminTemporaryPassword)
app.post('/api/auth/temporary-password', sendAdminTemporaryPassword)

export default app
