import { useEffect, useState } from 'react'
import { CalendarDays, ExternalLink, Link2, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { fetchGoogleCalendarEvents, getGoogleCalendarStatus, type CalendarEvent } from '@/lib/google-calendar-api'

const eventStart = (event: CalendarEvent) => event.start?.dateTime || event.start?.date
const formatEventTime = (event: CalendarEvent) => {
  const value = eventStart(event)
  if (!value) return 'Time not listed'
  if (event.start?.date) return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function GoogleCalendarEvents({ compact = false }: { compact?: boolean }) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [connected, setConnected] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const status = await getGoogleCalendarStatus()
      setConnected(Boolean(status.connected))
      if (status.connected) setEvents(await fetchGoogleCalendarEvents(compact ? 7 : 14))
    } catch (error) {
      setConnected(false)
      toast.error('Google Calendar could not load', { description: error instanceof Error ? error.message : 'Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  return <Card className="border-primary/15 bg-card/80"><CardContent className={compact ? 'p-4' : 'p-5'}><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Google Calendar</p><h3 className="mt-1 font-serif text-2xl text-primary">{compact ? 'Upcoming events' : 'Calendar at a glance'}</h3><p className="mt-1 text-xs text-muted-foreground">{connected ? 'Synced from the connected Google account.' : 'Connect Google Calendar to see events here.'}</p></div><CalendarDays className="h-5 w-5 text-accent" /></div>{loading ? <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Loading calendar…</div> : !connected ? <div className="mt-5 rounded-xl border border-dashed border-border bg-secondary/25 p-4"><div className="flex items-start gap-3"><Link2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><p className="text-xs leading-5 text-muted-foreground">The account owner or tutor must connect Google Calendar in Project &gt; Dashboard &gt; Connectors. Once connected, scheduled tutoring sessions and upcoming events can be viewed here.</p></div></div> : events.length ? <div className="mt-5 space-y-2">{events.slice(0, compact ? 4 : 8).map(event => <div key={event.id} className="flex items-start gap-3 rounded-xl border border-border/70 bg-background p-3"><div className="mt-0.5 rounded-lg bg-secondary p-2"><CalendarDays className="h-4 w-4 text-accent" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-primary">{event.summary || 'Untitled event'}</p><p className="mt-1 text-xs text-muted-foreground">{formatEventTime(event)}</p></div>{event.htmlLink && <a href={event.htmlLink} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-primary" aria-label={`Open ${event.summary || 'calendar event'} in Google Calendar`}><ExternalLink className="h-4 w-4" /></a>}</div>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-border bg-secondary/25 p-5 text-center text-sm text-muted-foreground">No upcoming Google Calendar events.</div>}{connected && <Button type="button" variant="outline" size="sm" onClick={() => void load()} className="mt-4 bg-background text-primary">Refresh calendar</Button>}</CardContent></Card>
}
