import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { AuthGate } from '@/components/AuthGate'
import { TutorScheduleWorkspace } from '@/components/TutorScheduleWorkspace'
import { checkTutorAccess } from '@/lib/scheduling-api'

export const Route = createFileRoute('/tutor')({
  head: () => ({ meta: [
    { title: 'Tutor Workspace · ELEVIQ Prep' },
    { name: 'description', content: 'Book ELEVIQ tutoring sessions and sync them to Google Calendar.' },
  ] }),
  component: TutorPage,
})

function LoadingState({ label }: { label: string }) {
  return <div className="flex min-h-dvh items-center justify-center bg-background px-6 text-center"><div><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" /><p className="mt-4 text-sm text-muted-foreground">{label}</p></div></div>
}

function TutorAccess({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  useEffect(() => {
    void checkTutorAccess().then(result => setAllowed(result.authorized === true)).catch(() => setAllowed(false)).finally(() => setLoading(false))
  }, [])
  if (loading) return <LoadingState label="Checking tutor access…" />
  if (!allowed) return <main className="flex min-h-dvh items-center justify-center bg-background px-6 text-center"><div className="max-w-md rounded-2xl border border-border bg-card p-8 shadow-md"><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Tutor workspace</p><h1 className="mt-3 font-serif text-3xl text-primary">Verified tutor access required</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Ask an ELEVIQ administrator to assign the tutor role to your verified account.</p><a href="/" className="mt-6 inline-flex rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">Return to ELEVIQ Prep</a></div></main>
  return <>{children}</>
}

function TutorPage() {
  return <AuthGate><TutorAccess><main className="min-h-dvh bg-background px-3 py-6 sm:px-6 sm:py-10"><div className="mx-auto max-w-6xl"><a href="/" className="text-sm font-bold text-primary hover:text-accent">← ELEVIQ Prep</a><div className="mt-5 rounded-3xl border border-border bg-card shadow-lg"><TutorScheduleWorkspace onClose={() => window.location.assign('/')} /></div></div></main></TutorAccess></AuthGate>
}
