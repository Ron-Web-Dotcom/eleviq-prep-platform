import { useCallback, useEffect, useRef, useState } from 'react'
import { LoaderCircle, Mic, Paperclip, Play, Send, Square, Volume2 } from 'lucide-react'
import { toast } from 'sonner'
import { blink } from '@/blink/client'
import { fetchChatMessages, sendChatMessage, type ChatMessage } from '@/lib/chat-api'

type ChatBoxProps = {
  recipientUserId?: string
  title?: string
  subtitle?: string
  compact?: boolean
}

const formatTime = (value: string) => new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
const formatDuration = (value?: number | string) => {
  const total = Number(value || 0)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export function ChatBox({ recipientUserId, title = 'ELEVIQ messages', subtitle = 'Private teacher–student communication', compact = false }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [currentUserId, setCurrentUserId] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const recordingSecondsRef = useRef(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    try {
      setMessages(await fetchChatMessages(recipientUserId))
    } catch (error) {
      toast.error('Unable to load messages.', { description: error instanceof Error ? error.message : 'Please try again.' })
    } finally {
      setLoading(false)
    }
  }, [recipientUserId])

  useEffect(() => {
    let mounted = true
    const initialLoad = async () => {
      try {
        const loaded = await fetchChatMessages(recipientUserId)
        if (mounted) setMessages(loaded)
      } catch (error) {
        if (mounted) toast.error('Unable to load messages.', { description: error instanceof Error ? error.message : 'Please try again.' })
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void initialLoad()
    const interval = window.setInterval(() => { void loadMessages() }, 5000)
    return () => {
      mounted = false
      window.clearInterval(interval)
      streamRef.current?.getTracks().forEach(track => track.stop())
    }
  }, [recipientUserId, loadMessages])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    let mounted = true
    void blink.auth.me().then(user => { if (mounted && user) setCurrentUserId(user.id) }).catch(() => undefined)
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    let mounted = true
    let unsubscribe: (() => void) | null = null
    const ids = [currentUserId, recipientUserId].filter(Boolean).sort()
    if (ids.length !== 2) return
    const channelName = `eleviq-chat-${ids.join('-')}`
    const connect = async () => {
      unsubscribe = await blink.realtime.subscribe(channelName, (event) => {
        if (!mounted || event.type !== 'chat') return
        const payload = event.data as { message?: ChatMessage }
        const incoming = payload.message
        if (!incoming) return
        setMessages(previous => previous.some(message => message.id === incoming.id) ? previous : [...previous, incoming])
      })
    }
    void connect().catch(() => undefined)
    return () => { mounted = false; unsubscribe?.() }
  }, [currentUserId, recipientUserId])

  const sendText = async () => {
    const body = draft.trim()
    if (!body || !recipientUserId || sending) return
    setSending(true)
    try {
      await sendChatMessage({ recipientUserId, messageType: 'text', body })
      setDraft('')
      await loadMessages()
    } catch (error) {
      toast.error('Message was not sent.', { description: error instanceof Error ? error.message : 'Please try again.' })
    } finally {
      setSending(false)
    }
  }

  const startRecording = async () => {
    if (!recipientUserId || !navigator.mediaDevices?.getUserMedia) {
      toast.error('Voice notes are not supported in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      recorder.ondataavailable = event => { if (event.data.size > 0) chunksRef.current.push(event.data) }
      recorder.onstop = () => { void finishRecording() }
      recorder.start()
      setRecordingSeconds(0)
      recordingSecondsRef.current = 0
      setRecording(true)
    } catch (error) {
      toast.error('Microphone access was not granted.', { description: error instanceof Error ? error.message : 'Check your browser permissions.' })
    }
  }

  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => {
      setRecordingSeconds(value => {
        const next = value + 1
        recordingSecondsRef.current = next
        return next
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [recording])

  const finishRecording = async () => {
    setRecording(false)
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    const seconds = recordingSecondsRef.current
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    chunksRef.current = []
    if (!blob.size || !recipientUserId) return
    setSending(true)
    try {
      const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' })
      const upload = await blink.storage.upload(file, `chat/voice-notes/${Date.now()}-${crypto.randomUUID()}.webm`)
      await sendChatMessage({ recipientUserId, messageType: 'voice', audioUrl: upload.publicUrl, audioDurationSeconds: seconds })
      await loadMessages()
    } catch (error) {
      toast.error('Voice note was not sent.', { description: error instanceof Error ? error.message : 'Please try again.' })
    } finally {
      setSending(false)
    }
  }

  return <section className={`flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm ${compact ? 'h-[420px]' : 'h-[560px]'}`} aria-label={title}><header className="shrink-0 border-b border-border bg-secondary/35 px-5 py-4"><div className="flex items-center justify-between gap-3"><div><p className="font-serif text-xl font-bold text-primary">{title}</p><p className="mt-1 text-xs text-muted-foreground">{subtitle}</p></div><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-chart-3"><span className="h-2 w-2 rounded-full bg-chart-3" /> Live</span></div></header><div className="min-h-0 flex-1 overflow-y-auto p-4"><div className="space-y-3">{loading ? <div className="flex items-center justify-center py-12 text-sm text-muted-foreground"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" />Loading messages…</div> : messages.length === 0 ? <div className="rounded-xl border border-dashed border-border p-8 text-center"><Volume2 className="mx-auto h-6 w-6 text-accent" /><p className="mt-3 text-sm font-semibold text-primary">Start the conversation</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Send a message or record a voice note to connect privately.</p></div> : messages.map(message => <ChatMessageBubble key={message.id} message={message} currentUserId={currentUserId} />)}<div ref={bottomRef} /></div></div><footer className="shrink-0 border-t border-border p-3"><div className="flex items-end gap-2"><button type="button" disabled={sending || recording} onClick={() => toast.info('File sharing is coming next.', { description: 'Voice notes and text messages are ready now.' })} className="rounded-lg p-2.5 text-muted-foreground hover:bg-secondary hover:text-primary disabled:opacity-50" aria-label="Attach file"><Paperclip className="h-4 w-4" /></button><textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendText() } }} disabled={sending || recording} rows={1} placeholder={recording ? 'Recording voice note…' : 'Write a message…'} className="max-h-24 min-h-10 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60" aria-label="Message text" />{recording ? <button type="button" onClick={() => recorderRef.current?.stop()} className="inline-flex items-center gap-2 rounded-lg bg-destructive px-3 py-2.5 text-xs font-bold text-destructive-foreground" aria-label="Stop recording"><Square className="h-4 w-4" />{formatDuration(recordingSeconds)}</button> : draft.trim() ? <button type="button" onClick={() => void sendText()} disabled={sending} className="rounded-lg bg-primary p-2.5 text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-50" aria-label="Send message"><Send className="h-4 w-4" /></button> : <button type="button" onClick={() => void startRecording()} disabled={sending} className="rounded-lg bg-secondary p-2.5 text-primary transition-transform hover:-translate-y-0.5 disabled:opacity-50" aria-label="Record voice note"><Mic className="h-4 w-4" /></button>}</div><p className="mt-2 px-1 text-[10px] text-muted-foreground">Enter to send · Shift + Enter for a new line · voice notes are uploaded securely</p></footer></section>
}

function ChatMessageBubble({ message, currentUserId }: { message: ChatMessage; currentUserId?: string }) {
  const mine = message.senderUserId === currentUserId
  return <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 ${mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-secondary text-primary'}`}>{message.messageType === 'voice' && message.audioUrl ? <div className="min-w-48"><div className="mb-2 flex items-center gap-2 text-xs font-semibold"><Play className="h-3.5 w-3.5" />Voice note <span className="font-mono opacity-70">{formatDuration(message.audioDurationSeconds)}</span></div><audio src={message.audioUrl} controls className="h-8 w-full" /></div> : <p className="whitespace-pre-wrap break-words text-sm leading-5">{message.body}</p>}<p className={`mt-2 text-[10px] ${mine ? 'text-primary-foreground/65' : 'text-muted-foreground'}`}>{formatTime(message.createdAt)}</p></div></div>
}
