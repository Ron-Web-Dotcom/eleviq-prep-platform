import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock3, Link2, LoaderCircle, UserRound, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { createGoogleCalendarEvent, getGoogleCalendarStatus } from '@/lib/google-calendar-api'
import { GoogleCalendarEvents } from '@/components/GoogleCalendarEvents'
import { createScheduledSession, fetchSchedulePeople, fetchScheduledSessions, syncScheduledSessionCalendar, type SchedulePerson, type ScheduledSession } from '@/lib/scheduling-api'

const pad = (value: number) => String(value).padStart(2, '0')
const localDate = new Date()
const defaultDate = `${localDate.getFullYear()}-${pad(localDate.getMonth() + 1)}-${pad(localDate.getDate())}`
const defaultTime = `${pad(Math.min(23, localDate.getHours() + 1))}:00`
const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
const formatDateTime = (value: string) => new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const displayName = (person: SchedulePerson | undefined, fallback: string) => person?.displayName || person?.email || fallback

export function TutorScheduleWorkspace({ onClose }: { onClose: () => void }) {
  const [students, setStudents] = useState<SchedulePerson[]>([])
  const [tutors, setTutors] = useState<SchedulePerson[]>([])
  const [sessions, setSessions] = useState<ScheduledSession[]>([])
  const [studentId, setStudentId] = useState('')
  const [tutorId, setTutorId] = useState('')
  const [date, setDate] = useState(defaultDate)
  const [startTime, setStartTime] = useState(defaultTime)
  const [duration, setDuration] = useState('60')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [calendarConnected, setCalendarConnected] = useState<boolean | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [people, booked, status] = await Promise.all([fetchSchedulePeople(), fetchScheduledSessions(), getGoogleCalendarStatus()])
      setStudents(people.students || [])
      setTutors(people.tutors || [])
      setSessions(booked)
      setCalendarConnected(Boolean(status.connected))
      if (!studentId && people.students?.[0]) setStudentId(people.students[0].id)
      if (!tutorId && people.tutors?.[0]) setTutorId(people.tutors[0].id)
    } catch (error) {
      toast.error('Scheduling workspace could not load', { description: error instanceof Error ? error.message : 'Please try again.' })
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const bookSession = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!studentId || !tutorId) return toast.error('Choose both a student and a tutor.')
    const startsAt = new Date(`${date}T${startTime}:00`)
    const endsAt = new Date(startsAt.getTime() + Number(duration) * 60 * 1000)
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return toast.error('Choose a valid date and time.')
    setSaving(true)
    try {
      const response = await createScheduledSession({ studentId, tutorId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), timezone })
      let saved = response.session
      if (calendarConnected && (saved.studentEmail || saved.tutorEmail)) {
        try {
          const calendar = await createGoogleCalendarEvent({ summary: `ELEVIQ tutoring · ${saved.studentName || 'Student'}`, description: `ELEVIQ tutoring session with ${saved.tutorName || 'your tutor'}.`, startsAt: saved.startsAt, endsAt: saved.endsAt, timezone: saved.timezone, attendeeEmails: [saved.studentEmail, saved.tutorEmail].filter((email): email is string => Boolean(email)) })
          if (calendar.event?.id) saved = (await syncScheduledSessionCalendar(saved.id, calendar.event.id)).session
          toast.success('Session booked and added to Google Calendar', { description: 'The tutoring session is now visible in the schedule.' })
        } catch (calendarError) {
          toast.warning('Session booked, but Google Calendar did not sync', { description: calendarError instanceof Error ? calendarError.message : 'Connect Google Calendar and try again.' })
        }
      } else {
        toast.success('Tutoring session booked', { description: 'Connect Google Calendar to add it to the connected calendar.' })
      }
      setSessions(current => [saved, ...current])
    } catch (error) {
      toast.error('Session was not booked', { description: error instanceof Error ? error.message : 'Please try again.' })
    } finally { setSaving(false) }
  }

  return <div className="max-h-[90vh] overflow-y-auto p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">Tutoring operations</p><h2 className="mt-2 font-serif text-3xl text-primary">Book a student session</h2><p className="mt-2 max-w-xl text-sm text-muted-foreground">Choose a learner, assign a tutor, and place the session on the connected Google Calendar.</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-primary" aria-label="Close scheduling workspace"><X className="h-5 w-5" /></button></div><div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]"><Card className="border-primary/15"><CardContent className="p-5"><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-accent" /><p className="font-semibold text-primary">New tutoring session</p></div><form className="mt-5 space-y-4" onSubmit={bookSession}><label className="block text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Student<select required value={studentId} onChange={event => setStudentId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:ring-2 focus:ring-ring/30"><option value="">Choose a student</option>{students.map(student => <option key={student.id} value={student.id}>{displayName(student, 'Student')}{student.programType ? ` · ${student.programType}` : ''}</option>)}</select></label><label className="block text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Tutor<select required value={tutorId} onChange={event => setTutorId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:ring-2 focus:ring-ring/30"><option value="">Choose a tutor</option>{tutors.map(tutor => <option key={tutor.id} value={tutor.id}>{tutor.displayName || tutor.email || 'Tutor'}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-3"><label className="block text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Date<input required type="date" value={date} onChange={event => setDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:ring-2 focus:ring-ring/30" /></label><label className="block text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Start time<input required type="time" value={startTime} onChange={event => setStartTime(event.target.value)} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:ring-2 focus:ring-ring/30" /></label><label className="block text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Minutes<select value={duration} onChange={event => setDuration(event.target.value)} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:ring-2 focus:ring-ring/30"><option value="30">30</option><option value="60">60</option><option value="90">90</option><option value="120">120</option></select></label></div><div className="flex items-start gap-2 rounded-xl bg-secondary/60 p-3 text-xs leading-5 text-muted-foreground"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />Timezone: {timezone}. {calendarConnected ? 'Google Calendar is connected and will receive new sessions.' : 'Google Calendar is not connected yet; the session will still be saved in ELEVIQ.'}</div><Button type="submit" disabled={saving || loading || !students.length || !tutors.length} className="w-full bg-primary text-primary-foreground">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}{saving ? 'Booking session…' : 'Book session'}</Button></form></CardContent></Card><Card className="border-primary/15 bg-secondary/20"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Upcoming tutoring</p><p className="mt-1 text-sm text-muted-foreground">ELEVIQ sessions booked for your students.</p></div><UserRound className="h-5 w-5 text-accent" /></div>{loading ? <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Loading sessions…</div> : sessions.length ? <div className="mt-5 space-y-2">{sessions.slice(0, 8).map(session => <div key={session.id} className="rounded-xl border border-border/70 bg-card p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-primary">{session.studentName || 'Student'}</p><p className="mt-1 text-xs text-muted-foreground">with {session.tutorName || 'Tutor'}</p></div>{session.calendarSyncStatus === 'synced' ? <CheckCircle2 className="h-4 w-4 text-chart-3" /> : <Link2 className="h-4 w-4 text-muted-foreground" />}</div><p className="mt-2 text-xs text-muted-foreground">{formatDateTime(session.startsAt)} · {session.timezone}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-accent">{session.calendarSyncStatus === 'synced' ? 'Google Calendar synced' : 'ELEVIQ only'}</p></div>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">No sessions booked yet.</div>}</CardContent></Card><GoogleCalendarEvents compact /></div><p className="mt-5 text-center text-[11px] leading-5 text-muted-foreground">To enable Google Calendar sync, connect the scheduling account in Project &gt; Dashboard &gt; Connectors.</p></div>
}
