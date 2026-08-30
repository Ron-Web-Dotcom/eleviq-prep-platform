import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { CheckCircle2, Circle, LockKeyhole, ShieldCheck } from 'lucide-react'
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

function CreatePasswordRoute() { return <BlinkClientBoundary fallback={<div className="min-h-dvh bg-[#0b0b0b]" />}><CreatePassword /></BlinkClientBoundary> }

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
  const navigate = useNavigate(); const search = useSearch({ from: '/create-password' }) as { token?: string; token_hash?: string; access_token?: string }
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [aiGuidance, setAiGuidance] = useState(''); const [guidanceFor, setGuidanceFor] = useState(''); const [aiLoading, setAiLoading] = useState(false)
  const token = search.token || search.token_hash || search.access_token
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
    setBusy(true)
    try { if (token) await blink.auth.confirmPasswordReset(token, password); else return setError('Open the latest password link from your email to continue.'); toast.success('Password updated'); await navigate({ to: '/app' }) }
    catch { setError('We couldn’t update your password. Please use the latest email link and try again.') } finally { setBusy(false) }
  }
  return <main className="flex min-h-dvh items-center justify-center bg-[#0b0b0b] px-4 py-8 text-[#f4f6f9]"><section className="w-full max-w-[360px] rounded-[9px] border border-[#202020] bg-[#111111] px-[26px] py-[27px] shadow-2xl shadow-black/40"><div className="text-center"><div className="mx-auto mb-5 flex h-[30px] w-[30px] items-center justify-center overflow-hidden rounded-[9px] bg-[#f4f6f9]"><img src="/brand/eleviq-logo.png" alt="ELEVIQ Prep" className="h-full w-full object-contain" /></div><p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#737373]">ELEVIQ PREP</p><h1 className="mt-3 text-[18px] font-semibold">Create a password</h1><p className="mt-2 text-[11px] leading-5 text-[#a2a2a4]">Choose a private password to secure your learning workspace.</p></div><form onSubmit={submit} className="mt-7 space-y-3"><div><Label htmlFor="new-password" className="text-[11px] font-medium text-[#c1c6d2]">New password</Label><div className="relative mt-2"><LockKeyhole className="absolute left-3 top-[11px] h-3.5 w-3.5 text-[#737373]" /><Input id="new-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} className="h-[35px] rounded-[9px] border-[#202020] bg-[#0b0b0b] pl-9 text-[11px] text-[#f4f6f9] focus-visible:ring-1 focus-visible:ring-[#4e4e4e]" /></div><div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-[7px] border border-[#202020] bg-[#0b0b0b] p-3">{requirements.map(([label, met]) => <p key={label} className={`flex items-center gap-1.5 text-[10px] ${met ? 'text-[#b9d7c0]' : 'text-[#737373]'}`}>{met ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <Circle className="h-3 w-3 shrink-0" />}{label}</p>)}</div>{password && <div className="mt-3 flex items-start gap-2 rounded-[7px] border border-[#202020] bg-[#202020] p-2.5 text-[10px] leading-4 text-[#c1c6d2]"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{aiLoading || guidanceFor !== signalKey ? 'AI security guidance is checking the password signals…' : aiGuidance}</span></div>}</div><div><Label htmlFor="confirm-password" className="text-[11px] font-medium text-[#c1c6d2]">Confirm password</Label><Input id="confirm-password" type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} className="mt-2 h-[35px] rounded-[9px] border-[#202020] bg-[#0b0b0b] text-[11px] text-[#f4f6f9] focus-visible:ring-1 focus-visible:ring-[#4e4e4e]" /></div>{!token && <p className="text-[11px] leading-5 text-[#a2a2a4]">Use the latest password-reset link sent to your ELEVIQ email to continue.</p>}{error && <p role="alert" className="rounded-[7px] border border-[#4e4e4e] bg-[#202020] p-2.5 text-[11px] leading-4 text-[#f4f6f9]">{error}</p>}<Button disabled={busy || !requirementsMet} className="h-[35px] w-full rounded-[9px] bg-[#202020] text-[11px] font-medium text-[#c1c6d2] shadow-none hover:bg-[#2b2b2b] hover:text-[#f4f6f9]">{busy ? 'Updating…' : 'Save password'}</Button></form></section></main>
}
