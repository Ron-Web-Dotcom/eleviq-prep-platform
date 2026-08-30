import { blink } from '@/blink/client'

export type ChatMessage = {
  id: string
  senderUserId: string
  recipientUserId: string
  messageType: 'text' | 'voice'
  body?: string
  audioUrl?: string
  audioDurationSeconds?: number | string
  createdAt: string
  readAt?: string
}

const backendUrl = 'https://el8e8zlx.backend.blink.new'

async function authorizedFetch(path: string, init?: RequestInit) {
  if (!blink.auth.isAuthenticated()) throw new Error('Your session has expired. Please sign in again.')
  const token = await blink.auth.getValidToken()
  if (!token) throw new Error('Your session has expired. Please sign in again.')
  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init?.headers },
  })
  const body = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new Error(body.error || `Chat request failed (${response.status})`)
  return body
}

export type ChatContact = { id: string; displayName?: string; email?: string }

export async function fetchChatContacts(): Promise<ChatContact[]> {
  const body = await authorizedFetch('/api/chat/contacts') as { contacts?: ChatContact[] }
  return Array.isArray(body.contacts) ? body.contacts : []
}

export async function fetchChatMessages(participantId?: string): Promise<ChatMessage[]> {
  const query = participantId ? `?participantId=${encodeURIComponent(participantId)}` : ''
  const body = await authorizedFetch(`/api/chat/messages${query}`) as { messages?: ChatMessage[] }
  return Array.isArray(body.messages) ? body.messages : []
}

export async function sendChatMessage(input: {
  recipientUserId: string
  messageType: 'text' | 'voice'
  body?: string
  audioUrl?: string
  audioDurationSeconds?: number
}) {
  return authorizedFetch('/api/chat/messages', { method: 'POST', body: JSON.stringify(input) }) as Promise<{ message?: ChatMessage }>
}
