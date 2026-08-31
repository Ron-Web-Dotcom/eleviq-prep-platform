import { useState } from 'react'
import { Activity, ArrowUp, BookOpenCheck, CalendarDays, Clipboard, LoaderCircle, Sparkles, UsersRound, X } from 'lucide-react'
import { toast } from 'sonner'
import type { AdminOverview } from '@/lib/admin-api'
import { askAdminAssistant } from '@/lib/admin-ai-api'

const suggestions = [
  { label: 'What needs attention right now?', icon: Activity },
  { label: 'Which students need intervention?', icon: UsersRound },
  { label: 'Summarize tutoring operations.', icon: CalendarDays },
  { label: 'What question-bank gaps should I fix?', icon: BookOpenCheck },
]

const metric = (value: number | string | undefined, suffix = '') => `${Number(value || 0)}${suffix}`

export function AdminOpsAssistant({ range, overview, onOpenTesting, onOpenTutoring, onOpenStudents, onOpenSecurity }: { range: string; overview?: AdminOverview | null; onOpenTesting?: () => void; onOpenTutoring?: () => void; onOpenStudents?: () => void; onOpenSecurity?: () => void }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const lastSubmittedPrompt = useState({ value: '', at: 0 })[0]

  const ask = async (value = question) => {
    const prompt = value.trim()
    if (!prompt || loading) return
    const now = Date.now()
    if (lastSubmittedPrompt.value === prompt && now - lastSubmittedPrompt.at < 1500) return
    lastSubmittedPrompt.value = prompt
    setLoading(true)
    try {
      setAnswer(await askAdminAssistant(prompt, range))
      setQuestion('')
    } catch (error) {
      toast.error('The operations assistant is unavailable.', { description: error instanceof Error ? error.message : 'Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const copyAnswer = async () => {
    if (!answer) return
    try {
      await navigator.clipboard.writeText(answer)
      toast.success('Assistant readout copied')
    } catch (error) {
      toast.error('Could not copy the readout.', { description: error instanceof Error ? error.message : 'Select the text and copy it manually.' })
    }
  }

  return <section id="admin-assistant" aria-labelledby="admin-assistant-title"><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">AI operations</p><h2 id="admin-assistant-title" className="mt-1 font-serif text-2xl text-primary sm:text-3xl">Ask the ELEVIQ operations assistant</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Ask about the live dashboard. The assistant compares students, tutoring, academics, commerce, and security data, then gives you a practical next step without inventing missing metrics.</p></div><div className="rounded-2xl border border-primary/15 bg-primary p-5 shadow-md sm:p-6"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><div className="rounded-xl bg-primary-foreground/10 p-2.5 text-primary-foreground"><Sparkles className="h-5 w-5" /></div><div><p className="font-semibold text-primary-foreground">ELEVIQ Copilot</p><p className="mt-1 text-xs leading-5 text-primary-foreground/70">Live operational context · {range.replace('_', ' ')}</p></div></div><span className="rounded-full border border-primary-foreground/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground/70">Protected admin data</span></div><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{[[metric(overview?.performance?.averageReadiness, '%'), 'Avg readiness', onOpenStudents], [metric(overview?.performance?.intervention), 'Intervention', onOpenStudents], [metric(overview?.tutoring?.today), 'Sessions today', onOpenTutoring], [metric(overview?.testing?.activeQuestions), 'Active questions', onOpenTesting]].map(([value, label, action]) => <button type="button" key={String(label)} onClick={action as (() => void) | undefined} className="rounded-xl bg-primary-foreground/10 p-3 text-left transition-colors hover:bg-primary-foreground/15"><p className="font-mono text-lg font-semibold text-accent">{String(value)}</p><p className="mt-1 text-[10px] uppercase tracking-wider text-primary-foreground/60">{String(label)}</p></button>)}</div>{answer && <div className="mt-5 rounded-xl bg-primary-foreground/10 p-4"><div className="mb-3 flex items-center justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary-foreground/65">Assistant readout</p><div className="flex gap-1"><button type="button" onClick={() => void copyAnswer()} className="rounded-lg p-2 text-primary-foreground/70 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground" aria-label="Copy assistant readout"><Clipboard className="h-4 w-4" /></button><button type="button" onClick={() => setAnswer('')} className="rounded-lg p-2 text-primary-foreground/70 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground" aria-label="Clear assistant readout"><X className="h-4 w-4" /></button></div></div><p className="whitespace-pre-wrap text-sm leading-6 text-primary-foreground">{answer}</p></div>}<div className="mt-5 grid gap-2 sm:grid-cols-2">{suggestions.map(({ label, icon: Icon }) => <button type="button" key={label} onClick={() => void ask(label)} disabled={loading} className="flex items-center gap-2 rounded-xl border border-primary-foreground/20 px-3 py-2.5 text-left text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10 disabled:opacity-50"><Icon className="h-3.5 w-3.5 shrink-0 text-accent" />{label}</button>)}</div><form className="mt-4 flex items-end gap-2 rounded-xl bg-card p-2" onSubmit={event => { event.preventDefault(); void ask() }}><textarea value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void ask() } }} rows={2} placeholder="Ask what to prioritize, which students need help, or where tutoring and testing need attention…" className="min-h-12 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground" aria-label="Ask operations assistant" disabled={loading} /><button type="submit" disabled={loading || !question.trim()} className="rounded-lg bg-primary p-2.5 text-primary-foreground transition-transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-50" aria-label="Ask assistant">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}</button></form><p className="mt-3 text-[10px] text-primary-foreground/60">Press Ctrl/⌘ + Enter to ask. AI guidance is operational support, not a substitute for reviewing the underlying records.</p></div></section>
}
