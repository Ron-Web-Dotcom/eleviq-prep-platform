import { blink } from '@/blink/client'
import type { QuestionBankQuestion } from '@/lib/question-bank-api'

export type TestItemType = 'multiple_choice' | 'multiple_select' | 'case_study' | 'bow_tie'
export type TestQuestion = QuestionBankQuestion & {
  questionType: TestItemType
}
export type TestSession = { id: string; title: string; mode: string; timeLimitMinutes?: number; questions: TestQuestion[] }
export type TestSubmission = { answers: Record<string, string[]>; flagged: string[]; elapsedSeconds: number }

const apiBase = 'https://el8e8zlx.backend.blink.new/api/test-mode'

async function request<T>(path: string, init: RequestInit = {}) {
  const token = await blink.auth.getValidToken()
  if (!token) throw new Error('Your student session has expired. Please sign in again.')
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 30000)
  try {
    const response = await fetch(`${apiBase}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) }, signal: controller.signal })
    const body = await response.json().catch(() => ({})) as T & { error?: string }
    if (!response.ok) throw new Error(body.error || `Test Mode request failed (${response.status})`)
    return body
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Test Mode timed out. Please try again.')
    throw error
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function fetchTestSession() {
  const result = await request<{ session?: TestSession }>('/session')
  if (!result.session) throw new Error('No Test Mode session is available yet.')
  return result.session
}

export async function submitTest(submission: TestSubmission) {
  return request<{ result: TestResult }>('/submit', { method: 'POST', body: JSON.stringify(submission) })
}

export type TestResult = { scorePercent: number; answered: number; total: number; flagged: number; elapsedSeconds: number; items: Array<{ id: string; questionText: string; topic?: string; correct: boolean; selected: string[]; correctAnswerIds: string[]; rationale: string; remediation: string }> }
