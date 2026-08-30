import { useCallback, useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Activity, ArrowUpRight, BookOpen, CheckCircle2, ClipboardList, Database, LayoutDashboard, LogOut, RefreshCw, ShieldCheck, Users } from 'lucide-react'
import { RoleGate } from '@/components/AuthGate'
import { blink } from '@/blink/client'
import { fetchAdminOverview, type AdminOverview } from '@/lib/admin-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/admin')({
  head: () => ({ meta: [{ title: 'Admin Control Center · ELEVIQ Prep' }] }),
  component: AdminConsole,
})

const modules = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'leads', label: 'Leads', icon: Users },
  { key: 'students', label: 'Students', icon: Activity },
  { key: 'content', label: 'Content', icon: ClipboardList },
] as const

function AdminModuleView({ active, overview }: { active: string; overview: AdminOverview | null }) {
  const leads = overview?.recent?.leads ?? []
  const students = overview?.recent?.students ?? []

  if (active === 'leads') {
    return (
      <Card className="mt-8">
        <CardHeader className="border-b border-border">
          <CardTitle>Recent leads</CardTitle>
          <p className="text-sm text-muted-foreground">Latest inquiries entering the ELEVIQ pipeline.</p>
        </CardHeader>
        <CardContent className="p-0">
          {leads.length > 0 ? leads.map((lead, index) => (
            <div key={lead.id ?? index} className="flex flex-col gap-2 border-b border-border/60 px-6 py-4 last:border-0 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{lead.name || 'Unnamed lead'}</p><p className="truncate text-xs text-muted-foreground">{lead.email || 'No email provided'}</p></div>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">{lead.stage || 'new'}</span>
              <span className="text-xs text-muted-foreground">{lead.programInterest || 'General inquiry'}</span>
            </div>
          )) : <div className="p-8 text-center text-sm text-muted-foreground">No lead inquiries have been recorded yet.</div>}
        </CardContent>
      </Card>
    )
  }

  if (active === 'students') {
    return (
      <Card className="mt-8">
        <CardHeader className="border-b border-border">
          <CardTitle>Recent student profiles</CardTitle>
          <p className="text-sm text-muted-foreground">Students most recently added to the learning platform.</p>
        </CardHeader>
        <CardContent className="p-0">
          {students.length > 0 ? students.map((student, index) => (
            <div key={student.id ?? index} className="flex flex-col gap-2 border-b border-border/60 px-6 py-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{student.programType || 'Student profile'}</p><p className="truncate text-xs text-muted-foreground">{student.school || 'School not provided'} · {student.examType || 'Exam not specified'}</p></div>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">{student.status || 'onboarding'}</span>
              <span className="text-xs text-muted-foreground">Readiness {student.readinessScore ?? '—'}</span>
            </div>
          )) : <div className="p-8 text-center text-sm text-muted-foreground">No student profiles have been recorded yet.</div>}
        </CardContent>
      </Card>
    )
  }

  if (active === 'content') {
    return (
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <Card><CardContent className="p-6"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-chart-3"><ClipboardList className="h-5 w-5" /></div><p className="mt-5 font-semibold">Question bank</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Original practice questions, rationales, and clinical judgment content.</p><p className="mt-5 text-3xl font-semibold">{overview?.counts.questions ?? 0}</p><p className="text-xs text-muted-foreground">questions tracked</p></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-chart-4"><BookOpen className="h-5 w-5" /></div><p className="mt-5 font-semibold">Products & books</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Workbook catalog, inventory, and bookstore readiness.</p><p className="mt-5 text-3xl font-semibold">{overview?.counts.products ?? 0}</p><p className="text-xs text-muted-foreground">catalog items tracked</p></CardContent></Card>
      </div>
    )
  }

  return null
}

function AdminConsole() {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [active, setActive] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setOverview(await fetchAdminOverview({ force: true })) } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load the control center.') } finally { setLoading(false) }
  }, [])
  useEffect(() => {
    let activeRequest = true
    fetchAdminOverview()
      .then((data) => { if (activeRequest) setOverview(data) })
      .catch((cause) => { if (activeRequest) setError(cause instanceof Error ? cause.message : 'Unable to load the control center.') })
      .finally(() => { if (activeRequest) setLoading(false) })
    return () => { activeRequest = false }
  }, [])
  const counts = overview?.counts ?? { leads: 0, students: 0, questions: 0, products: 0 }
  const statCards = [
    { label: 'Total leads', value: counts.leads, context: 'CRM pipeline', icon: Users, tint: 'text-accent' },
    { label: 'Active students', value: counts.students, context: 'Learning platform', icon: Activity, tint: 'text-primary' },
    { label: 'Question bank', value: counts.questions, context: 'Practice content', icon: ClipboardList, tint: 'text-chart-3' },
    { label: 'Catalog items', value: counts.products, context: 'Books & products', icon: BookOpen, tint: 'text-chart-4' },
  ]
  return <RoleGate><main suppressHydrationWarning className="min-h-dvh bg-background text-foreground"><div className="mx-auto max-w-[1500px] px-5 py-6 sm:px-8 lg:px-12">
    <header className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="brand-mark flex h-11 w-11 items-center justify-center rounded-xl"><img src="/brand/eleviq-logo.png" alt="ELEVIQ" className="h-9 w-9 object-contain" /></div><div><p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">ELEVIQ / OPS</p><h1 className="text-xl font-semibold tracking-tight">Control center</h1></div></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" aria-label="Refresh admin overview" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'animate-spin' : ''} /> Refresh</Button><Button variant="ghost" size="sm" aria-label="Sign out of admin console" onClick={() => void blink.auth.signOut()}><LogOut /> Sign out</Button></div></header>
    <div className="grid gap-10 py-9 lg:grid-cols-[220px_1fr]"><aside className="space-y-1"><p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>{modules.map(({ key, label, icon: Icon }) => <button key={key} type="button" aria-pressed={active === key} aria-label={`Open ${label} module`} onClick={() => setActive(key)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${active === key ? 'bg-secondary font-semibold text-primary' : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'}`}><Icon className="h-4 w-4" />{label}</button>)}<div className="mt-8 rounded-xl border border-border bg-card/50 p-4"><ShieldCheck className="mb-3 h-5 w-5 text-accent" /><p className="text-xs font-semibold">Restricted area</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Admin access is monitored and protected.</p></div></aside>
    <section className="min-w-0"><div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{active === 'overview' ? 'System overview' : `${active} module`}</p><h2 className="mt-2 font-serif text-4xl tracking-tight sm:text-5xl">Run the platform.</h2><p className="mt-3 max-w-xl text-sm text-muted-foreground">A clear view of the people, content, and systems powering ELEVIQ Prep.</p></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-chart-3" /> Live workspace</div></div>
    {error && <div role="alert" className="mb-6 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void load()}>Try again</Button></div>}
    {loading ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{statCards.map((card) => <Card key={card.label} className="h-36 animate-pulse"><CardContent className="h-full p-5"><div className="h-3 w-24 rounded bg-secondary" /><div className="mt-7 h-8 w-16 rounded bg-secondary" /></CardContent></Card>)}</div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{statCards.map(({ label, value, context, icon: Icon, tint }) => <Card key={label} className="group border-border/80 bg-card/70 transition-all hover:-translate-y-1 hover:shadow-lg"><CardContent className="p-5"><div className="flex items-start justify-between"><div className={`rounded-lg bg-secondary p-2 ${tint}`}><Icon className="h-4 w-4" /></div><ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" /></div><p className="mt-5 text-sm text-muted-foreground">{label}</p><div className="mt-1 flex items-baseline gap-2"><span className="text-3xl font-semibold tracking-tight">{value.toLocaleString()}</span><span className="text-xs text-chart-3">tracked</span></div><p className="mt-1 text-xs text-muted-foreground">{context}</p></CardContent></Card>)}</div>}
    <div className="mt-8 grid gap-5 xl:grid-cols-[1.25fr_1fr]"><Card><CardHeader className="flex-row items-center justify-between border-b border-border"><CardTitle>Recent activity</CardTitle><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">AUDIT LOG</span></CardHeader><CardContent className="p-0">{overview?.recent?.auditLogs?.length ? overview.recent.auditLogs.map((item, i) => <div key={item.id ?? i} className="flex items-center gap-3 border-b border-border/60 px-6 py-4 last:border-0"><div className="rounded-full bg-secondary p-2"><Database className="h-3.5 w-3.5 text-accent" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.action ?? 'System event'}</p><p className="text-xs text-muted-foreground">{item.resourceType ?? 'ELEVIQ system'} · {item.result ?? 'recorded'}</p></div><span className="text-xs text-muted-foreground">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recently'}</span></div>) : <div className="p-8 text-center text-sm text-muted-foreground">No activity recorded yet.</div>}</CardContent></Card><Card><CardHeader><CardTitle>System health</CardTitle></CardHeader><CardContent><div className="flex items-center gap-3 rounded-xl bg-secondary/70 p-4"><CheckCircle2 className="h-5 w-5 text-chart-3" /><div><p className="text-sm font-semibold">{overview?.health?.status ?? 'Operational'}</p><p className="text-xs text-muted-foreground">{overview?.health?.message ?? 'Core services are responding normally.'}</p></div></div><div className="mt-6 grid grid-cols-2 gap-3"><Button variant="outline" className="justify-start" onClick={() => setActive('leads')}><Users /> Review leads</Button><Button variant="outline" className="justify-start" onClick={() => setActive('content')}><ClipboardList /> Manage content</Button></div></CardContent></Card></div>
    <AdminModuleView active={active} overview={overview} />
    </section></div></div></main></RoleGate>
}
