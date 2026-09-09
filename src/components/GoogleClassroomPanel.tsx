import { useEffect, useState } from 'react'
import { BookOpen, LoaderCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { blink } from '@/blink/client'
import { createGoogleClassroomWork, fetchGoogleClassroomCourses, fetchGoogleClassroomSubmission, fetchGoogleClassroomWork, getGoogleIntegrationStatus, startGoogleIntegration, type ClassroomCourse, type ClassroomWork } from '@/lib/google-calendar-api'

export function GoogleClassroomPanel({ management = false }: { management?: boolean }) {
  const [courses, setCourses] = useState<ClassroomCourse[]>([])
  const [work, setWork] = useState<ClassroomWork[]>([])
  const [courseId, setCourseId] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'student' | 'tutor' | 'admin'>('student')
  const [connected, setConnected] = useState(false)
  const [authorized, setAuthorized] = useState(!management)
  const [shared, setShared] = useState(false)
  const [classroomEmail, setClassroomEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', workType: 'ASSIGNMENT' as 'ASSIGNMENT' | 'MATERIAL' | 'QUIZ', dueDate: '' })

  const load = async () => {
    setLoading(true)
    try {
      const status = await getGoogleIntegrationStatus()
      const sharedClassroom = Boolean(status.capabilities?.sharedClassroomAvailable)
      setShared(sharedClassroom)
      setConnected(Boolean(status.connected) || (!management && sharedClassroom)); setEmail(status.email || ''); setRole(status.role || 'student')
      setClassroomEmail(status.capabilities?.sharedClassroomEmail || '')
      if (management) {
        const access = await blink.functions.invoke('api/tutor/access', { body: {} }) as { authorized?: boolean }
        setAuthorized(Boolean(access.authorized))
      }
      if (status.connected) {
        const next = await fetchGoogleClassroomCourses(); setCourses(next)
        const selected = courseId || next[0]?.id || ''; setCourseId(selected)
        if (selected) {
          const items = await fetchGoogleClassroomWork(selected)
          if (!management) {
            await Promise.all(items.map(async item => {
              try { item.submission = await fetchGoogleClassroomSubmission(selected, item.id) } catch { /* keep coursework visible if submission access is unavailable */ }
            }))
          }
          setWork(items)
        }
      }
    } catch (error) { toast.error('Google Classroom could not load', { description: error instanceof Error ? error.message : 'Please try again.' }) }
    finally { setLoading(false) }
  }
  // Load once when the panel mounts; the refresh button intentionally reuses the same loader.
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load() }, [])
  const selectCourse = async (id: string) => { setCourseId(id); try { const items = await fetchGoogleClassroomWork(id); if (!management) await Promise.all(items.map(async item => { try { item.submission = await fetchGoogleClassroomSubmission(id, item.id) } catch { /* optional status */ } })); setWork(items) } catch (error) { toast.error('Coursework could not load', { description: error instanceof Error ? error.message : 'Please try again.' }) } }
  const connectGoogle = async () => { setConnecting(true); try { await startGoogleIntegration() } catch (error) { toast.error('Google connection could not start', { description: error instanceof Error ? error.message : 'Please try again.' }); setConnecting(false) } }
  const createWork = async (event: React.FormEvent) => { event.preventDefault(); if (!courseId || !form.title.trim()) return toast.error('Choose a course and add a title.'); setSaving(true); try { await createGoogleClassroomWork({ ...form, courseId, dueDate: form.dueDate || undefined }); toast.success('Classroom item created'); setForm({ title: '', description: '', workType: 'ASSIGNMENT', dueDate: '' }); await selectCourse(courseId) } catch (error) { toast.error('Classroom item was not created', { description: error instanceof Error ? error.message : 'Please try again.' }) } finally { setSaving(false) } }
  return <Card className="border-primary/15 bg-card/80"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Google Classroom</p><h2 className="mt-1 font-serif text-2xl text-primary">{management ? 'Manage learning materials' : 'Your classes & coursework'}</h2><p className="mt-2 text-sm text-muted-foreground">{connected ? `${management ? 'Connected teacher account' : shared ? 'Shared ELEVIQ classroom' : 'Connected account'}${(management ? email : classroomEmail || email) ? ` · ${management ? email : classroomEmail || email}` : ''} · ${role}.` : 'Connect Google to view Classroom content.'}</p></div><BookOpen className="h-5 w-5 text-accent" /></div>
    {loading ? <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Loading Classroom…</div> : !connected ? <div className="mt-5 rounded-xl border border-dashed border-border bg-secondary/30 p-5"><p className="text-sm font-semibold text-primary">Connect Google Classroom to continue</p><p className="mt-1 text-xs leading-5 text-muted-foreground">You sign in to ELEVIQ first, then Google asks which account can share Classroom, Calendar, and Meet access with this workspace.</p><Button type="button" onClick={() => void connectGoogle()} disabled={connecting} className="mt-4 bg-primary text-primary-foreground">{connecting ? 'Opening Google…' : 'Connect Google account'}</Button></div> : management && !authorized ? <div className="mt-5 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Classroom management is restricted to tutors and administrators.</div> : <><label className="mt-5 block text-xs font-bold uppercase tracking-[.12em] text-muted-foreground">Course<select value={courseId} onChange={e => void selectCourse(e.target.value)} className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-foreground"><option value="">Choose a course</option>{courses.map(course => <option key={course.id} value={course.id}>{course.name || 'Untitled course'}{course.section ? ` · ${course.section}` : ''}</option>)}</select></label>{management ? <form onSubmit={createWork} className="mt-4 space-y-3 rounded-xl bg-secondary/35 p-4"><div className="grid gap-3 sm:grid-cols-2"><input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title" className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground" /><select value={form.workType} onChange={e => setForm({ ...form, workType: e.target.value as typeof form.workType })} className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"><option value="ASSIGNMENT">Assignment</option><option value="MATERIAL">Material</option><option value="QUIZ">Quiz</option></select></div><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Instructions or description" className="min-h-20 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground" /><input type="datetime-local" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground" /><Button disabled={saving || !courseId}>{saving ? 'Creating…' : 'Create Classroom item'}</Button></form> : <div className="mt-4 space-y-2">{work.length ? work.map(item => <div key={item.id} className="rounded-xl border border-border/70 bg-background p-3"><div className="flex justify-between gap-3"><p className="text-sm font-semibold text-primary">{item.title || 'Untitled work'}</p><span className="text-[10px] font-bold uppercase text-accent">{item.submissionState || item.state || item.workType || 'Coursework'}</span></div>{item.dueDate && <p className="mt-1 text-xs text-muted-foreground">Due {item.dueDate.month}/{item.dueDate.day}/{item.dueDate.year}</p>}{!management && item.submission && <div className="mt-2 rounded-lg bg-secondary/60 p-2 text-xs text-muted-foreground"><p className="font-semibold text-primary">Submission: {item.submission.state || 'Not submitted'}{item.submission.late ? ' · Late' : ''}</p>{item.submission.assignedGrade != null && <p className="mt-1">Grade: {item.submission.assignedGrade}</p>}{item.submission.feedback && <p className="mt-1">Feedback: {item.submission.feedback}</p>}</div>}{item.eleviqTestId ? <a href={`/app/test-mode/${encodeURIComponent(item.eleviqTestId)}`} className="mt-2 inline-flex text-xs font-bold text-primary hover:text-accent">Open in ELEVIQ Test Mode</a> : item.alternateLink && <a href={item.alternateLink} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-primary hover:text-accent">Open in Classroom</a>}</div>) : <div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">No coursework returned for this course.</div>}</div>}<Button type="button" variant="outline" size="sm" onClick={() => void load()} className="mt-4 bg-background text-primary"><RefreshCw className="mr-2 h-3.5 w-3.5" />Refresh</Button></>}</CardContent></Card>
}
