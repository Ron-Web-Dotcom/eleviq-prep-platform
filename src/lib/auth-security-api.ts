import { blink } from '@/blink/client'

const securityApiUrl = 'https://el8e8zlx.backend.blink.new/api/auth'

export type EmailLegitimacyResult = {
  legitimate: boolean
  guidance: string
  verificationRequired: boolean
  exists: boolean
  verified: boolean
  active: boolean
  hasPassword: boolean
}

export type PasswordSignals = {
  length: number
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
  hasSpecial: boolean
  hasWhitespace: boolean
  hasRepeatedCharacters: boolean
}

export async function checkEmailLegitimacy(email: string): Promise<EmailLegitimacyResult> {
  const result = await postSecurityCheck('/email-check', { email }) as Partial<EmailLegitimacyResult>
  return {
    legitimate: result.legitimate === true,
    guidance: result.guidance || 'Use a valid, verified @eleviqprep.com email address.',
    verificationRequired: result.verificationRequired !== false,
    exists: result.exists === true,
    verified: result.verified === true,
    active: result.active === true,
    hasPassword: result.hasPassword === true,
  }
}

export type LockoutStatus = {
  locked: boolean
  lockedUntil?: string
  message?: string
  failedAttempts?: number
}

export async function checkStudentLockout(email: string): Promise<LockoutStatus> {
  return await postSecurityCheck('/lockout/check', { email }) as LockoutStatus
}

export async function recordStudentAuthAttempt(email: string, result: 'success' | 'failure', reason: string) {
  const token = result === 'success' ? await blink.auth.getValidToken() : undefined
  return await postSecurityCheck('/log-attempt', { email, result, reason, studentPortal: true }, token || undefined) as LockoutStatus & { success?: boolean; recorded?: boolean }
}

export async function verifyTemporaryPassword(email: string, password: string): Promise<{ resetToken: string; resetProof: string; email: string }> {
  const result = await postSecurityCheck('/temporary-login', { email, password }) as Partial<{ resetToken: string; resetProof: string; email: string }>
  if (!result.resetToken || !result.resetProof || !result.email) throw new Error('The temporary password response was incomplete.')
  return result as { resetToken: string; resetProof: string; email: string }
}

export async function completeStudentLockoutReset(email: string, proof: string) {
  return await postSecurityCheck('/lockout/complete-reset', { email, proof }) as { success?: boolean }
}

export type AdminLockoutRecord = {
  id?: string
  email?: string
  userId?: string
  displayName?: string
  failedAttempts?: number
  lockedUntil?: string
  resetSentAt?: string
  createdAt?: string
}

export async function fetchAdminLockoutAlerts(): Promise<{ lockouts: AdminLockoutRecord[]; events: AdminLockoutRecord[] }> {
  const token = await getAdminToken()
  return await postSecurityCheck('/lockout/admin-list', {}, token) as { lockouts: AdminLockoutRecord[]; events: AdminLockoutRecord[] }
}

export async function issueTemporaryPassword(email: string): Promise<{ success?: boolean; email?: string }> {
  const token = await getAdminToken()
  return await postSecurityCheck('/temporary-password', { email }, token) as { success?: boolean; email?: string }
}

async function getAdminToken() {
  if (!blink.auth.isAuthenticated()) throw new Error('Your admin session has expired. Please sign in again.')
  const token = await blink.auth.getValidToken()
  if (!token) throw new Error('Your admin session has expired. Please sign in again.')
  return token
}

export async function requestPasswordLink(email: string, purpose: 'access' | 'forgot' = 'forgot'): Promise<{ success?: boolean; email?: string }> {
  const result = await postSecurityCheck('/password-link', { email, purpose, origin: window.location.origin }) as { success?: boolean; email?: string; error?: string }
  return result
}

export async function completePasswordReset(email: string, token: string): Promise<void> {
  const result = await postSecurityCheck('/reset-complete', { email, token }) as { success?: boolean; error?: string }
  if (result.success !== true) throw new Error(result.error || 'This password link is invalid or expired.')
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const response = await fetch('https://blink.new/api/auth/email/verify/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, projectId: import.meta.env.VITE_BLINK_PROJECT_ID || 'eleviq-prep-platform-el8e8zlx' }),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string }
    throw new Error(payload.error || 'We could not resend the verification email.')
  }
}

export async function getPasswordGuidance(signals: PasswordSignals): Promise<string> {
  const result = await postSecurityCheck('/password-guidance', { signals }) as { guidance?: string }
  return result.guidance || 'Use a long, unique password that meets every requirement below.'
}

async function postSecurityCheck(path: string, body: unknown, token?: string) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 10000)
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`
    const response = await fetch(`${securityApiUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const payload = await response.json().catch(() => ({})) as { error?: string }
    if (!response.ok) throw new Error(payload.error || `Security check failed (${response.status})`)
    return payload
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      const timeoutError = new Error('The security check timed out. Please try again.')
      Object.defineProperty(timeoutError, 'cause', { value: error })
      throw timeoutError
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}
