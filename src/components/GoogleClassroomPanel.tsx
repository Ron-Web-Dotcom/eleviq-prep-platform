import { useEffect, useState } from 'react'
import { BookOpen, LoaderCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { blink } from '@/blink/client'

type ClassroomCourse = { id?: string; name?: string; section?: string; descriptionHeading?: string; courseState?: string; enrollmentCode?: string }

export function GoogleClassroomPanel() {
  const [courses, setCourses] = useState<ClassroomCourse[]>([])
  const [loading, setLoading] = useState(true)
  const load = async () => {
    setLoading(true)
    try {
      const response = await blink.functions.invoke('api/google/classroom/courses', { body: {} }) as { courses?: unknown[] }
      setCourses(Array.isArray(response.courses) ? response.courses as ClassroomCourse[] : [])
    } catch (error) {
      toast.error('Google Classroom could not load', { description: error instanceof Error ? error.message : 'Connect Google first, then try again.' })
    } finally { setLoading(false) }
  }
  // The loader intentionally updates local state after the async backend request.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [])
  return <Card className="border-primary/15 bg-card/80"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Google Classroom</p><h2 className="mt-1 font-serif text-2xl text-primary">Your connected classes</h2><p className="mt-2 text-sm text-muted-foreground">Courses from the shared Google account appear here after authorization.</p></div><BookOpen className="h-5 w-5 text-accent" /></div>{loading ? <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin" />Loading classes…</div> : courses.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2">{courses.slice(0, 8).map(course => <div key={course.id || course.name} className="rounded-xl border border-border/70 bg-background p-4"><p className="font-semibold text-primary">{course.name || 'Untitled class'}</p><p className="mt-1 text-xs text-muted-foreground">{course.section || course.descriptionHeading || course.courseState || 'Classroom course'}</p>{course.enrollmentCode && <p className="mt-2 font-mono text-[10px] text-accent">Code: {course.enrollmentCode}</p>}</div>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-border bg-secondary/25 p-5 text-center text-sm text-muted-foreground">No Google Classroom courses were returned.</div>}<Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading} className="mt-4 bg-background text-primary"><RefreshCw className="mr-2 h-3.5 w-3.5" />Refresh classes</Button></CardContent></Card>
}
