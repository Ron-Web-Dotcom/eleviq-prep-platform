import { useEffect, useState } from 'react'
import { CalendarDays, Clock3, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { fetchMyScheduledSessions, type ScheduledSession } from '@/lib/scheduling-api'

export function StudentScheduleCard() {
  const [sessions, setSessions] = useState<ScheduledSession[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { void fetchMyScheduledSessions().then(setSessions).catch(error => toast.error('Your tutoring schedule could not load', { description: error instanceof Error ? error.message : 'Please try again.' })).finally(() => setLoading(false)) }, [])
  return <Card className="border-primary/15 bg-card/80"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent">ELEVIQ tutoring</p><h3 className="mt-1 font-serif text-2xl text-primary">Your upcoming sessions</h3><p className="mt-1 text-xs text-muted-foreground">Sessions booked by your tutor appear here.</p></div><CalendarDays className="h-5 w-5 text-accent" /></div>{loading ? <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Loading your schedule…</div> : sessions.length ? <div className="mt-5 space-y-2">{sessions.slice(0, 5).map(session => <div key={session.id} className="rounded-xl border border-border/70 bg-background p-3"><p className="text-sm font-semibold text-primary">Tutoring session with {session.tutorName || 'your tutor'}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5 text-accent" />{new Date(session.startsAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {session.timezone}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-accent">{session.status}</p></div>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-border bg-secondary/25 p-5 text-center text-sm text-muted-foreground">No tutoring sessions have been booked for you yet.</div>}</CardContent></Card>
}
