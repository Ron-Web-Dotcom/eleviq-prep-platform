import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Activity, AlertCircle, ArrowDownRight, ArrowUpRight, Bell, BookOpen, CalendarDays, CheckCircle2,
  ChevronRight, ClipboardList, Database, DollarSign, FileText, HeartPulse, LayoutDashboard, LogOut,
  Mail, Menu, MessageCircle, Package, RefreshCw, Search, ShieldAlert, ShieldCheck, ShoppingBag, Sparkles, Users, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { RoleGate } from '@/components/AuthGate'
import { AdminOpsAssistant } from '@/components/AdminOpsAssistant'
import { ChatBox } from '@/components/ChatBox'
import { blink } from '@/blink/client'
import { fetchAdminOverview, fetchAdminSearch, fetchAdminLockouts, sendTemporaryPassword, type AdminOverview, type AdminSearchResult, type AdminLockout } from '@/lib/admin-api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/admin')({
  head: () => ({ meta: [{ title: 'Admin Control Center · ELEVIQ Prep' }, { name: 'description', content: 'ELEVIQ Prep operations command center for authorized administrators.' }] }),
  component: AdminConsole,
})

type RangeKey = 'today' | 'yesterday' | '7d' | '30d' | 'this_month' | 'last_month' | 'this_year'
const ranges: Array<{ key: RangeKey; label: string }> = [
  { key: 'today', label: 'Today' }, { key: 'yesterday', label: 'Yesterday' }, { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' }, { key: 'this_month', label: 'This month' }, { key: 'last_month', label: 'Last month' }, { key: 'this_year', label: 'This year' },
]
const navGroups = [
  { label: 'Overview', items: [{ label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'CRM', items: [{ label: 'Leads', icon: Users }, { label: 'Students', icon: HeartPulse }, { label: 'Customers', icon: Users }] },
  { label: 'Tutoring', items: [{ label: 'Schedule', icon: CalendarDays }, { label: 'Tutors', icon: Users }, { label: 'Programs', icon: ClipboardList }, { label: 'Sessions', icon: CalendarDays }] },
  { label: 'Academics', items: [{ label: 'Question Bank', icon: BookOpen }, { label: 'Tests', icon: FileText }, { label: 'Performance', icon: Activity }, { label: 'Remediation', icon: Sparkles }] },
  { label: 'Store & Finance', items: [{ label: 'Books & Products', icon: Package }, { label: 'Orders', icon: ShoppingBag }, { label: 'Inventory', icon: Package }, { label: 'Payments', icon: DollarSign }] },
  { label: 'Communication', items: [{ label: 'Messages', icon: MessageCircle }, { label: 'Notifications', icon: Bell }] },
  { label: 'Administration', items: [{ label: 'Security Center', icon: ShieldCheck }, { label: 'Audit Logs', icon: Database }, { label: 'Settings', icon: ClipboardList }] },
]

const number = (value: unknown) => Number(value || 0)
const money = (cents: number | undefined) => `$${((cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const when = (date?: string) => date ? new Date(date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Recently'

function MetricCard({ label, value, detail, icon: Icon, href, tone = 'text-primary' }: { label: string; value: string; detail: string; icon: typeof Users; href: string; tone?: string }) {
  return <Card className="group border-border/80 bg-card/80 transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg"><CardContent className="p-5"><div className="flex items-start justify-between"><div className={`rounded-xl bg-secondary p-2.5 ${tone}`}><Icon className="h-4 w-4" /></div><a href={href} aria-label={`View ${label}`} className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-primary group-hover:opacity-100"><ArrowUpRight className="h-4 w-4" /></a></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tracking-tight text-primary">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>
}

function SectionHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }) {
  return <div className="mb-4 flex items-start justify-between gap-3 sm:items-end"><div className="min-w-0"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">{eyebrow}</p><h2 className="mt-1 font-serif text-2xl text-primary sm:text-3xl">{title}</h2></div>{action && <button type="button" className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:text-accent">{action}<ChevronRight className="h-3.5 w-3.5" /></button>}</div>
}

function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{text}</div> }

function AdminSidebar({ active, onSelect, open, onClose }: { active: string; onSelect: (label: string) => void; open: boolean; onClose: () => void }) {
  return <aside className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-background transition-transform duration-200 md:relative md:z-0 md:w-64 md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}><div className="flex h-full flex-col"><div className="flex h-20 shrink-0 items-center justify-between border-b border-border px-5"><div className="flex items-center gap-3"><div className="brand-mark flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg"><img src="/brand/eleviq-logo.png" alt="ELEVIQ Prep" className="h-full w-full object-contain" /></div><div><p className="font-mono text-[9px] uppercase tracking-[0.2em] text-accent">ELEVIQ / OPS</p><p className="text-sm font-semibold text-primary">Control center</p></div></div><button type="button" onClick={onClose} className="rounded-md p-2 text-muted-foreground hover:bg-secondary md:hidden" aria-label="Close admin navigation"><X className="h-4 w-4" /></button></div><nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">{navGroups.map(group => <div key={group.label} className="mb-5"><p className="mb-2 px-3 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{group.label}</p>{group.items.map(item => <button type="button" key={item.label} onClick={() => { onSelect(item.label); onClose() }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${active === item.label ? 'bg-secondary font-semibold text-primary' : 'text-muted-foreground hover:bg-secondary/70 hover:text-primary'}`}><item.icon className="h-4 w-4 shrink-0" />{item.label}</button>)}</div>)}</nav><div className="shrink-0 border-t border-border p-3"><div className="mb-2 flex items-center gap-3 rounded-lg bg-secondary/60 px-3 py-2.5"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">A</div><div className="min-w-0"><p className="truncate text-xs font-semibold text-primary">ELEVIQ Admin</p><p className="truncate text-[10px] text-muted-foreground">Authorized workspace</p></div></div><button type="button" onClick={() => void blink.auth.signOut()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary hover:text-primary"><LogOut className="h-4 w-4" /> Sign out</button></div></div></aside>
}

function HealthStrip({ health }: { health: AdminOverview['health'] }) {
  const services = [['Platform', health?.status], ['Database', health?.database], ['Email', health?.email], ['Payments', health?.payments], ['Store', health?.store], ['Security', health?.security]]
  return <Card className="border-border/80 bg-card/70"><CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4"><span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">System status</span>{services.map(([name, status]) => <button type="button" key={name} onClick={() => toast.info(`${name} status`, { description: status ? `${status}. Checked by the protected admin service.` : 'This service check has no data yet.' })} className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:text-accent"><span className={`h-2 w-2 rounded-full ${status ? 'bg-chart-3' : 'bg-muted-foreground/40'}`} />{name}<span className="hidden text-[10px] font-normal text-muted-foreground sm:inline">{status || 'not configured'}</span></button>)}</CardContent></Card>
}

function AdminConsole() {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [range, setRange] = useState<RangeKey>('30d')
  const [active, setActive] = useState('Dashboard')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<AdminSearchResult[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [lockouts, setLockouts] = useState<AdminLockout[]>([])
  const [lockoutLoading, setLockoutLoading] = useState(false)
  const [sendingTo, setSendingTo] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lockoutRefreshing, setLockoutRefreshing] = useState(false)
  const knownLockoutIds = useRef<Set<string>>(new Set())
  const loadLockoutsNow = useCallback(async () => {
    if (lockoutRefreshing) return
    setLockoutRefreshing(true)
    try {
      const result = await fetchAdminLockouts()
      setLockouts(result.lockouts)
    } catch (cause) {
      toast.error('Could not refresh student lockouts', { description: cause instanceof Error ? cause.message : 'Please try again.' })
    } finally {
      setLockoutRefreshing(false)
    }
  }, [lockoutRefreshing])
  const load = useCallback(async (selectedRange = range) => { setLoading(true); setError(''); try { const data = await fetchAdminOverview({ force: true, range: selectedRange }); setOverview(data); setLastUpdated(new Date()) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load the command center.') } finally { setLoading(false) } }, [range])
  useEffect(() => {
    let activeRequest = true
    const refreshOverview = async (showLoading: boolean) => {
      if (showLoading) setLoading(true)
      else setRefreshing(true)
      try {
        const data = await fetchAdminOverview({ force: true, range })
        if (activeRequest) {
          setOverview(data)
          setLastUpdated(new Date())
          setError('')
        }
      } catch (cause) {
        if (activeRequest) setError(cause instanceof Error ? cause.message : 'Unable to refresh the command center.')
      } finally {
        if (activeRequest) {
          if (showLoading) setLoading(false)
          else setRefreshing(false)
        }
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refreshOverview(false)
    }
    void refreshOverview(true)
    const interval = window.setInterval(() => { void refreshOverview(false) }, 5 * 60 * 1000)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      activeRequest = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [range])
  useEffect(() => {
    if (search.trim().length < 2) return
    let activeRequest = true
    const timer = window.setTimeout(() => {
      void fetchAdminSearch(search)
        .then(results => { if (activeRequest) setSearchResults(results) })
        .catch(() => { if (activeRequest) setSearchResults([]) })
    }, 250)
    return () => { activeRequest = false; window.clearTimeout(timer) }
  }, [search])
  useEffect(() => {
    let activeRequest = true
    const loadLockouts = async (initial = false) => {
      if (initial) setLockoutLoading(true)
      else setLockoutRefreshing(true)
      try {
        const result = await fetchAdminLockouts()
        if (activeRequest) {
          setLockouts(result.lockouts)
          result.lockouts.filter(item => item.id && !knownLockoutIds.current.has(item.id)).forEach(item => {
            knownLockoutIds.current.add(item.id!)
            toast.error('Student portal locked', { description: `${item.email || 'A student'} reached 3 failed sign-in attempts.`, duration: 10000 })
          })
        }
      } catch (cause) {
        if (activeRequest) toast.error('Could not load student lockouts', { description: cause instanceof Error ? cause.message : 'Please try again.' })
      } finally {
        if (activeRequest) {
          if (initial) setLockoutLoading(false)
          else setLockoutRefreshing(false)
        }
      }
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void loadLockouts()
    }
    void loadLockouts(true)
    const interval = window.setInterval(() => { void loadLockouts() }, 5 * 60 * 1000)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      activeRequest = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const handleTemporaryPassword = async (email: string) => {
    setSendingTo(email)
    try {
      await sendTemporaryPassword(email)
      toast.success('Temporary password sent', { description: `A one-time password was sent to ${email}.` })
      const result = await fetchAdminLockouts()
      setLockouts(result.lockouts)
    } catch (cause) {
      toast.error('Temporary password was not sent', { description: cause instanceof Error ? cause.message : 'Please try again.' })
    } finally { setSendingTo('') }
  }
  const counts = overview?.counts
  const attention = overview?.attention
  const activeAlerts = (attention?.failedPayments || 0) + (attention?.pastDuePayments || 0) + (attention?.followUps || 0) + (attention?.lowReadiness || 0) + (attention?.securityEvents || 0) + lockouts.length
  const handleNavSelect = (label: string) => {
    setActive(label)
    const targets: Record<string, string> = {
      Dashboard: 'business-overview', Leads: 'crm', Students: 'performance', Customers: 'crm',
      Schedule: 'tutoring', Tutors: 'tutoring', Programs: 'tutoring', Sessions: 'tutoring',
      'Question Bank': 'testing', Tests: 'testing', Performance: 'performance', Remediation: 'testing',
      'Books & Products': 'store', Orders: 'orders', Inventory: 'store', Payments: 'payments', Revenue: 'payments',
      Messages: 'admin-chat', Notifications: 'attention', 'AI Assistant': 'admin-assistant', 'Security Center': 'security', 'Audit Logs': 'activity',
    }
    const target = targets[label]
    if (target) window.setTimeout(() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
    else toast.info(`${label} workspace`, { description: 'This administrative workspace is reserved for the next module build.' })
  }
  const statCards = useMemo(() => [
    { label: 'Total revenue', value: money(overview?.business?.revenueCents), detail: 'Collected orders in range', icon: DollarSign, href: '#payments', tone: 'text-chart-3' },
    { label: 'Active students', value: String(counts?.students || 0), detail: 'Active or onboarding profiles', icon: HeartPulse, href: '#performance' },
    { label: 'New leads', value: String(counts?.newLeads || 0), detail: 'Created in selected range', icon: Users, href: '#crm', tone: 'text-accent' },
    { label: 'Book sales', value: String(overview?.bookstore?.booksSold || 0), detail: 'Paid units in range', icon: BookOpen, href: '#store', tone: 'text-chart-4' },
    { label: 'Orders', value: String(overview?.business?.orders || 0), detail: 'Orders created in range', icon: ShoppingBag, href: '#orders' },
    { label: 'Outstanding payments', value: money(overview?.business?.outstandingCents), detail: 'Failed or past-due orders', icon: AlertCircle, href: '#payments', tone: 'text-destructive' },
  ], [counts?.newLeads, counts?.students, overview])
  return <RoleGate><div className="flex min-h-dvh bg-background text-foreground"><AdminSidebar active={active} onSelect={handleNavSelect} open={mobileNav} onClose={() => setMobileNav(false)} />{mobileNav && <button type="button" aria-label="Close navigation overlay" onClick={() => setMobileNav(false)} className="fixed inset-0 z-40 bg-primary/20 md:hidden" />}<main className="min-w-0 flex-1"><header className="sticky top-0 z-30 border-b border-border bg-background/95 px-3 py-3 backdrop-blur sm:px-8 sm:py-4"><div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setMobileNav(true)} className="rounded-lg p-2 text-primary hover:bg-secondary md:hidden" aria-label="Open admin navigation"><Menu className="h-5 w-5" /></button><div className="min-w-0"><p className="truncate font-mono text-[10px] uppercase tracking-[0.22em] text-accent">Operations command center</p><div className="flex items-center gap-2"><h1 className="truncate text-xl font-semibold tracking-tight text-primary sm:text-2xl">Good morning, Admin.</h1>{refreshing && <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">Updating…</span>}{lastUpdated && !refreshing && <span className="hidden shrink-0 text-[10px] text-muted-foreground sm:inline">Live · {lastUpdated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>}</div></div></div><div className="flex shrink-0 items-center gap-1 sm:gap-2"><label className="relative hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground lg:flex"><Search className="h-4 w-4" /><input aria-label="Search admin records" placeholder="Search records" value={search} onChange={event => setSearch(event.target.value)} className="w-36 bg-transparent outline-none placeholder:text-muted-foreground/70" />{searchResults.length > 0 && <div className="absolute right-0 top-11 z-40 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg">{searchResults.map(result => <button type="button" key={`${result.type}-${result.id}`} onClick={() => { setSearch(''); setSearchResults([]); toast.info(result.title || 'Record selected', { description: `${result.type} · ${result.subtitle || 'Permission-scoped result'}` }) }} className="w-full rounded-lg px-3 py-2 text-left hover:bg-secondary"><p className="truncate text-sm font-semibold text-primary">{result.title}</p><p className="truncate text-xs text-muted-foreground">{result.type} · {result.subtitle}</p></button>)}</div>}</label><Button variant="ghost" size="icon" aria-label="Notifications" onClick={() => toast.info('Notifications', { description: activeAlerts ? `${activeAlerts} items need review, including ${lockouts.length} locked student portal${lockouts.length === 1 ? '' : 's'}.` : 'No new alerts.' })}><Bell className="h-4 w-4" />{lockouts.length > 0 && <span className="absolute ml-5 mt-[-18px] flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">{lockouts.length}</span>}</Button><Button variant="outline" size="sm" aria-label="Refresh dashboard data" onClick={() => { void load(); void loadLockoutsNow() }} disabled={loading || refreshing}><RefreshCw className={loading || refreshing ? 'animate-spin' : ''} /><span className="hidden sm:inline">Refresh</span></Button><Button variant="ghost" size="sm" aria-label="Sign out" onClick={() => void blink.auth.signOut()}><LogOut className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Sign out</span></Button></div></div></header><div className="mx-auto max-w-[1500px] space-y-8 px-3 py-5 sm:space-y-10 sm:px-8 sm:py-8 lg:px-12"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div className="min-w-0"><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">ELEVIQ / OPS</p><h2 className="mt-2 font-serif text-4xl tracking-tight text-primary sm:text-5xl">Run the platform.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Actionable visibility across business performance, student success, tutoring operations, commerce, academics, and security.</p></div><label className="flex w-full items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-primary sm:w-auto"><CalendarDays className="h-4 w-4 shrink-0 text-accent" /><span className="sr-only">Dashboard date range</span><select value={range} onChange={event => { const next = event.target.value as RangeKey; setRange(next); void load(next) }} className="min-w-0 flex-1 bg-transparent outline-none sm:flex-none">{ranges.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label></div>{error && <div role="alert" className="flex flex-col justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive sm:flex-row sm:items-center"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void load()}>Retry</Button></div>}<HealthStrip health={overview?.health} /><section aria-labelledby="business-overview"><SectionHeading eyebrow="Business overview" title="The numbers that move ELEVIQ" action="View revenue" /><div id="business-overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{loading ? Array.from({ length: 6 }, (_, index) => <Card key={index} className="h-40 animate-pulse"><CardContent className="p-5"><div className="h-8 w-8 rounded-xl bg-secondary" /><div className="mt-6 h-7 w-24 rounded bg-secondary" /></CardContent></Card>) : statCards.map(card => <MetricCard key={card.label} {...card} />)}</div></section><section id="attention" aria-labelledby="attention"><SectionHeading eyebrow="Priority queue" title="Needs your attention" action="Review all" /><Card className="border-border/80"><CardContent className="p-0">{loading ? <div className="p-6 text-sm text-muted-foreground">Loading protected alerts…</div> : activeAlerts === 0 ? <div className="flex items-center gap-3 p-6"><CheckCircle2 className="h-5 w-5 text-chart-3" /><div><p className="font-semibold text-primary">Nothing needs immediate attention</p><p className="text-sm text-muted-foreground">The command center found no failed payments, due follow-ups, low-readiness profiles, or security events in the available data.</p></div></div> : <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">{attention?.securityEvents ? <AlertTile severity="Critical" title="Security events" detail={`${attention.securityEvents} recorded event${attention.securityEvents === 1 ? '' : 's'}`} icon={ShieldAlert} /> : null}{attention?.failedPayments || attention?.pastDuePayments ? <AlertTile severity="High" title="Payment review" detail={`${(attention.failedPayments || 0) + (attention.pastDuePayments || 0)} payment issue${(attention.failedPayments || 0) + (attention.pastDuePayments || 0) === 1 ? '' : 's'}`} icon={DollarSign} /> : null}{attention?.lowReadiness ? <AlertTile severity="Medium" title="Student intervention" detail={`${attention.lowReadiness} profile${attention.lowReadiness === 1 ? '' : 's'} below current readiness criteria`} icon={HeartPulse} /> : null}{attention?.followUps ? <AlertTile severity="Medium" title="Lead follow-ups" detail={`${attention.followUps} lead${attention.followUps === 1 ? '' : 's'} due for contact`} icon={Mail} /> : null}</div>}</CardContent></Card></section><div className="grid gap-10 xl:grid-cols-[1.2fr_0.8fr]"><section id="performance" aria-labelledby="student-performance"><SectionHeading eyebrow="Student success" title="Student performance" action="View analytics" /><Card><CardContent className="p-5"><div className="grid gap-4 sm:grid-cols-3"><MiniStat label="Average readiness" value={`${overview?.performance?.averageReadiness || 0}%`} /><MiniStat label="Exit ready" value={String(overview?.performance?.exitReady || 0)} /><MiniStat label="Intervention" value={String(overview?.performance?.intervention || 0)} /></div><div className="mt-6 rounded-xl bg-secondary/60 p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-primary">ELEVIQ Educational Readiness Indicator</p><p className="mt-1 text-xs text-muted-foreground">A configurable educational signal — not a guarantee of exam results.</p></div><Activity className="h-5 w-5 text-accent" /></div><div className="mt-5 h-3 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.min(100, overview?.performance?.averageReadiness || 0)}%` }} /></div><div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>Needs improvement</span><span>Exit ready threshold is configured server-side</span></div></div><div className="mt-5"><p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Top weak areas</p>{overview?.academics?.weakAreas?.length ? overview.academics.weakAreas.slice(0, 5).map(area => <div key={area.topic} className="mb-3 flex items-center gap-3"><span className="w-32 truncate text-sm font-medium text-primary">{area.topic}</span><div className="h-2 flex-1 rounded-full bg-secondary"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, number(area.percentCorrect))}%` }} /></div><span className="w-12 text-right text-xs text-muted-foreground">{number(area.percentCorrect)}%</span></div>) : <Empty text="No student answer data is available to calculate weak areas yet." />}</div></CardContent></Card></section><section id="tutoring" aria-labelledby="tutoring"><SectionHeading eyebrow="Tutoring operations" title="Keep sessions moving" action="Open schedule" /><Card><CardContent className="p-5"><div className="grid grid-cols-2 gap-3 sm:grid-cols-3"><MiniStat label="Sessions today" value={String(overview?.tutoring?.today || 0)} /><MiniStat label="In range" value={String(overview?.tutoring?.sessions || 0)} /><MiniStat label="Completed" value={String(overview?.tutoring?.completed || 0)} /><MiniStat label="Cancelled" value={String(overview?.tutoring?.cancelled || 0)} /><MiniStat label="No-shows" value={String(overview?.tutoring?.noShows || 0)} /><MiniStat label="Enrollments" value={String(overview?.tutoring?.newEnrollments || 0)} /></div><div className="mt-6 border-t border-border pt-5"><p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Program enrollment</p>{overview?.tutoring?.packages?.length ? overview.tutoring.packages.map(item => <div key={item.packageName} className="flex items-center justify-between border-b border-border/60 py-2.5 text-sm last:border-0"><span className="text-primary">{item.packageName}</span><span className="font-semibold text-primary">{number(item.activeStudents)}</span></div>) : <Empty text="No active packages or enrollments are available." />}</div></CardContent></Card></section></div><div className="grid gap-10 xl:grid-cols-2"><section id="crm" aria-labelledby="crm"><SectionHeading eyebrow="CRM" title="Lead pipeline" action="Open leads" /><Card><CardContent className="p-3 sm:p-5"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{(overview?.crm?.pipeline || []).map(stage => <button type="button" key={stage.stage} onClick={() => toast.info(`${stage.stage || 'Unknown'} leads`, { description: 'The filtered lead workspace will open when CRM routes are enabled.' })} className="min-w-0 rounded-xl border border-border bg-secondary/50 p-3 text-left transition-transform hover:-translate-y-0.5"><p className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{stage.stage || 'Unstaged'}</p><p className="mt-2 text-xl font-semibold text-primary">{number(stage.total)}</p></button>)}</div>{overview?.crm?.pipeline?.length ? null : <Empty text="No leads have been staged yet." />}<div className="mt-5 border-t border-border pt-5"><p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Follow-ups</p>{overview?.recent?.leads?.length ? overview.recent.leads.slice(0, 4).map(lead => <div key={lead.id} className="flex flex-col items-start gap-2 border-b border-border/60 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"><div className="min-w-0 w-full sm:flex-1"><p className="truncate text-sm font-semibold text-primary">{lead.name || 'Unnamed lead'}</p><p className="truncate text-xs text-muted-foreground">{lead.programInterest || 'General inquiry'} · {lead.source || 'Unknown source'}</p></div><span className="shrink-0 text-xs font-semibold text-accent">{lead.followUpAt ? when(lead.followUpAt) : lead.stage || 'New'}</span></div>) : <Empty text="No follow-ups are due in the selected data." />}</div></CardContent></Card></section><section id="store" aria-labelledby="store"><SectionHeading eyebrow="Store" title="Bookstore overview" action="View inventory" /><Card><CardContent className="p-5"><div className="grid gap-3 sm:grid-cols-3"><MiniStat label="Paid book units" value={String(overview?.bookstore?.booksSold || 0)} /><MiniStat label="Website revenue" value={money(overview?.bookstore?.websiteRevenueCents)} /><MiniStat label="Low inventory" value={String(overview?.bookstore?.lowInventory?.length || 0)} /></div><div className="mt-6 border-t border-border pt-5"><p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Top products</p>{overview?.bookstore?.topProducts?.length ? overview.bookstore.topProducts.map(item => <div key={item.productName} className="flex items-center justify-between border-b border-border/60 py-3 last:border-0"><div className="flex items-center gap-3"><div className="rounded-lg bg-secondary p-2 text-accent"><BookOpen className="h-4 w-4" /></div><span className="text-sm font-semibold text-primary">{item.productName}</span></div><span className="text-xs text-muted-foreground">{number(item.unitsSold)} units · {money(number(item.revenueCents))}</span></div>) : <Empty text="No paid product sales are available for this range." />}</div>{overview?.bookstore?.lowInventory?.length ? <div className="mt-5 rounded-xl border border-accent/30 bg-accent/10 p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Low inventory</p>{overview.bookstore.lowInventory.map(item => <div key={item.id} className="mt-2 flex justify-between text-sm text-primary"><span>{item.name}</span><span className="font-semibold">{number(item.inventoryAvailable)} remaining</span></div>)}</div> : null}</CardContent></Card></section></div><div className="grid gap-10 xl:grid-cols-2"><section id="payments" aria-labelledby="payments"><SectionHeading eyebrow="Finance" title="Payments overview" action="View payments" /><Card><CardContent className="p-5"><div className="grid gap-3 sm:grid-cols-3"><MiniStat label="Collected" value={money(overview?.payments?.collectedCents)} /><MiniStat label="Pending" value={money(overview?.payments?.pendingCents)} /><MiniStat label="Refunds" value={money(overview?.payments?.refundsCents)} /></div><div className="mt-5 flex flex-wrap gap-2 text-xs"><StatusPill label="Failed" value={overview?.payments?.failed || 0} tone="destructive" /><StatusPill label="Past due" value={overview?.payments?.pastDue || 0} tone="warning" /></div><div id="orders" className="mt-6 border-t border-border pt-5"><p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Recent orders</p>{overview?.recent?.orders?.length ? overview.recent.orders.slice(0, 5).map(order => <div key={order.id} className="flex items-center justify-between gap-3 border-b border-border/60 py-3 last:border-0"><div className="min-w-0"><p className="truncate text-sm font-semibold text-primary">{order.orderNumber || order.id}</p><p className="truncate text-xs text-muted-foreground">{order.products || 'Product details unavailable'} · {order.paymentStatus || 'pending'}</p></div><span className="shrink-0 text-xs font-semibold text-primary">{money(number(order.totalCents))}</span></div>) : <Empty text="No orders have been recorded for this range." />}</div></CardContent></Card></section><section id="testing" aria-labelledby="testing"><SectionHeading eyebrow="Academics" title="Testing & question bank" action="Open content" /><Card><CardContent className="p-5"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><MiniStat label="Questions" value={String(overview?.testing?.totalQuestions || 0)} /><MiniStat label="Active" value={String(overview?.testing?.activeQuestions || 0)} /><MiniStat label="Draft" value={String(overview?.testing?.draftQuestions || 0)} /><MiniStat label="NGN cases" value={String(overview?.testing?.ngnCases || 0)} /></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><MetricTile label="Tests created" value={overview?.testingOverview?.testsCreated || 0} /><MetricTile label="Tests completed" value={overview?.testingOverview?.testsCompleted || 0} /><MetricTile label="Average score" value={`${overview?.testingOverview?.averageScore || 0}%`} /></div><div className="mt-5 border-t border-border pt-5"><p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Most-missed questions</p>{overview?.academics?.mostMissedQuestions?.length ? overview.academics.mostMissedQuestions.slice(0, 3).map(question => <div key={question.id} className="border-b border-border/60 py-3 last:border-0"><p className="line-clamp-2 text-sm font-semibold text-primary">{question.questionText || 'Question text unavailable'}</p><p className="mt-1 text-xs text-muted-foreground">{question.topic || 'Uncategorized'} · {number(question.percentCorrect)}% correct · {number(question.attempts)} attempts</p></div>) : <Empty text="No answered-question data is available for review." />}</div></CardContent></Card></section></div><div className="grid gap-10 xl:grid-cols-2"><section id="security" aria-labelledby="security"><SectionHeading eyebrow="Security center" title="System security" action="Open audit logs" /><Card><CardContent className="p-5"><div className="flex items-center gap-3 rounded-xl bg-secondary/70 p-4"><ShieldCheck className="h-5 w-5 text-chart-3" /><div><p className="text-sm font-semibold text-primary">Monitoring active</p><p className="text-xs text-muted-foreground">Protected checks and audit events are visible only to authorized admins.</p></div></div>{lockouts.length > 0 && <div className="mt-5 rounded-xl border border-destructive/25 bg-destructive/10 p-4"><div className="flex items-start gap-3"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /><div><p className="text-sm font-semibold text-primary">Student portal lockout{lockouts.length === 1 ? '' : 's'} detected</p><p className="mt-1 text-xs leading-5 text-muted-foreground">These students reached 3 unsuccessful sign-in attempts. Send a temporary password to begin the required password update.</p></div></div><div className="mt-4 space-y-2">{lockouts.map(lockout => <div key={lockout.id || lockout.email} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-semibold text-primary">{lockout.displayName || 'Locked student'}</p><p className="truncate text-xs text-muted-foreground">{lockout.email} · {number(lockout.failedAttempts)} failed attempts</p><p className="mt-1 text-[11px] text-destructive">Locked until {when(lockout.lockedUntil)}</p></div><Button size="sm" onClick={() => void handleTemporaryPassword(lockout.email || '')} disabled={!lockout.email || sendingTo === lockout.email} className="shrink-0"><Mail className="h-4 w-4" />{sendingTo === lockout.email ? 'Sending…' : 'Send temporary password'}</Button></div>)}</div></div>}{lockoutLoading && <p className="mt-4 text-xs text-muted-foreground">Refreshing lockout alerts…</p>}<div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><MetricTile label="Security events" value={attention?.securityEvents || 0} /><MetricTile label="Locked portals" value={lockouts.length} /><MetricTile label="Failed payments" value={attention?.failedPayments || 0} /><MetricTile label="Audit events" value={overview?.recent?.auditLogs?.length || 0} /></div></CardContent></Card></section><section id="activity" aria-labelledby="activity"><SectionHeading eyebrow="Audit trail" title="Recent admin activity" action="View all logs" /><Card><CardContent className="p-5">{overview?.recent?.auditLogs?.length ? overview.recent.auditLogs.slice(0, 6).map(item => <div key={item.id} className="flex items-center gap-3 border-b border-border/60 py-3 last:border-0"><div className="rounded-full bg-secondary p-2"><Database className="h-3.5 w-3.5 text-accent" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-primary">{item.action || 'System event'}</p><p className="truncate text-xs text-muted-foreground">{item.resourceType || 'ELEVIQ system'} · {item.result || 'recorded'}</p></div><span className="shrink-0 text-xs text-muted-foreground">{when(item.createdAt)}</span></div>) : <Empty text="No admin activity has been recorded yet." />}</CardContent></Card></section></div><AdminOpsAssistant range={range} /> <AdminChatPanel overview={overview} /> <Card className="border-primary/10 bg-secondary/35"><CardContent className="flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-center"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">Quick actions</p><p className="mt-1 font-serif text-2xl text-primary">Move the next important thing forward.</p></div><div className="flex flex-wrap gap-2">{['Add lead', 'Add student', 'Create question', 'Schedule session', 'View orders'].map(label => <button type="button" key={label} onClick={() => toast.info(label, { description: 'This protected workflow is ready to connect to its admin module.' })} className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-primary transition-transform hover:-translate-y-0.5 hover:bg-background">+ {label}</button>)}</div></CardContent></Card></div></main></div></RoleGate>
}

function AlertTile({ severity, title, detail, icon: Icon }: { severity: string; title: string; detail: string; icon: typeof Users }) { return <button type="button" onClick={() => toast.info(title, { description: detail })} className="flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-left transition-transform hover:-translate-y-0.5 hover:shadow-md"><div className={`rounded-lg p-2 ${severity === 'Critical' ? 'bg-destructive/10 text-destructive' : severity === 'High' ? 'bg-accent/15 text-accent' : 'bg-secondary text-primary'}`}><Icon className="h-4 w-4" /></div><div className="min-w-0"><div className="flex items-center gap-2"><p className="text-xs font-bold uppercase tracking-wider text-primary">{title}</p><span className="text-[10px] font-semibold text-muted-foreground">{severity}</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p></div></button> }
function MiniStat({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border/70 bg-secondary/35 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold text-primary">{value}</p></div> }
function MetricTile({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl bg-secondary/60 p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold text-primary">{value}</p></div> }
function StatusPill({ label, value, tone }: { label: string; value: number; tone: 'destructive' | 'warning' }) { return <span className={`rounded-full px-3 py-1.5 font-semibold ${tone === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-accent/15 text-accent'}`}>{label}: {value}</span> }

function AdminChatPanel({ overview }: { overview: AdminOverview | null }) {
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState('')
  const students = overview?.recent?.students || []
  return <section id="admin-chat" aria-labelledby="admin-chat"><div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Stay connected</p><h2 id="admin-chat" className="mt-1 font-serif text-2xl text-primary sm:text-3xl">Message students</h2><p className="mt-2 text-sm text-muted-foreground">Communicate privately with students using text or voice notes.</p></div><button type="button" onClick={() => setOpen(value => !value)} className="rounded-lg border border-border px-3 py-2 text-xs font-bold text-primary hover:bg-secondary">{open ? 'Hide chat' : 'Open chat'}</button></div>{open ? <><Card className="mb-3"><CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center"><label htmlFor="chat-student" className="text-sm font-semibold text-primary">Student recipient</label><select id="chat-student" value={studentId} onChange={event => setStudentId(event.target.value)} className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring sm:min-w-72"><option value="">Select a student to start messaging</option>{students.map(student => <option key={student.userId || student.id} value={student.userId || ''}>{student.displayName || student.school || student.userId || 'Student profile'}</option>)}</select></CardContent></Card>{studentId ? <ChatBox recipientUserId={studentId} title="Student messages" subtitle="Private ELEVIQ teacher conversation" /> : <Card><CardContent className="p-10 text-center"><Mail className="mx-auto h-7 w-7 text-accent" /><p className="mt-3 font-semibold text-primary">Choose a student to open chat</p><p className="mt-1 text-sm text-muted-foreground">The conversation stays protected behind administrator access.</p></CardContent></Card>}</> : null}</section>
}
