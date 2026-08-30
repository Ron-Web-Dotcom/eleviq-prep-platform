import { useState } from 'react'
import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BlinkClientBoundary } from '@/components/BlinkClientBoundary'
import { blink } from '@/blink/client'
import { checkEmailLegitimacy, checkStudentLockout, recordStudentAuthAttempt, requestPasswordLink, resendVerificationEmail, verifyTemporaryPassword } from '@/lib/auth-security-api'

export const Route = createFileRoute('/login')({
  head: () => ({
    meta: [
      { title: 'Sign in · ELEVIQ Prep' },
      { name: 'description', content: 'Secure email sign-in for the ELEVIQ Prep student and admin portals.' },
    ],
  }),
  component: LoginRoute,
})

type Mode = 'signin' | 'access' | 'forgot'
const safeNext = (value: string | undefined) => value?.startsWith('/') && !value.startsWith('//') ? value : '/app'

const recordAuthAttempt = async (email: string, result: 'success' | 'failure', reason: string) => {
  try {
    await blink.functions.invoke('api/auth/log-attempt', { body: { email, result, reason } })
  } catch {
    // Audit logging must never block an otherwise valid authentication attempt.
    console.warn('Auth attempt audit unavailable')
  }
  return true
}

function LoginRoute() {
  return <BlinkClientBoundary fallback={<div className="min-h-dvh bg-primary" />}><Login /></BlinkClientBoundary>
}

function AuthBrandPanel({ adminIntent }: { adminIntent: boolean }) {
  return <section className="relative hidden min-h-[620px] overflow-hidden rounded-[2rem] border border-primary-foreground/15 bg-primary p-8 shadow-2xl shadow-primary/25 lg:flex lg:flex-col lg:justify-between xl:p-10"><div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" /><div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-primary-foreground/10 blur-3xl" /><div className="relative"><div className="flex items-center gap-3"><div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-secondary p-1.5 shadow-lg"><img src="/brand/eleviq-logo.png" alt="ELEVIQ Prep" className="h-full w-full object-contain" /></div><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-accent">ELEVIQ / {adminIntent ? 'OPS' : 'PREP'}</p><p className="mt-1 text-sm font-semibold text-primary-foreground">{adminIntent ? 'Operations command center' : 'Student learning workspace'}</p></div></div><p className="mt-16 max-w-md font-mono text-xs uppercase tracking-[0.18em] text-primary-foreground/60">{adminIntent ? 'Protect the mission. See the whole picture.' : 'Study with direction. Show up ready.'}</p><h1 className="mt-4 max-w-xl font-serif text-5xl leading-[1.02] tracking-tight text-primary-foreground xl:text-6xl">{adminIntent ? 'Lead ELEVIQ with clarity.' : 'Prepare with purpose.'}</h1><p className="mt-6 max-w-md text-sm leading-7 text-primary-foreground/75">{adminIntent ? 'One secure workspace for the students, sessions, content, commerce, and signals that keep ELEVIQ moving.' : 'A focused place for tutoring, practice testing, readiness insights, and the next small step in your study plan.'}</p></div><div className="relative grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4"><p className="text-2xl font-semibold text-accent">01</p><p className="mt-2 text-xs leading-5 text-primary-foreground/70">Focused study paths</p></div><div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4"><p className="text-2xl font-semibold text-accent">02</p><p className="mt-2 text-xs leading-5 text-primary-foreground/70">Human guidance</p></div><div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4"><p className="text-2xl font-semibold text-accent">03</p><p className="mt-2 text-xs leading-5 text-primary-foreground/70">Clear progress</p></div></div></section>
}

function Login() {
  const navigate = useNavigate()
  const search = useSearch({ from: '/login' }) as { next?: string }
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [emailConfirmed, setEmailConfirmed] = useState(false)
  const [authNotice, setAuthNotice] = useState('')
  const [emailCheck, setEmailCheck] = useState('')
  const [lockout, setLockout] = useState<{ locked: boolean; lockedUntil?: string; message?: string }>({ locked: false })
  const access = mode === 'access'
  const nextPath = safeNext(search.next)
  const adminIntent = nextPath === '/admin'
  const studentLockoutActive = lockout.locked && !adminIntent

  const checkLockout = async (candidate: string) => {
    if (adminIntent || !candidate) return false
    try {
      const status = await checkStudentLockout(candidate)
      setLockout(status)
      if (status.locked) {
        setEmail(candidate)
        setEmailConfirmed(true)
        setError(status.message || 'This student portal is temporarily locked. Please enter the temporary password sent by an administrator.')
      }
      return status.locked
    } catch (cause) {
      setLockout({ locked: false })
      setError(cause instanceof Error ? cause.message : 'We could not verify the portal security status. Please try again.')
      return true
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setAuthNotice('')
    const normalized = email.trim().toLowerCase()
    if (!normalized) return setError('Enter your email address.')
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    if (!validEmail) return setError('Enter a valid email address.')
    if (!adminIntent && normalized.split('@')[1] !== 'eleviqprep.com') return setError('ELEVIQ accounts must use an @eleviqprep.com email address.')
    if (mode === 'signin' && !emailConfirmed && !adminIntent) {
      setBusy(true)
      try {
        if (await checkLockout(normalized)) return
        const result = await checkEmailLegitimacy(normalized)
        setEmailCheck(result.guidance)
        if (!result.legitimate) return setError(result.guidance)
        if (!result.exists) return setError('Please put in the correct email. We could not find an account for this email.')
        if (!result.verified) return setError('This account is not verified yet. Check your verification email or request a new one.')
        if (!result.active) return setError('This portal is locked. Please use Forgot password or contact us.')
        if (!result.hasPassword) {
          await requestPasswordLink(normalized, 'access')
          setAuthNotice('A secure password-creation email is on its way. Check your inbox to finish setting up your portal.')
          toast.success('Create your password', { description: 'Check your inbox for the secure link.' })
          return
        }
      } catch (error) {
        return setError(error instanceof Error ? error.message : 'We could not verify the email format. Please try again.')
      } finally {
        setBusy(false)
      }
      setEmail(normalized)
      setEmailConfirmed(true)
      return
    }
    if (mode === 'forgot') {
      setBusy(true)
      try {
        const account = await checkEmailLegitimacy(normalized)
        if (!account.legitimate || !account.exists || !account.verified) throw new Error('Please put in the correct verified ELEVIQ email.')
        await requestPasswordLink(normalized, 'forgot')
        setAuthNotice('A password email is on its way. Use the link to create a new password.')
        toast.success('Password email sent', { description: 'Check your inbox for the secure create-password link.' })
        setMode('signin')
        setEmailConfirmed(false)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'We could not send a reset link right now. Please try again.')
      } finally { setBusy(false) }
      return
    }
    setBusy(true)
    try {
      if (access) {
        try {
          await blink.auth.sendMagicLink(normalized)
          const auditRecorded = await recordAuthAttempt(normalized, 'success', 'access_link_requested')
          if (!auditRecorded) {
            setError('We could not complete the secure request. Please try again.')
            return
          }
          setAuthNotice('If that ELEVIQ address is eligible, a secure sign-in link is on its way.')
          toast.success('Check your email', { description: 'Use the secure sign-in link to access your ELEVIQ workspace.' })
          setMode('signin'); setPassword('')
        } catch {
          const auditRecorded = await recordAuthAttempt(normalized, 'failure', 'access_link_requested_failed')
          setError(auditRecorded ? 'We could not send an access link right now. Please try again.' : 'We could not complete the secure request. Please try again.')
        }
      } else {
        if (!adminIntent) {
          const currentLockout = await checkStudentLockout(normalized)
          setLockout(currentLockout)
          if (currentLockout.locked) {
            try {
              const recovery = await verifyTemporaryPassword(normalized, password)
              await navigate({ to: '/create-password', search: { token: recovery.resetToken, email: recovery.email, proof: recovery.resetProof, recovery: 'temporary' } })
              return
            } catch {
              setError('This portal is locked. Please reach out to an admin through Contact Us or click Forgot password.')
              return
            }
          }
        }
        try {
          await blink.auth.signInWithEmail(normalized, password)
          if (!adminIntent) {
            try { await recordStudentAuthAttempt(normalized, 'success', 'sign_in') } catch { console.warn('Student auth security reset unavailable') }
          }
          const auditRecorded = await recordAuthAttempt(normalized, 'success', 'sign_in')
          if (!auditRecorded) {
            await blink.auth.signOut()
            setError('We could not complete the secure sign-in. Please try again.')
            return
          }
          // Admin authorization is checked once by RoleGate after the auth state
          // listener receives the new session. Doing a second permission request
          // here races the first token persistence on a fresh sign-in.
          await navigate({ to: nextPath })
        } catch {
          let lockoutStatus: { locked: boolean; lockedUntil?: string; message?: string } = { locked: false }
          if (!adminIntent) {
            try {
              lockoutStatus = await recordStudentAuthAttempt(normalized, 'failure', 'sign_in_failed')
              setLockout(lockoutStatus)
            } catch {
              // Keep the normal authentication error if the security service is unavailable.
            }
          }
          const temporaryPasswordAttempt = !adminIntent && (lockoutStatus.locked || lockout.locked) && password.length > 0
          if (temporaryPasswordAttempt) {
            try {
              const recovery = await verifyTemporaryPassword(normalized, password)
              await navigate({ to: '/create-password', search: { token: recovery.resetToken, email: recovery.email, proof: recovery.resetProof, recovery: 'temporary' } })
              return
            } catch {
              // It was a regular incorrect password; show the lockout-safe message below.
            }
          }
          setError(lockoutStatus.locked ? lockoutStatus.message || 'This student portal is now locked for 8 hours. An administrator must send a temporary password.' : 'We couldn’t sign you in with those details. You can reset your password and try again.')
        }
      }
    } finally { setBusy(false) }
  }

  const title = adminIntent ? 'Lead ELEVIQ with clarity.' : mode === 'forgot' ? 'Reset your password' : access ? 'Request secure access' : 'Prepare with purpose.'
  const subtitle = adminIntent ? 'Use your administrator account to continue' : mode === 'forgot' ? 'We’ll help you get back into your workspace.' : access ? 'Use your ELEVIQ email to receive a secure sign-in link.' : 'Sign in to continue'
  return <main className="relative min-h-dvh overflow-hidden bg-background px-4 py-6 text-foreground sm:px-6 lg:bg-primary"><div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-accent/15 blur-3xl lg:hidden" /><div className="relative mx-auto grid min-h-[calc(100dvh-3rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_380px] xl:gap-12"><AuthBrandPanel adminIntent={adminIntent} /><section className="w-full animate-fade-in rounded-[2rem] border border-border bg-card p-6 text-card-foreground shadow-lg sm:p-8"><div className="mb-6"><Link to="/" aria-label="Return to ELEVIQ home page" className="group inline-flex items-center gap-2 rounded-md px-1.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"><ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" /> {adminIntent ? 'Back to home' : 'Back to home'}</Link></div><div className="mb-8 flex items-center gap-3 lg:hidden"><div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-secondary p-1.5"><img src="/brand/eleviq-logo.png" alt="ELEVIQ Prep" className="h-full w-full object-contain" /></div><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">ELEVIQ / {adminIntent ? 'OPS' : 'PREP'}</p><p className="mt-1 text-xs text-muted-foreground">{adminIntent ? 'Admin access' : 'Student portal'}</p></div></div><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Secure entry</p><h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-primary">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{subtitle}</p></div><form onSubmit={submit} className="mt-8 space-y-4">{mode === 'signin' && !emailConfirmed && !adminIntent && <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground"><span className="h-px flex-1 bg-border" /><span>Account email</span><span className="h-px flex-1 bg-border" /></div>}<div><Label htmlFor="email" className="mb-2 block text-xs font-semibold text-primary">{adminIntent ? 'Administrator email' : 'ELEVIQ email address'}</Label><div className="relative"><Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="email" type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailConfirmed(false); setEmailCheck('') }} className="h-11 rounded-xl border-input bg-background pl-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" /></div>{adminIntent && <p className="mt-2 text-xs leading-5 text-muted-foreground">Authorized ELEVIQ administrators only.</p>}{emailCheck && <p className="mt-2 text-xs leading-5 text-muted-foreground" role="status">{emailCheck}</p>}</div>{mode === 'signin' && (emailConfirmed || adminIntent) && <div><div className="flex items-center justify-between"><Label htmlFor="password" className="text-xs font-semibold text-primary">Password</Label>{!adminIntent && <button type="button" onClick={() => setMode('forgot')} className="text-xs font-semibold text-primary underline-offset-4 hover:text-accent hover:underline">Forgot password?</button>}</div><div className="relative mt-2"><LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="h-11 rounded-xl border-input bg-background pl-10 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring" required /></div>{!adminIntent && <button type="button" onClick={() => { setEmailConfirmed(false); setPassword('') }} className="mt-2 text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline">Use a different email</button>}</div>}{mode === 'forgot' && <p className="rounded-xl bg-secondary p-3 text-xs leading-5 text-muted-foreground">Enter the verified ELEVIQ email already in our system. We’ll email a secure link so you can choose a new password.</p>}{mode === 'forgot' && <button type="button" onClick={() => void resendVerificationEmail(email.trim().toLowerCase()).then(() => toast.success('Verification email requested', { description: 'If that address has an account, a verification link is on its way.' })).catch(cause => setError(cause instanceof Error ? cause.message : 'We could not resend the verification email.'))} className="text-left text-xs font-semibold text-primary underline-offset-4 hover:text-accent hover:underline">Need to verify this email? Resend verification</button>}{error && <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs leading-5 text-destructive">{error}</p>}{studentLockoutActive && <p className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-xs leading-5 text-primary"><strong>Temporary password required.</strong> Check your email for the one-time password sent by an ELEVIQ administrator, then enter it above. You will be required to choose a new password.</p>}<Button disabled={busy} className="h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-md shadow-primary/15 transition-transform hover:-translate-y-0.5 hover:bg-primary/90 active:translate-y-0">{busy ? 'Please wait…' : mode === 'forgot' ? 'Send reset link' : access ? 'Email secure access link' : studentLockoutActive ? 'Use temporary password' : emailConfirmed || adminIntent ? 'Sign in securely' : 'Continue with email'} {!busy && <ArrowRight className="h-4 w-4" />}</Button></form><div className="mt-7 border-t border-border pt-5 text-center text-xs text-muted-foreground">{adminIntent ? <span>Protected ELEVIQ administrator access</span> : mode === 'signin' ? <>Need an account? <button type="button" onClick={() => { setMode('access'); setEmailConfirmed(false) }} className="font-semibold text-primary underline-offset-4 hover:text-accent hover:underline">Request access</button></> : <button type="button" onClick={() => { setMode('signin'); setEmailConfirmed(false) }} className="font-semibold text-primary underline-offset-4 hover:text-accent hover:underline">Back to sign in</button>}</div>{authNotice && <p className="mt-4 rounded-xl bg-secondary p-3 text-center text-xs leading-5 text-primary" role="status">{authNotice}</p>}<p className="mt-5 text-center text-[10px] leading-4 text-muted-foreground">By continuing, you agree to our <Link to="/terms" className="font-semibold text-primary underline">Terms of Service</Link> and <Link to="/privacy" className="font-semibold text-primary underline">Privacy Policy</Link></p></section></div></main>
}
