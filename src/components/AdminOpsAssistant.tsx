import { useState } from 'react'
import { ArrowUp, LoaderCircle, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { askAdminAssistant } from '@/lib/admin-ai-api'

export function AdminOpsAssistant({ range }: { range: string }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const suggestions = ['What needs attention right now?', 'Summarize student readiness.', 'How are orders and payments performing?']

  const ask = async (value = question) => {
    if (!value.trim() || loading) return
    setLoading(true)
    try {
      setAnswer(await askAdminAssistant(value, range))
      setQuestion('')
    } catch (error) {
      toast.error('The operations assistant is unavailable.', { description: error instanceof Error ? error.message : 'Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return <section id="admin-assistant" aria-labelledby="admin-assistant-title"><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">AI operations</p><h2 id="admin-assistant-title" className="mt-1 font-serif text-2xl text-primary sm:text-3xl">Ask the ELEVIQ operations assistant</h2><p className="mt-2 text-sm text-muted-foreground">Get concise, evidence-based guidance from the current protected dashboard data. It never invents missing metrics.</p></div><div className="rounded-2xl border border-primary/15 bg-primary p-5 shadow-md sm:p-6"><div className="flex items-start gap-3"><div className="rounded-xl bg-primary-foreground/10 p-2.5 text-primary-foreground"><Sparkles className="h-5 w-5" /></div><div><p className="font-semibold text-primary-foreground">ELEVIQ Copilot</p><p className="mt-1 text-xs leading-5 text-primary-foreground/70">Live operational context · {range.replace('_', ' ')}</p></div></div>{answer && <div className="mt-5 whitespace-pre-wrap rounded-xl bg-primary-foreground/10 p-4 text-sm leading-6 text-primary-foreground">{answer}</div>}<div className="mt-5 flex flex-wrap gap-2">{suggestions.map(item => <button type="button" key={item} onClick={() => void ask(item)} disabled={loading} className="rounded-full border border-primary-foreground/20 px-3 py-2 text-left text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10 disabled:opacity-50">{item}</button>)}</div><form className="mt-4 flex items-end gap-2 rounded-xl bg-card p-2" onSubmit={event => { event.preventDefault(); void ask() }}><textarea value={question} onChange={event => setQuestion(event.target.value)} rows={1} placeholder="Ask about the business, students, tutoring, payments, or security…" className="min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground" aria-label="Ask operations assistant" disabled={loading} /><button type="submit" disabled={loading || !question.trim()} className="rounded-lg bg-primary p-2.5 text-primary-foreground disabled:opacity-50" aria-label="Ask assistant">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}</button></form><p className="mt-3 text-[10px] text-primary-foreground/60">AI guidance is operational support, not a substitute for reviewing the underlying records.</p></div></section>
}
