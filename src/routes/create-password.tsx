import { useEffect, useMemo, useState } from 'react'
import { Link, createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, Circle, LockKeyhole, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BlinkClientBoundary } from '@/components/BlinkClientBoundary'
import { blink } from '@/blink/client'
import { getPasswordGuidance, type PasswordSignals } from '@/lib/auth-security-api'

export const Route = createFileRoute('/create-password')({
  head: () => ({ meta: [{ title: 'Create password · ELEVIQ Prep' }, { name: 'description', content: 'Choose a new secure password for your ELEVIQ Prep account.' }] }),
  component: CreatePasswordRoute,
})

function CreatePasswordRoute() { return <BlinkClientBoundary fallback={<div className="min-h-dvh bg-primary" />}><CreatePassword /></BlinkClientBoundary> }

function deriveSignals(password: string): PasswordSignals {
  return {
    length: password.length,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9\s]/.test(password),
    hasWhitespace: /\s/.test(password),
    hasRepeatedCharacters: /(.)\1\1/.test(password),
  }
}

function CreatePassword() {
  const navigate = useNavigate(); const search = useSearch({ from: '/create-password' }) as { token?: string; token_hash?: string; access_token?: string; email?: string; proof?: string; recovery?: string }
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [aiGuidance, setAiGuidance] = useState(''); const [guidanceFor, setGuidanceFor] = useState(''); const [aiLoading, setAiLoading] = useState(false)
  const token = search.token || search.token_hash || search.access_token
  const temporaryRecovery = search.recovery === 'temporary' && Boolean(search.email && search.proof)
  const signals = useMemo(() => deriveSignals(password), [password])
  const signalKey = JSON.stringify(signals)
  const requirements = [
    ['At least 8 characters', signals.length >= 8],
    ['One uppercase letter', signals.hasUppercase],
    ['One lowercase letter', signals.hasLowercase],
    ['One number', signals.hasNumber],
    ['One special character', signals.hasSpecial],
    ['No spaces', password.length > 0 && !signals.hasWhitespace],
  ] as const
  const requirementsMet = requirements.every(([, met]) => met)

  useEffect(() => {
    if (!password) return
    let active = true
    const timer = window.setTimeout(() => {
      setAiLoading(true)
      void getPasswordGuidance(signals)
        .then(guidance => { if (active) { setAiGuidance(guidance); setGuidanceFor(signalKey) } })
        .catch(() => { if (active) { setAiGuidance('Keep building a unique password that meets every requirement below.'); setGuidanceFor(signalKey) } })
        .finally(() => { if (active) setAiLoading(false) })
    }, 500)
    return () => { active = false; window.clearTimeout(timer) }
  }, [password, signalKey, signals])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('')
    if (!requirementsMet) return setError('Meet every password requirement before continuing.')
    if (password !== confirm) return setError('Passwords do not match.')
    if (!token) return setError('Open the latest password link from your email to continue.')
    setBusy(true)
    try {
      await blink.auth.confirmPasswordReset(token, password)
      if (temporaryRecovery) {
        const { completeStudentLockoutReset } = await import('@/lib/auth-security-api')
        await completeStudentLockoutReset(search.email!, search.proof!)
      }
      toast.success('Password updated', { description: temporaryRecovery ? 'Your portal has been unlocked.' : undefined })
      await navigate({ to: '/app' })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'We couldn’t update your password. Please use the latest email link and try again.')
    } finally { setBusy(false) }
  }
  return <main className="relative min-h-dvh overflow-hidden bg-background px-4 py-6 text-foreground sm:px-6 lg:bg-primary"><div className="pointer-events-none absolute -right-24 top-10 h-64 w-64 rounded-full bg-accent/15 blur-3xl lg:hidden" /><div className="relative mx-auto grid min-h-[calc(100dvh-3rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_380px] xl:gap-12"><section className="hidden min-h-[620px] flex-col justify-between rounded-[2rem] border border-primary-foreground/15 bg-primary p-8 shadow-2xl shadow-primary/25 lg:flex xl:p-10"><div><div className="flex items-center gap-3"><div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-secondary p-1.5"><img src="/brand/eleviq-logo.png" alt="ELEVIQ Prep" className="h-full w-full object-contain" /></div><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.24em] text-accent">ELEVIQ / PREP</p><p className="mt-1 text-sm font-semibold text-primary-foreground">Secure your study space</p></div></div><p className="mt-16 font-mono text-xs uppercase tracking-[0.18em] text-primary-foreground/60">One strong habit at a time.</p><h1 className="mt-4 max-w-xl font-serif text-5xl leading-[1.02] tracking-tight text-primary-foreground xl:text-6xl">Build a password that protects your progress.</h1><p className="mt-6 max-w-md text-sm leading-7 text-primary-foreground/75">ELEVIQ keeps the requirements visible and gives you guidance without ever seeing the password itself.</p></div><div className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Security by design</p><p className="mt-3 text-sm leading-6 text-primary-foreground/75">Your password stays between you and the secure authentication service.</p></div></section><section className="w-full animate-fade-in rounded-[2rem] border border-border bg-card p-6 text-card-foreground shadow-lg sm:p-8"><div className="mb-6"><Link to="/" className="group inline-flex items-center gap-2 text-xs font-bold text-primary transition-colors hover:text-accent"><ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" /> Back to home</Link></div><div className="mb-8 flex items-center gap-3 lg:hidden"><div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-secondary p-1.5"><img src="/brand/eleviq-logo.png" alt="ELEVIQ Prep" className="h-full w-full object-contain" /></div><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">ELEVIQ / PREP</p><p className="mt-1 text-xs text-muted-foreground">Secure your study space</p></div></div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Account security</p><h2 className="mt-3 font-serif text-3xl font-bold tracking-tight text-primary">Create a password</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{temporaryRecovery ? 'Your administrator-issued temporary password worked. Choose a new password to unlock your learning workspace.' : 'Choose a private password to secure your learning workspace.'}</p><form onSubmit={submit} className="mt-8 space-y-4"><div><Label htmlFor="new-password" className="text-xs font-semibold text-primary">New password</Label><div className="relative mt-2"><LockKeyhole className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input id="new-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} className="h-11 rounded-xl border-input bg-background pl-10 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring" /></div><div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl border border-border bg-secondary/45 p-3">{requirements.map(([label, met]) => <p key={label} className={`flex items-center gap-1.5 text-xs ${met ? 'font-semibold text-chart-3' : 'text-muted-foreground'}`}>{met ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <Circle className="h-3.5 w-3.5 shrink-0" />}{label}</p>)}</div>{password && <div className="mt-3 flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/10 p-3 text-xs leading-5 text-primary"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span>{aiLoading || guidanceFor !== signalKey ? 'AI security guidance is checking the password signals…' : aiGuidance}</span></div>}</div><div><Label htmlFor="confirm-password" className="text-xs font-semibold text-primary">Confirm password</Label><Input id="confirm-password" type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-2 h-11 rounded-xl border-input bg-background text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring" /></div>{!token && <p className="rounded-xl bg-secondary p-3 text-xs leading-5 text-muted-foreground">Use the latest password-reset link sent to your ELEVIQ email to continue.</p>}{error && <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs leading-5 text-destructive">{error}</p>}<Button disabled={busy || !requirementsMet} className="h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-md shadow-primary/15 transition-transform hover:-translate-y-0.5 hover:bg-primary/90">{busy ? 'Updating…' : 'Save password'}</Button></form></section></div></main>
}