import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Clock3, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { blink } from '@/blink/client'

const WARNING_AFTER_MS = 10 * 60 * 1000
const LOGOUT_AFTER_MS = 15 * 60 * 1000
const PERSIST_THROTTLE_MS = 1000

type SessionTimeoutProps = {
  children: ReactNode
  sessionKey: string
}

function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

export function SessionTimeout({ children, sessionKey }: SessionTimeoutProps) {
  const [warningOpen, setWarningOpen] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(5 * 60)
  const [refreshing, setRefreshing] = useState(false)
  const lastActivityRef = useRef(0)
  const lastPersistRef = useRef(0)
  const warningRef = useRef(false)
  const loggingOutRef = useRef(false)
  const storageKey = `eleviq.session.lastActivity.${sessionKey}`

  useEffect(() => {
    warningRef.current = warningOpen
  }, [warningOpen])

  useEffect(() => {
    let disposed = false
    const readStoredActivity = () => {
      try {
        const value = Number(window.localStorage.getItem(storageKey))
        return Number.isFinite(value) && value > 0 ? value : 0
      } catch {
        return 0
      }
    }

    const persistActivity = (timestamp: number) => {
      lastActivityRef.current = timestamp
      lastPersistRef.current = timestamp
      try {
        window.localStorage.setItem(storageKey, String(timestamp))
      } catch {
        // The auth SDK still persists the authenticated session if storage is unavailable.
      }
    }

    const logout = async () => {
      if (disposed || loggingOutRef.current) return
      loggingOutRef.current = true
      try {
        window.localStorage.removeItem(storageKey)
      } catch {
        // Continue with the server-backed sign out when browser storage is unavailable.
      }
      toast.info('You were signed out for your security.')
      try {
        await blink.auth.signOut()
      } finally {
        const next = `${window.location.pathname}${window.location.search}`
        window.location.assign(`/login?next=${encodeURIComponent(next)}`)
      }
    }

    const openWarning = () => {
      if (warningRef.current || loggingOutRef.current) return
      warningRef.current = true
      setWarningOpen(true)
    }

    const storedActivity = readStoredActivity()
    const now = Date.now()
    if (storedActivity && now - storedActivity >= LOGOUT_AFTER_MS) {
      void logout()
    } else {
      persistActivity(storedActivity || now)
      if (storedActivity && now - storedActivity >= WARNING_AFTER_MS) openWarning()
    }

    const registerActivity = () => {
      if (warningRef.current || loggingOutRef.current) return
      const timestamp = Date.now()
      if (timestamp - lastPersistRef.current >= PERSIST_THROTTLE_MS) persistActivity(timestamp)
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return
      const timestamp = Number(event.newValue)
      if (!Number.isFinite(timestamp) || timestamp <= lastActivityRef.current) return
      lastActivityRef.current = timestamp
      if (warningRef.current && Date.now() - timestamp < WARNING_AFTER_MS) {
        warningRef.current = false
        setWarningOpen(false)
      }
    }

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current
      if (elapsed >= LOGOUT_AFTER_MS) {
        void logout()
        return
      }
      if (elapsed >= WARNING_AFTER_MS) openWarning()
      if (elapsed >= WARNING_AFTER_MS) setSecondsLeft(Math.max(0, Math.ceil((LOGOUT_AFTER_MS - elapsed) / 1000)))
    }, 1000)

    const activityEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'scroll', 'touchstart']
    activityEvents.forEach((eventName) => window.addEventListener(eventName, registerActivity, { passive: true }))
    window.addEventListener('storage', handleStorage)

    return () => {
      disposed = true
      window.clearInterval(interval)
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, registerActivity))
      window.removeEventListener('storage', handleStorage)
    }
  }, [storageKey])

  const staySignedIn = async () => {
    setRefreshing(true)
    try {
      await blink.auth.getValidToken()
      const timestamp = Date.now()
      lastActivityRef.current = timestamp
      lastPersistRef.current = timestamp
      window.localStorage.setItem(storageKey, String(timestamp))
      warningRef.current = false
      setWarningOpen(false)
      setSecondsLeft(5 * 60)
      toast.success('Session updated.', { description: 'You can keep working securely.' })
    } catch (error) {
      toast.error('We could not refresh your session.', { description: error instanceof Error ? error.message : 'Please sign in again.' })
      await blink.auth.signOut()
      window.location.assign('/login')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <>
      {children}
      {warningOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-primary/35 p-4" role="presentation">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg" role="dialog" aria-modal="true" aria-labelledby="session-timeout-title">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-primary"><ShieldCheck className="h-5 w-5" /></div>
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-accent">Secure session check</p>
            <h2 id="session-timeout-title" className="mt-2 font-serif text-3xl font-bold text-primary">Are you still here?</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">You have been inactive for 10 minutes. For your security, you will be signed out in <span className="font-mono font-bold text-primary">{formatRemaining(secondsLeft)}</span>.</p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => void blink.auth.signOut()} className="rounded-lg px-4 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-primary">Sign out</button>
              <button type="button" autoFocus onClick={() => void staySignedIn()} disabled={refreshing} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-wait disabled:opacity-60"><Clock3 className="h-4 w-4" />{refreshing ? 'Updating session…' : 'Yes, keep me signed in'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
