import { blink } from '@/blink/client'

export type CalendarEvent = {
  id: string
  summary: string
  description?: string
  htmlLink?: string
  hangoutLink?: string
  conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> }
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
}

export type ClassroomCourse = { id: string; name?: string; section?: string; descriptionHeading?: string; courseState?: string; enrollmentCode?: string }
export type ClassroomWork = { id: string; courseId?: string; title?: string; description?: string; dueDate?: { year?: number; month?: number; day?: number }; dueTime?: { hours?: number; minutes?: number }; workType?: string; state?: string; submissionState?: string; alternateLink?: string; eleviqTestId?: string; submission?: ClassroomSubmission }
export type ClassroomSubmission = { state?: string; assignedGrade?: number; draftGrade?: number; late?: boolean; feedback?: string; userId?: string }
export type IntegrationStatus = {
  connected?: boolean
  provider?: string
  email?: string
  role?: 'student' | 'tutor' | 'admin'
  capabilities?: {
    calendarRead?: boolean
    calendarCreate?: boolean
    meetCreate?: boolean
    classroomCoursesRead?: boolean
    classroomCourseworkRead?: boolean
    classroomSubmissionsRead?: boolean
    classroomCourseworkCreate?: boolean
    broaderStudentData?: boolean
  }
}

type FunctionEnvelope = { data?: unknown; error?: string; message?: string }

// Older and newer Blink function clients expose backend JSON slightly differently.
// Normalize both shapes so a successful backend response is not mistaken for an
// empty payload in the student login flow.
const unwrapFunctionResponse = <T,>(value: unknown): T => {
  if (value && typeof value === 'object' && 'data' in value) {
    const envelope = value as FunctionEnvelope
    if (envelope.error) throw new Error(envelope.error)
    return envelope.data as T
  }
  return value as T
}

export async function getGoogleIntegrationStatus(): Promise<IntegrationStatus> {
  const response = await blink.functions.invoke('api/google/integration/status', { body: {} })
  return unwrapFunctionResponse<IntegrationStatus>(response)
}

export async function startGoogleIntegration(returnTo?: string) {
  const token = await blink.auth.getValidToken()
  if (!token) throw new Error('Your ELEVIQ session has expired. Please sign in again.')
  const response = unwrapFunctionResponse<{ authorizationUrl?: string; error?: string }>(await blink.functions.invoke('api/google/integration/start', {
    body: { origin: window.location.origin, returnTo: returnTo || `${window.location.pathname}${window.location.search}` },
  }))
  if (!response.authorizationUrl) throw new Error(response.error || 'Google authorization could not be started.')
  window.location.assign(response.authorizationUrl)
}

export async function disconnectGoogleIntegration() {
  return blink.functions.invoke('api/google/integration/disconnect', { body: {} })
}

export async function fetchGoogleClassroomCourses() {
  const response = unwrapFunctionResponse<{ courses?: unknown[] }>(await blink.functions.invoke('api/google/classroom/courses', { body: {} }))
  return Array.isArray(response.courses) ? response.courses as ClassroomCourse[] : []
}

export async function fetchGoogleClassroomWork(courseId: string) {
  const response = unwrapFunctionResponse<{ coursework?: unknown[]; items?: unknown[] }>(await blink.functions.invoke('api/google/classroom/coursework', { body: { courseId } }))
  const items = response.coursework || response.items
  return Array.isArray(items) ? items as ClassroomWork[] : []
}

export async function fetchGoogleClassroomSubmission(courseId: string, courseWorkId: string): Promise<ClassroomSubmission | undefined> {
  const token = await blink.auth.getValidToken()
  if (!token) throw new Error('Your ELEVIQ session has expired. Please sign in again.')
  const projectId = import.meta.env.VITE_BLINK_PROJECT_ID || 'eleviq-prep-platform-el8e8zlx'
  const backendId = projectId.slice(-8)
  const response = await fetch(`https://${backendId}.backend.blink.new/api/google/classroom/coursework/${encodeURIComponent(courseWorkId)}/submissions?courseId=${encodeURIComponent(courseId)}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) throw new Error('Submission status could not be loaded.')
  const data = await response.json() as { submission?: ClassroomSubmission; submissions?: ClassroomSubmission[] }
  return data.submission || data.submissions?.[0]
}

export async function createGoogleClassroomWork(input: { courseId: string; title: string; description: string; workType: 'ASSIGNMENT' | 'MATERIAL' | 'QUIZ'; dueDate?: string }) {
  return blink.functions.invoke('api/google/classroom/coursework', { body: input })
}

export async function getGoogleCalendarStatus() {
  // The student portal uses the same personal Google OAuth connection for
  // Classroom, Calendar, and Meet. Do not fall back to the legacy connector:
  // that creates noisy 404/401 requests and can show a different account.
  return getGoogleIntegrationStatus()
}

const unifiedGoogleFetch = async (path: string, body?: Record<string, unknown>) => {
  const response = await blink.functions.invoke(path, body ? { body } : undefined)
  return unwrapFunctionResponse<Record<string, unknown>>(response)
}

const conferenceUri = (event: CalendarEvent) => event.hangoutLink || event.conferenceData?.entryPoints?.find(point => point.entryPointType === 'video')?.uri

export async function fetchGoogleCalendarEvents(days = 14): Promise<CalendarEvent[]> {
  const status = await getGoogleIntegrationStatus()
  if (status.connected) {
    const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    const data = await unifiedGoogleFetch('api/google/calendar/events', { timeMin: new Date().toISOString(), timeMax: end.toISOString(), maxResults: 25 })
    return Array.isArray(data.items) ? data.items.filter((item): item is CalendarEvent => Boolean(item && typeof item === 'object' && 'id' in item && 'summary' in item)) : []
  }
  const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const response = await blink.connectors.execute('google_calendar', { method: '/events', http_method: 'GET', params: { timeMin: new Date().toISOString(), timeMax: end.toISOString(), maxResults: '25', orderBy: 'startTime', singleEvents: 'true' } })
  const data = response.data as { items?: unknown[] }
  return Array.isArray(data.items) ? data.items.filter((item): item is CalendarEvent => Boolean(item && typeof item === 'object' && 'id' in item && 'summary' in item)) : []
}

export async function createGoogleCalendarEvent(input: {
  summary: string
  description: string
  startsAt: string
  endsAt: string
  timezone: string
  attendeeEmails?: string[]
  createMeet?: boolean
}) {
  const status = await getGoogleIntegrationStatus()
  if (status.connected) {
    const result = await unifiedGoogleFetch('api/google/calendar/events', input)
    return { connected: true, event: result.event as CalendarEvent, meetingUri: result.meetingUri as string | undefined }
  }
  return { connected: false, event: null, meetingUri: undefined }
}
