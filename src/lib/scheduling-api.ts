import { blink } from '@/blink/client'

export type SchedulePerson = { id: string; displayName?: string; email?: string; programType?: string; school?: string }
export type ScheduledSession = { id: string; studentId: string; tutorId: string; studentName?: string; studentEmail?: string; tutorName?: string; tutorEmail?: string; programType?: string; startsAt: string; endsAt: string; timezone: string; status: string; googleEventId?: string; calendarSyncStatus?: string }

const backendUrl = 'https://el8e8zlx.backend.blink.new'

async function authorizedFetch<T>(path: string, init: RequestInit = {}) {
  const token = await blink.auth.getValidToken()
  if (!token) throw new Error('Your administrator session has expired. Please sign in again.')
  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  })
  const body = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(body.error || `Scheduling request failed (${response.status})`)
  return body
}

export async function checkTutorAccess() {
  return authorizedFetch<{ authorized?: boolean }>('/api/tutor/access')
}

export async function fetchSchedulePeople() {
  return authorizedFetch<{ students?: SchedulePerson[]; tutors?: SchedulePerson[] }>('/api/admin/scheduling/people')
}

export async function fetchScheduledSessions() {
  const result = await authorizedFetch<{ sessions?: ScheduledSession[] }>('/api/admin/scheduling/sessions')
  return Array.isArray(result.sessions) ? result.sessions : []
}

export async function createScheduledSession(input: { studentId: string; tutorId: string; startsAt: string; endsAt: string; timezone: string }) {
  return authorizedFetch<{ session: ScheduledSession }>('/api/admin/scheduling/sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function syncScheduledSessionCalendar(sessionId: string, eventId: string) {
  return authorizedFetch<{ session: ScheduledSession }>(`/api/admin/scheduling/sessions/${encodeURIComponent(sessionId)}/calendar`, {
    method: 'POST',
    body: JSON.stringify({ eventId }),
  })
}

export async function fetchMyScheduledSessions() {
  const result = await authorizedFetch<{ sessions?: ScheduledSession[] }>('/api/student/scheduling/sessions')
  return Array.isArray(result.sessions) ? result.sessions : []
}
