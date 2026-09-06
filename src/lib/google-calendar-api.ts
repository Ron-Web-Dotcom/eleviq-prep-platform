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
export type ClassroomWork = { id: string; courseId?: string; title?: string; description?: string; dueDate?: { year?: number; month?: number; day?: number }; dueTime?: { hours?: number; minutes?: number }; workType?: string; state?: string; submissionState?: string; alternateLink?: string }
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

export async function getGoogleIntegrationStatus(): Promise<IntegrationStatus> {
  const response = await blink.functions.invoke('api/google/integration/status')
  return response as IntegrationStatus
}

export async function startGoogleIntegration(returnTo?: string) {
  const token = await blink.auth.getValidToken()
  if (!token) throw new Error('Your ELEVIQ session has expired. Please sign in again.')
  const response = await blink.functions.invoke('api/google/integration/start', {
    body: { origin: window.location.origin, returnTo: returnTo || `${window.location.pathname}${window.location.search}` },
  }) as { authorizationUrl?: string }
  if (!response.authorizationUrl) throw new Error('Google authorization could not be started.')
  window.location.assign(response.authorizationUrl)
}

export async function disconnectGoogleIntegration() {
  return blink.functions.invoke('api/google/integration/disconnect', { body: {} })
}

export async function fetchGoogleClassroomCourses() {
  const response = await blink.functions.invoke('api/google/classroom/courses', { body: {} }) as { courses?: unknown[] }
  return Array.isArray(response.courses) ? response.courses as ClassroomCourse[] : []
}

export async function fetchGoogleClassroomWork(courseId: string) {
  const response = await blink.functions.invoke('api/google/classroom/coursework', { body: { courseId } }) as { coursework?: unknown[]; items?: unknown[] }
  const items = response.coursework || response.items
  return Array.isArray(items) ? items as ClassroomWork[] : []
}

export async function createGoogleClassroomWork(input: { courseId: string; title: string; description: string; workType: 'ASSIGNMENT' | 'MATERIAL' | 'QUIZ'; dueDate?: string }) {
  return blink.functions.invoke('api/google/classroom/coursework', { body: input })
}

export async function getGoogleCalendarStatus() {
  try {
    const unified = await getGoogleIntegrationStatus()
    if (unified.provider === 'google' || unified.connected) return unified
  } catch {
    // Keep the existing connector fallback available for accounts connected before unified OAuth.
  }
  const response = await blink.connectors.status('google_calendar')
  return response.data as IntegrationStatus
}

const unifiedGoogleFetch = async (path: string, body?: Record<string, unknown>) => {
  const response = await blink.functions.invoke(path, body ? { body } : undefined)
  return response as unknown as Record<string, unknown>
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
}) {
  const status = await getGoogleIntegrationStatus()
  if (status.connected) {
    const result = await unifiedGoogleFetch('api/google/calendar/events', input)
    return { connected: true, event: result.event as CalendarEvent, meetingUri: result.meetingUri as string | undefined }
  }
  const legacyStatus = await getGoogleCalendarStatus()
  if (!legacyStatus.connected) return { connected: false, event: null, meetingUri: undefined }
  const response = await blink.connectors.execute('google_calendar', { method: '/events', http_method: 'POST', params: { summary: input.summary, description: input.description, start: { dateTime: input.startsAt, timeZone: input.timezone }, end: { dateTime: input.endsAt, timeZone: input.timezone }, attendees: (input.attendeeEmails || []).filter(Boolean).map(email => ({ email })), sendUpdates: 'all', reminders: { useDefault: true } } })
  return { connected: true, event: response.data as CalendarEvent, meetingUri: conferenceUri(response.data as CalendarEvent) }
}
