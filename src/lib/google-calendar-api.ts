import { blink } from '@/blink/client'

export type CalendarEvent = {
  id: string
  summary: string
  description?: string
  htmlLink?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
}

export async function getGoogleCalendarStatus() {
  const response = await blink.connectors.status('google_calendar')
  return response.data as { connected?: boolean }
}

export async function fetchGoogleCalendarEvents(days = 14): Promise<CalendarEvent[]> {
  const status = await getGoogleCalendarStatus()
  if (!status.connected) return []
  const end = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const response = await blink.connectors.execute('google_calendar', {
    method: '/events',
    http_method: 'GET',
    params: {
      timeMin: new Date().toISOString(),
      timeMax: end.toISOString(),
      maxResults: '25',
      orderBy: 'startTime',
      singleEvents: 'true',
    },
  })
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
  const status = await getGoogleCalendarStatus()
  if (!status.connected) return { connected: false, event: null }
  const response = await blink.connectors.execute('google_calendar', {
    method: '/events',
    http_method: 'POST',
    params: {
      summary: input.summary,
      description: input.description,
      start: { dateTime: input.startsAt, timeZone: input.timezone },
      end: { dateTime: input.endsAt, timeZone: input.timezone },
      attendees: (input.attendeeEmails || []).filter(Boolean).map(email => ({ email })),
      sendUpdates: 'all',
      reminders: { useDefault: true },
    },
  })
  return { connected: true, event: response.data as CalendarEvent }
}
