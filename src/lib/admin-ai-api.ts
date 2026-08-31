import { blink } from '@/blink/client'

const assistantUrl = 'https://el8e8zlx.backend.blink.new/api/admin/assistant'
const ASSISTANT_TIMEOUT_MS = 12000
let lastAssistantRequest = { prompt: '', timestamp: 0 }

export async function askAdminAssistant(question: string, range = '30d'): Promise<string> {
  const prompt = question.trim()
  if (!prompt) throw new Error('Ask the operations assistant a question first.')
  const now = Date.now()
  if (lastAssistantRequest.prompt === prompt && now - lastAssistantRequest.timestamp < 1200) return 'That request was already sent. Please wait for the current readout.'
  lastAssistantRequest = { prompt, timestamp: now }
  if (!blink.auth.isAuthenticated()) throw new Error('Your admin session has expired. Please sign in again.')
  const token = await blink.auth.getValidToken()
  if (!token) throw new Error('Your admin session has expired. Please sign in again.')
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), ASSISTANT_TIMEOUT_MS)
  try {
    const response = await fetch(assistantUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ question: prompt.slice(0, 1200), range }),
      signal: controller.signal,
    })
    const body = await response.json().catch(() => ({})) as { answer?: string; error?: string }
    if (!response.ok) throw new Error(body.error || `Assistant request failed (${response.status})`)
    return body.answer || 'The operations assistant did not return an answer.'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      const timeoutError = new Error('The operations assistant timed out. Please try again.')
      Object.defineProperty(timeoutError, 'cause', { value: error })
      throw timeoutError
    }
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}
