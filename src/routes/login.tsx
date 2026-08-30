import { useState } from 'react'
import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BlinkClientBoundary } from '@/components/BlinkClientBoundary'
import { blink } from '@/blink/client'
import { fetchAdminSummary } from '@/lib/admin-api'
import { checkEmailLegitimacy } from '@/lib/auth-security-api'

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
  return <BlinkClientBoundary fallback={<div className="min-h-dvh bg-[#080e22]" />}><Login /></BlinkClientBoundary>
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
  const access = mode === 'access'
  const nextPath = safeNext(search.next)
  const adminIntent = nextPath === '/admin'

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setAuthNotice('')
    const normalized = email.trim().toLowerCase()
    if (!normalized) return setError('Enter your email address.')
    if (normalized.split('@')[1] !== 'eleviqprep.com') return setError(adminIntent ? 'Use your verified @eleviqprep.com username.' : 'ELEVIQ accounts must use an @eleviqprep.com email address.')
    if (mode === 'signin' && !emailConfirmed && !adminIntent) {
      setBusy(true)
      try {
        const result = await checkEmailLegitimacy(normalized)
        setEmailCheck(result.guidance)
        if (!result.legitimate) return setError(result.guidance)
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
        await blink.auth.sendPasswordResetEmail(normalized, { redirectUrl: `${window.location.origin}/create-password` })
        const auditRecorded = await recordAuthAttempt(normalized, 'success', 'password_reset_requested')
        if (!auditRecorded) {
          setError('We could not complete the secure request. Please try again.')
          return
        }
        setAuthNotice('If that ELEVIQ address has an account, a secure reset link is on its way.')
        toast.success('Reset link sent', { description: 'Check your inbox for the next step.' })
        setMode('signin')
        setEmailConfirmed(false)
      } catch {
        const auditRecorded = await recordAuthAttempt(normalized, 'failure', 'password_reset_failed')
        setError(auditRecorded ? 'We could not send a reset link right now. Please try again.' : 'We could not complete the secure request. Please try again.')
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
        try {
          await blink.auth.signInWithEmail(normalized, password)
          const auditRecorded = await recordAuthAttempt(normalized, 'success', 'sign_in')
          if (!auditRecorded) {
            await blink.auth.signOut()
            setError('We could not complete the secure sign-in. Please try again.')
            return
          }
          if (adminIntent) {
            const summary = await fetchAdminSummary()
            if (!summary.authorized) {
              await blink.auth.signOut()
              setError('This account is not authorized for the admin portal.')
              return
            }
          }
          await navigate({ to: nextPath })
        } catch {
          const auditRecorded = await recordAuthAttempt(normalized, 'failure', 'sign_in_failed')
          setError(auditRecorded ? 'We couldn’t sign you in with those details. You can reset your password and try again.' : 'We could not complete the secure request. Please try again.')
        }
      }
    } finally { setBusy(false) }
  }

  const title = adminIntent ? 'Welcome to ELEVIQ Prep Platform' : mode === 'forgot' ? 'Reset your password' : access ? 'Request secure access' : 'Welcome to ELEVIQ Prep Platform'
  const subtitle = adminIntent ? 'Use your administrator account to continue' : mode === 'forgot' ? 'We’ll help you get back into your workspace.' : access ? 'Use your ELEVIQ email to receive a secure sign-in link.' : 'Sign in to continue'
  return <main className="flex min-h-dvh items-center justify-center bg-[#0b0b0b] px-4 py-8 text-[#f4f6f9]">
    <section className="w-full max-w-[308px] animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="rounded-[9px] border border-[#202020] bg-[#111111] px-[26px] py-[27px] shadow-2xl shadow-black/40">
        <div className="text-center"><div className="mx-auto mb-5 flex h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-[9px] bg-[#f4f6f9]"><img src="/brand/eleviq-logo.png" alt="ELEVIQ Prep" className="h-full w-full object-contain" /></div><h1 className="text-[16px] font-semibold leading-[1.35] tracking-[-0.01em] text-[#f4f6f9]">{title}</h1><p className="mt-2 text-[12px] text-[#a2a2a4]">{subtitle}</p></div>
        <form onSubmit={submit} className="mt-7 space-y-2.5">
          {mode === 'signin' && !emailConfirmed && !adminIntent && <div className="mb-4 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.03em] text-[#737373]"><span className="h-px flex-1 bg-[#202020]" /><span>Or continue with email</span><span className="h-px flex-1 bg-[#202020]" /></div>}
          <div><Label htmlFor="email" className="mb-2 block text-[11px] font-medium text-[#c1c6d2]">{adminIntent ? 'Username' : 'Email address'}</Label><div className="relative"><Mail className="absolute left-3 top-[11px] h-3.5 w-3.5 text-[#737373]" /><Input id="email" type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailConfirmed(false); setEmailCheck('') }} className="h-[35px] rounded-[9px] border-[#202020] bg-[#0b0b0b] pl-9 text-[11px] text-[#f4f6f9] placeholder:text-[#737373] focus-visible:ring-1 focus-visible:ring-[#4e4e4e]" /></div>{adminIntent && <p className="mt-2 text-[10px] leading-4 text-[#737373]">Use your verified @eleviqprep.com username.</p>}{emailCheck && <p className="mt-2 text-[10px] leading-4 text-[#a2a2a4]" role="status">{emailCheck}</p>}</div>
          {mode === 'signin' && (emailConfirmed || adminIntent) && <div className="pt-1"><div className="flex items-center justify-between"><Label htmlFor="password" className="text-[11px] font-medium text-[#c1c6d2]">Password</Label>{!adminIntent && <button type="button" onClick={() => setMode('forgot')} className="text-[10px] text-[#c1c6d2] underline-offset-4 hover:text-[#f4f6f9] hover:underline">Forgot password?</button>}</div><div className="relative mt-2"><LockKeyhole className="absolute left-3 top-[11px] h-3.5 w-3.5 text-[#737373]" /><Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="h-[35px] rounded-[9px] border-[#202020] bg-[#0b0b0b] pl-9 text-[11px] text-[#f4f6f9] focus-visible:ring-1 focus-visible:ring-[#4e4e4e]" required /></div>{!adminIntent && <button type="button" onClick={() => { setEmailConfirmed(false); setPassword('') }} className="mt-2 text-[10px] text-[#737373] underline-offset-4 hover:text-[#f4f6f9] hover:underline">Use a different email</button>}</div>}
          {mode === 'forgot' && <p className="pb-1 text-[11px] leading-5 text-[#a2a2a4]">We’ll email a secure link so you can choose a new password.</p>}{error && <p role="alert" className="rounded-[7px] border border-[#4e4e4e] bg-[#202020] p-2.5 text-[11px] leading-4 text-[#f4f6f9]">{error}</p>}
          <Button disabled={busy} className="h-[35px] w-full rounded-[9px] bg-[#202020] px-3 text-[11px] font-medium text-[#c1c6d2] shadow-none hover:bg-[#2b2b2b] hover:text-[#f4f6f9]">{busy ? 'Please wait…' : mode === 'forgot' ? 'Send reset link' : access ? 'Email secure access link' : emailConfirmed || adminIntent ? 'Sign in' : 'Continue with Email'} {!busy && <ArrowRight className="h-3.5 w-3.5" />}</Button>
        </form>
        <div className="mt-6 border-t border-[#202020] pt-5 text-center text-[10px] leading-4 text-[#737373]">{adminIntent ? <span>Authorized ELEVIQ administrators only</span> : mode === 'signin' ? <>Need an account? <button type="button" onClick={() => { setMode('access'); setEmailConfirmed(false) }} className="text-[#c1c6d2] underline-offset-4 hover:text-[#f4f6f9] hover:underline">Request access</button></> : <button type="button" onClick={() => { setMode('signin'); setEmailConfirmed(false) }} className="text-[#c1c6d2] underline-offset-4 hover:text-[#f4f6f9] hover:underline">Back to sign in</button>}</div>
        {authNotice && <p className="mt-4 text-center text-[10px] leading-4 text-[#c1c6d2]" role="status">{authNotice}</p>}
        <p className="mt-4 text-center text-[9px] leading-4 text-[#737373]">By continuing, you agree to our <Link to="/terms" className="text-[#c1c6d2] underline">Terms of Service</Link> and <Link to="/privacy" className="text-[#c1c6d2] underline">Privacy Policy</Link></p>
      </div>
      <div className="mt-4 flex justify-center gap-4 text-[10px] text-[#737373]"><Link to="/login" search={{ next: '/admin' }} className="hover:text-[#c1c6d2]">Admin access</Link><span>•</span><span>Protected by ELEVIQ</span></div>
    </section>
  </main>
}
