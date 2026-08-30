import { blink } from '@/blink/client'

const securityApiUrl = 'https://el8e8zlx.backend.blink.new/api/auth'

export type EmailLegitimacyResult = {
  legitimate: boolean
  guidance: string
  verificationRequired: boolean
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
  return await postSecurityCheck('/log-attempt', { email, result, reason, studentPortal: true }) as LockoutStatus & { success?: boolean; recorded?: boolean }
}

export async function verifyTemporaryPassword(email: string, password: string): Promise<{ resetToken: string; resetProof: string; email: string }> {
  const result = await postSecurityCheck('/temporary-login', { email, password }) as Partial<{ resetToken: string; resetProof: string; email: string }>
  if (!result.resetToken || !result.resetProof || !result.email) throw new Error('The temporary password response was incomplete.')
  return result as { resetToken: string; resetProof: string; email: string }
}

export async function completeStudentLockoutReset(email: string, proof: string) {
  return await postSecurityCheck('/lockout/complete-reset', { email, proof }) as { success?: boolean }
}

export async function getPasswordGuidance(signals: PasswordSignals): Promise<string> {
  const result = await postSecurityCheck('/password-guidance', { signals }) as { guidance?: string }
  return result.guidance || 'Use a long, unique password that meets every requirement below.'
}

async function postSecurityCheck(path: string, body: unknown) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch(`${securityApiUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
