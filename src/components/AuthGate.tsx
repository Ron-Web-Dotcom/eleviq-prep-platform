import { useEffect, useRef, useState } from 'react'
import { blink } from '@/blink/client'
import { SessionTimeout } from '@/components/SessionTimeout'
import { checkAdminAccess } from '@/lib/admin-api'
import { BlinkClientBoundary } from '@/components/BlinkClientBoundary'

function LoadingState({ label }: { label: string }) {
  return (
    <div suppressHydrationWarning className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
      <div>
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function AuthenticatedContent({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [signedIn, setSignedIn] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => blink.auth.onAuthStateChanged((state) => {
    if (state.isLoading) return
    if (!state.user) {
      setSignedIn(false)
      setLoading(false)
      return
    }
    if (state.user.email?.toLowerCase().split('@')[1] !== 'eleviqprep.com') {
      void (async () => {
        try {
          await blink.auth.signOut()
        } finally {
          setSignedIn(false)
          setLoading(false)
        }
      })()
      return
    }
    setSignedIn(true)
    setLoading(false)
  }), [])

  useEffect(() => {
    if (!loading && !signedIn && !redirecting) {
      const next = `${window.location.pathname}${window.location.search}`
      window.location.assign(`/login?next=${encodeURIComponent(next)}`)
    }
  }, [loading, redirecting, signedIn])

  if (loading || redirecting) return <LoadingState label={redirecting ? 'Taking you to secure sign in…' : 'Checking your ELEVIQ account…'} />
  return <SessionTimeout sessionKey="student">{children}</SessionTimeout>
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <BlinkClientBoundary fallback={<LoadingState label="Loading your secure workspace…" />}>
      <AuthenticatedContent>{children}</AuthenticatedContent>
    </BlinkClientBoundary>
  )
}

export function RoleGate({ children }: { children: React.ReactNode }) {
  return (
    <BlinkClientBoundary fallback={<LoadingState label="Checking admin permissions…" />}>
      <RoleContent>{children}</RoleContent>
    </BlinkClientBoundary>
  )
}

function RoleContent({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const checkedUserId = useRef('')

  useEffect(() => {
    let active = true
    let unsubscribe: (() => void) | undefined
    const start = async () => {
      // Wait for the SDK's initial auth hydration before subscribing. This
      // prevents a transient empty state from being treated as a denial.
      await new Promise<void>(resolve => window.setTimeout(resolve, 300))
      if (!active) return
      unsubscribe = blink.auth.onAuthStateChanged((state) => {
        if (state.isLoading || !active) return
        if (!state.user) {
          setAllowed(false)
          setLoading(false)
          return
        }
        if (checkedUserId.current === state.user.id) return
        checkedUserId.current = state.user.id
        void (async () => {
          try {
            const access = await checkAdminAccess()
            if (active) setAllowed(access.authorized)
          } catch (cause) {
            console.error('Admin permission check failed', cause)
            if (active) setAllowed(false)
          } finally {
            if (active) setLoading(false)
          }
        })()
      })
    }
    void start()

    return () => {
      active = false
      unsubscribe?.()
    }
  }, [])

  if (loading) return <LoadingState label="Checking admin permissions…" />
  if (!allowed) {
    return (
      <div suppressHydrationWarning className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 shadow-md">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Restricted area</p>
          <h1 className="mt-3 text-2xl font-bold text-primary">System admin access required</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">This console is separate from the student portal. Sign in with an authorized ELEVIQ system administrator account.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3"><a href="/login?next=%2Fadmin" className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Administrator sign in</a><a href="/app" className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-bold text-primary hover:bg-secondary">Return to student portal</a></div>
        </div>
      </div>
    )
  }
  return <SessionTimeout sessionKey="admin">{children}</SessionTimeout>
}
