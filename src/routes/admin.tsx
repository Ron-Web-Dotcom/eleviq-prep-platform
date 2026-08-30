import { useEffect, useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { BookOpen, ClipboardList, LayoutDashboard, ShieldCheck, Users, X } from 'lucide-react'
import { RoleGate } from '@/components/AuthGate'
import { blink } from '@/blink/client'
import { fetchAdminSummary } from '@/lib/admin-api'

export const Route = createFileRoute('/admin')({
  head: () => ({
    meta: [
      { title: 'System Admin Console · ELEVIQ Prep' },
      { name: 'description', content: 'Restricted ELEVIQ system administration console.' },
    ],
  }),
  component: AdminConsole,
})

function AdminConsole() {
  const [counts, setCounts] = useState({ leads: 0, students: 0, questions: 0, products: 0 })
  const [activePanel, setActivePanel] = useState<string | null>(null)
  const [summaryError, setSummaryError] = useState('')

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const summary = await fetchAdminSummary()
        if (summary.counts) setCounts(summary.counts)
      } catch (error) {
        setSummaryError(error instanceof Error ? error.message : 'Unable to load admin records.')
      }
    }
    void loadCounts()
  }, [])

  const panels = [
    { label: 'CRM leads', detail: 'Review inquiries and follow-up stages.', count: counts.leads, icon: Users },
    { label: 'Student profiles', detail: 'View enrollment and readiness records.', count: counts.students, icon: LayoutDashboard },
    { label: 'Question bank', detail: 'Manage original practice content.', count: counts.questions, icon: ClipboardList },
    { label: 'Products & books', detail: 'Manage catalog and inventory.', count: counts.products, icon: BookOpen },
  ]

  return (
    <RoleGate>
      <main className="min-h-dvh bg-background px-6 py-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4"><img src="/brand/eleviq-logo.png" alt="ELEVIQ Prep" className="h-16 w-40 object-contain object-left" /><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">ELEVIQ Prep</p><p className="mt-1 text-sm text-muted-foreground">System administration</p></div></div>
            <div className="flex items-center gap-3"><Link to="/app" className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-primary hover:bg-secondary">Student portal</Link><button type="button" onClick={() => void blink.auth.signOut()} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:-translate-y-0.5">Sign out</button></div>
          </header>
          <div className="py-10"><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Control center</p><h1 className="mt-3 text-4xl font-bold tracking-tight text-primary">Run the learning platform.</h1><p className="mt-3 max-w-2xl text-muted-foreground">Manage the connected ELEVIQ ecosystem from one protected workspace.</p></div>
          {summaryError && <div className="my-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive" role="alert">Unable to load admin records: {summaryError}</div>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{panels.map(({ label, detail, count, icon: Icon }) => <button key={label} type="button" onClick={() => setActivePanel(label)} className="rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md"><div className="flex items-center justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary"><Icon className="h-5 w-5" /></div><span className="text-2xl font-bold text-primary">{count}</span></div><p className="mt-6 font-semibold text-primary">{label}</p><p className="mt-2 text-sm leading-5 text-muted-foreground">{detail}</p></button>)}</div>
          <div className="mt-8 rounded-2xl border border-border bg-secondary p-6"><div className="flex items-start gap-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="font-semibold text-primary">Protected system area</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Only authorized ELEVIQ system administrators should access this console. Student records and private operational data must be handled according to your organization’s policies.</p></div></div></div>
          {activePanel && <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 p-4" role="presentation" onMouseDown={() => setActivePanel(null)}><div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Admin module</p><h2 className="mt-2 text-2xl font-bold text-primary">{activePanel}</h2></div><button type="button" onClick={() => setActivePanel(null)} aria-label="Close module" className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"><X className="h-5 w-5" /></button></div><p className="mt-5 text-sm leading-6 text-muted-foreground">The {activePanel.toLowerCase()} workspace is ready for its detailed management tools. Current records: <strong className="text-primary">{panels.find((panel) => panel.label === activePanel)?.count ?? 0}</strong>.</p><button type="button" onClick={() => setActivePanel(null)} className="mt-6 w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">Close</button></div></div>}
        </div>
      </main>
    </RoleGate>
  )
}
