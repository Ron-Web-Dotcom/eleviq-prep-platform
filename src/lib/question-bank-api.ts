import { blink } from '@/blink/client'

export type Choice = { id: string; text: string }

export type QuestionBankQuestion = {
  id: string
  programId?: string
  questionText: string
  questionType: 'multiple_choice' | 'multiple_select'
  choices: Choice[]
  correctAnswerIds: string[]
  rationale: string
  topic?: string
  subtopic?: string
  difficulty?: string
  clinicalJudgmentCategory?: string
  status: 'draft' | 'active'
  updatedAt?: string
}

export type QuestionDraft = Omit<QuestionBankQuestion, 'id' | 'updatedAt'> & { id?: string }
export type AiMode = 'question' | 'choices' | 'rationale'

const apiBase = 'https://el8e8zlx.backend.blink.new/api/admin/questions'

async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!blink.auth.isAuthenticated()) throw new Error('Your admin session has expired. Please sign in again.')
  const token = await blink.auth.getValidToken()
  if (!token) throw new Error('Your admin session has expired. Please sign in again.')
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 30000)
  try {
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) },
      signal: controller.signal,
    })
    const body = await response.json().catch(() => ({})) as T & { error?: string }
    if (!response.ok) throw new Error(body.error || `Question bank request failed (${response.status})`)
    return body
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('The question bank request timed out. Please try again.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function fetchQuestions(query = '') {
  const params = query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ''
  const result = await adminRequest<{ questions?: QuestionBankQuestion[] }>(params, { method: 'GET' })
  return Array.isArray(result.questions) ? result.questions : []
}

export async function saveQuestion(question: QuestionDraft) {
  return adminRequest<{ question: QuestionBankQuestion }>(question.id ? `/${question.id}` : '', {
    method: question.id ? 'PUT' : 'POST',
    body: JSON.stringify(question),
  })
}

export async function assistQuestion(mode: AiMode, draft: Partial<QuestionDraft>) {
  return adminRequest<{ result: Record<string, unknown> }>('/ai', {
    method: 'POST',
    body: JSON.stringify({ mode, ...draft }),
  })
}
