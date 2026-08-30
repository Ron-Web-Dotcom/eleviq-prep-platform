import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChatBox } from '@/components/ChatBox'
import { blink } from '@/blink/client'
import { fetchChatContacts } from '@/lib/chat-api'

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
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Student workspace</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-primary">Good evening, learner.</h1><p className="mt-2 text-sm text-muted-foreground">Your next best step is ready when you are.</p></div><div className="rounded-xl border border-border bg-card px-4 py-3 text-right"><p className="text-xs text-muted-foreground">Your bootcamp</p><p className="font-bold text-primary">CNA · LPN · Phlebotomy</p></div></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[['74%', 'ELEVIQ readiness', 'Approaching Ready'], ['+8%', 'This month', 'Steady progress'], ['61%', 'Focus area', 'Clinical skills'], ['3', 'Open tasks', 'Due this week']].map(([value, label, detail], i) => <Card key={label} className={i === 0 ? 'border-primary bg-primary text-primary-foreground' : ''}><CardHeader className="pb-2"><CardTitle className={`text-xs font-bold uppercase tracking-wider ${i === 0 ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{label}</CardTitle></CardHeader><CardContent><p className={`text-3xl font-bold ${i === 0 ? 'text-primary-foreground' : 'text-primary'}`}>{value}</p><p className={`mt-1 text-xs ${i === 0 ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{detail}</p></CardContent></Card>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]"><Card><CardHeader><CardTitle className="text-lg text-primary">Your study path</CardTitle><p className="text-sm text-muted-foreground">Small, focused actions compound.</p></CardHeader><CardContent className="space-y-5">{[['Complete your skills remediation', '12 of 15 questions', '80%'], ['Take your weekly practice test', 'Not started', '0%'], ['Attend your tutoring session', 'Tomorrow · 6:00 PM', '—']].map(([title, detail, progress], i) => <div key={title} className="flex items-center gap-4"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${i === 0 ? 'bg-accent text-primary' : 'bg-secondary text-primary'}`}>{i + 1}</div><div className="min-w-0 flex-1"><p className="font-semibold text-primary">{title}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p>{i < 2 && <div className="mt-2 h-1.5 rounded-full bg-secondary"><div className={`h-full rounded-full bg-accent ${i === 0 ? 'w-4/5' : 'w-0'}`} /></div>}</div><span className="text-xs font-bold text-muted-foreground">{progress}</span></div>)}</CardContent></Card><Card className="bg-secondary"><CardHeader><CardTitle className="text-lg text-primary">Readiness note</CardTitle></CardHeader><CardContent><p className="font-serif text-xl font-bold leading-snug text-primary">“Progress is information, not pressure.”</p><p className="mt-5 text-sm leading-6 text-muted-foreground">Your dashboard highlights where your study time can make the biggest difference. This educational indicator is not a guarantee of exam results.</p><button className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5">Review insights</button></CardContent></Card></div>
      <StudentChatPanel />
    </div>
  )
}
