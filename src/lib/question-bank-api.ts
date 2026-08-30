import { blink } from '@/blink/client'

export type Choice = { id: string; text: string }

export type QuestionKind = 'multiple_choice' | 'multiple_select' | 'case_study' | 'bow_tie'
export type CaseScenario = { history?: string; assessment?: string; vitals?: Array<{ label: string; value: string }>; labs?: Array<{ label: string; value: string }>; medications?: string[]; timeline?: Array<{ time: string; event: string }> }
export type BowTieInteraction = { condition: string; actions: Choice[]; monitoring: Choice[]; correctActionIds: string[]; correctMonitoringIds: string[] }

export type QuestionBankQuestion = {
  id: string
  programId?: string
  questionText: string
  questionType: QuestionKind
  choices: Choice[]
  correctAnswerIds: string[]
  rationale: string
  topic?: string
  subtopic?: string
  difficulty?: string
  clinicalJudgmentCategory?: string
  scenario?: CaseScenario
  interaction?: BowTieInteraction
  caseId?: string
  caseOrder?: number
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

export async function fetchQuestions(query = ''): Promise<QuestionBankQuestion[]> {
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
