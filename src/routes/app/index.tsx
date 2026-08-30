import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChatBox } from '@/components/ChatBox'
import { blink } from '@/blink/client'
import { fetchChatContacts } from '@/lib/chat-api'
import { ArrowRight, BrainCircuit, Clock3, Zap, Target, CheckCircle2, BookOpen } from 'lucide-react'

/**
 * Dashboard home — `/app` (this file is the index of the `/app` segment, so its
 * path is `/app`, NOT `/app/index`). Rendered inside the sidebar shell defined in
 * `src/routes/app.tsx`.
 *
 * Add sibling pages as files in this folder: `src/routes/app/orders.tsx` → /app/orders.
 * Every page you add must also get a matching sidebar link (see AppSidebarShell),
 * and every sidebar link must have a real page — never ship a nav link to a 404.
 *
 * Replace this placeholder body with the real dashboard.
 */
export const Route = createFileRoute('/app/')({
  head: () => ({
    meta: [
      { title: 'Student Portal · ELEVIQ Prep' },
      { name: 'description', content: 'Your Phlebotomy, CNA, or LPN tutoring and study workspace.' },
    ],
  }),
  component: DashboardHome,
})

function StudentChatPanel() {
  const [teacherId, setTeacherId] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const loadTeacher = async () => {
      try {
        const contacts = await fetchChatContacts()
        if (mounted && contacts[0]) {
          setTeacherId(contacts[0].id)
          setTeacherName(contacts[0].displayName || contacts[0].email || 'ELEVIQ teacher')
        }
      } catch {
        // The empty state explains how the student can proceed if no administrator is available.
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void loadTeacher()
    return () => { mounted = false }
  }, [])

  return <section aria-labelledby="teacher-messages"><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Stay connected</p><h2 id="teacher-messages" className="mt-1 font-serif text-2xl text-primary sm:text-3xl">Message your ELEVIQ teacher</h2><p className="mt-2 text-sm text-muted-foreground">Send a question or a voice note directly from your study workspace.</p></div>{loading ? <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Finding your assigned teacher…</CardContent></Card> : teacherId ? <ChatBox recipientUserId={teacherId} title={`Message ${teacherName}`} subtitle="Your private ELEVIQ support conversation" /> : <Card><CardContent className="p-8 text-center"><p className="font-semibold text-primary">Your teacher chat will appear here</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Once an ELEVIQ administrator is available, you can send secure text messages and voice notes from this space.</p></CardContent></Card>}</section>
}

function DashboardHome() {
  return (
    <div className="relative space-y-8 overflow-hidden"><section className="rounded-2xl border border-primary/15 bg-card p-5 shadow-sm"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent">New study experience</p><h2 className="mt-1 font-serif text-2xl text-primary">ELEVIQ Test Mode</h2><p className="mt-1 text-sm text-muted-foreground">Practice pacing, case studies, multi-select, and clinical-judgment interactions.</p></div><a href="/test-mode" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0">Open Test Mode <ArrowRight className="h-4 w-4" /></a></div></section>
      <div className="pointer-events-none absolute -right-32 -top-28 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
      <section className="relative overflow-hidden rounded-[2rem] bg-primary p-6 text-primary-foreground shadow-lg shadow-primary/15 sm:p-8">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full border-[24px] border-primary-foreground/10" />
        <div className="relative flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">ELEVIQ / STUDENT PORTAL</p>
            <h1 className="mt-4 max-w-xl font-serif text-4xl leading-tight tracking-tight sm:text-5xl">Good evening, learner.</h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-primary-foreground/75">Your next best step is ready when you are. Keep the rhythm small, focused, and consistent.</p>
            <a href="#study-path" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-accent-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0">Continue studying <ArrowRight className="h-4 w-4" /></a>
          </div>
          <div className="relative rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-5 backdrop-blur-sm lg:min-w-64">
            <div className="flex items-center justify-between gap-4"><div><p className="text-xs text-primary-foreground/65">Your bootcamp</p><p className="mt-1 font-semibold">CNA · LPN · Phlebotomy</p></div><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary p-1"><img src="/brand/eleviq-logo.png" alt="ELEVIQ Prep" className="h-full w-full object-contain" /></div></div>
            <div className="mt-6 flex items-end justify-between"><div><p className="font-mono text-3xl font-semibold text-accent">74%</p><p className="mt-1 text-[10px] uppercase tracking-wider text-primary-foreground/60">Readiness indicator</p></div><span className="rounded-full bg-accent/20 px-2.5 py-1 text-[10px] font-bold text-accent">Approaching ready</span></div>
          </div>
        </div>
      </section>
      <section aria-labelledby="snapshot"><div className="mb-4 flex items-end justify-between"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Your snapshot</p><h2 id="snapshot" className="mt-1 font-serif text-2xl text-primary sm:text-3xl">Momentum, made visible.</h2></div><span className="hidden text-xs text-muted-foreground sm:inline">Updated from your learning workspace</span></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['74%', 'ELEVIQ readiness', 'Approaching Ready', Target, true], ['+8%', 'This month', 'Steady progress', Zap, false], ['61%', 'Focus area', 'Clinical skills', BrainCircuit, false], ['3', 'Open tasks', 'Due this week', Clock3, false]].map(([value, label, detail, Icon, featured]) => <Card key={String(label)} className={`group overflow-hidden transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg ${featured ? 'border-primary bg-primary text-primary-foreground' : 'bg-card'}`}><CardContent className="relative p-5"><div className={`mb-8 flex h-10 w-10 items-center justify-center rounded-xl ${featured ? 'bg-primary-foreground/10 text-accent' : 'bg-secondary text-accent'}`}>{typeof Icon === 'function' && <Icon className="h-5 w-5" />}</div><p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${featured ? 'text-primary-foreground/65' : 'text-muted-foreground'}`}>{String(label)}</p><p className={`mt-1 text-3xl font-semibold tracking-tight ${featured ? 'text-primary-foreground' : 'text-primary'}`}>{String(value)}</p><p className={`mt-1 text-xs ${featured ? 'text-primary-foreground/65' : 'text-muted-foreground'}`}>{String(detail)}</p></CardContent></Card>)}</div></section>
      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]"><section id="study-path" aria-labelledby="study-path-title"><div className="mb-4"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Your plan</p><h2 id="study-path-title" className="mt-1 font-serif text-2xl text-primary sm:text-3xl">Study path</h2><p className="mt-2 text-sm text-muted-foreground">Small, focused actions compound.</p></div><Card className="overflow-hidden"><CardContent className="space-y-1 p-4 sm:p-6">{[['Complete your skills remediation', '12 of 15 questions', '80%', 'w-4/5', CheckCircle2], ['Take your weekly practice test', 'Not started', '0%', 'w-0', BookOpen], ['Attend your tutoring session', 'Tomorrow · 6:00 PM', 'Next', '', Clock3]].map(([title, detail, progress, width, Icon], i) => <div key={String(title)} className="group flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-secondary/60"><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${i === 0 ? 'bg-accent text-accent-foreground' : 'bg-secondary text-primary'}`}>{typeof Icon === 'function' && <Icon className="h-5 w-5" />}</div><div className="min-w-0 flex-1"><div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center"><p className="font-semibold text-primary">{String(title)}</p><span className="text-xs font-bold text-muted-foreground">{String(progress)}</span></div><p className="mt-1 text-xs text-muted-foreground">{String(detail)}</p>{width && <div className="mt-2 h-2 rounded-full bg-secondary"><div className={`h-full rounded-full bg-primary transition-all duration-500 ${String(width)}`} /></div>}</div></div>)}</CardContent></Card></section><section id="insights" aria-labelledby="insights-title"><div className="mb-4"><p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Study perspective</p><h2 id="insights-title" className="mt-1 font-serif text-2xl text-primary sm:text-3xl">Readiness note</h2><p className="mt-2 text-sm text-muted-foreground">A little perspective for the next session.</p></div><Card className="h-[calc(100%-5.25rem)] border-accent/30 bg-secondary/55"><CardContent className="flex h-full flex-col justify-between p-6"><div><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground"><BrainCircuit className="h-5 w-5" /></div><p className="mt-8 font-serif text-2xl font-bold leading-snug text-primary">“Progress is information, not pressure.”</p><p className="mt-5 text-sm leading-6 text-muted-foreground">Your dashboard highlights where study time can make the biggest difference. This educational indicator is not a guarantee of exam results.</p></div><a href="#study-path" className="mt-8 inline-flex items-center gap-2 self-start rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0">Review insights <ArrowRight className="h-4 w-4" /></a></CardContent></Card></section></div>
      <StudentChatPanel />
    </div>
  )
}
