import { blink } from '@/blink/client'

export interface AdminSearchResult {
  type: string
  id?: string
  title?: string
  subtitle?: string
}

export interface AdminLockout {
  id?: string
  email?: string
  userId?: string
  displayName?: string
  failedAttempts?: string | number
  lockedUntil?: string
  lastFailedAt?: string
  resetSentAt?: string
  updatedAt?: string
}

export interface AdminLockoutEvent {
  id?: string
  email?: string
  userId?: string
  lockedUntil?: string
  attemptCount?: string | number
  notifiedAt?: string
  createdAt?: string
}

export interface AdminOverview {
  authorized: boolean
  role?: string
  range?: { key: string; start: string; end: string }
  counts: {
    leads: number
    newLeads?: number
    students: number
    questions: number
    activeQuestions?: number
    draftQuestions?: number
    products: number
  }
  business?: { revenueCents: number; outstandingCents: number; pendingPaymentsCents: number; orders: number; refundsCents: number; booksSold: number }
  attention?: { failedPayments: number; pastDuePayments: number; followUps: number; lowReadiness: number; securityEvents: number }
  performance?: { activeStudents: number; averageReadiness: number; exitReady: number; intervention: number }
  tutoring?: { sessions: number; today: number; completed: number; cancelled: number; noShows: number; newEnrollments: number; packages: Array<{ packageName?: string; activeStudents?: string | number }> }
  testing?: { totalQuestions: number; activeQuestions: number; draftQuestions: number; ngnCases: number }
  bookstore?: { websiteRevenueCents: number; booksSold: number; lowInventory: Array<{ id?: string; name?: string; inventoryAvailable?: string | number; lowStockThreshold?: string | number }>; topProducts: Array<{ productName?: string; unitsSold?: string | number; revenueCents?: string | number }> }
  payments?: { collectedCents: number; pendingCents: number; outstandingCents: number; failed: number; pastDue: number; refundsCents: number }
  crm?: { pipeline: Array<{ stage?: string; total?: string | number }> }
  academics?: { weakAreas: Array<{ topic?: string; attempts?: string | number; percentCorrect?: string | number }>; mostMissedQuestions: Array<{ id?: string; questionText?: string; topic?: string; difficulty?: string; questionType?: string; attempts?: string | number; incorrect?: string | number; percentCorrect?: string | number }> }
  testingOverview?: { testsCreated: number; testsCompleted: number; averageScore: number }
  recent?: {
    leads?: Array<{ id?: string; name?: string; email?: string; createdAt?: string; stage?: string; programInterest?: string; source?: string; followUpAt?: string }>
    students?: Array<{ id?: string; userId?: string; displayName?: string; school?: string; programType?: string; examType?: string; status?: string; readinessScore?: string | number; assignedTutorId?: string; updatedAt?: string }>
    auditLogs?: Array<{ id?: string; action?: string; userId?: string; resourceType?: string; resourceId?: string; result?: string; createdAt?: string }>
    securityEvents?: Array<{ id?: string; action?: string; resourceType?: string; result?: string; createdAt?: string }>
    orders?: Array<{ id?: string; orderNumber?: string; displayName?: string; totalCents?: string | number; paymentStatus?: string; fulfillmentStatus?: string; products?: string; createdAt?: string }>
    todaySessions?: Array<{ id?: string; studentId?: string; tutorId?: string; startsAt?: string; endsAt?: string; status?: string; programType?: string }>
  }
  health?: { status?: string; database?: string; email?: string; payments?: string; store?: string; security?: string; message?: string; checkedAt?: string }
}

const adminAccessUrl = 'https://el8e8zlx.backend.blink.new/api/admin/access'
const adminOverviewUrl = 'https://el8e8zlx.backend.blink.new/api/admin/overview'
const adminLockoutsUrl = 'https://el8e8zlx.backend.blink.new/api/admin/lockouts'
const adminTemporaryPasswordUrl = 'https://el8e8zlx.backend.blink.new/api/admin/send-temporary-password'
let cachedOverview: { token: string; range: string; request: Promise<AdminOverview> } | null = null

export async function fetchAdminLockouts(): Promise<{ lockouts: AdminLockout[]; events: AdminLockoutEvent[] }> {
  const token = await getAdminToken()
  const response = await fetch(adminLockoutsUrl, { headers: { Authorization: `Bearer ${token}` } })
  const body = await response.json().catch(() => ({})) as { lockouts?: AdminLockout[]; events?: AdminLockoutEvent[]; error?: string }
  if (!response.ok) throw new Error(body.error || `Lockout request failed (${response.status})`)
  return { lockouts: Array.isArray(body.lockouts) ? body.lockouts : [], events: Array.isArray(body.events) ? body.events : [] }
}

export async function sendTemporaryPassword(email: string) {
  const token = await getAdminToken()
  const response = await fetch(adminTemporaryPasswordUrl, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
  const body = await response.json().catch(() => ({})) as { success?: boolean; error?: string }
  if (!response.ok) throw new Error(body.error || `Temporary password request failed (${response.status})`)
  return body
}

const wait = (milliseconds: number) => new Promise(resolve => window.setTimeout(resolve, milliseconds))

async function getAdminToken() {
  let lastError: unknown
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      if (blink.auth.isAuthenticated()) {
        const token = await blink.auth.getValidToken()
        if (token) return token
      }
    } catch (cause) {
      lastError = cause
    }
    await wait(250 * (attempt + 1))
  }
  if (lastError instanceof Error) throw lastError
  throw new Error('Your admin session has not finished loading. Please try again.')
}

export async function checkAdminAccess(): Promise<{ authorized: boolean; role?: string }> {
  let lastError: unknown
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const token = await getAdminToken()
      const response = await fetch(adminAccessUrl, { headers: { Authorization: `Bearer ${token}` } })
      const body = await response.json().catch(() => ({})) as { authorized?: boolean; role?: string; error?: string }
      if (response.ok) return { authorized: body.authorized === true, role: body.role }
      if (response.status !== 401 && response.status !== 503) throw new Error(body.error || `Admin access check failed (${response.status})`)
      lastError = new Error(body.error || `Admin access check failed (${response.status})`)
    } catch (cause) {
      lastError = cause
    }
    await wait(500 * (attempt + 1))
  }
  throw lastError instanceof Error ? lastError : new Error('Admin access could not be verified. Please try again.')
}

type FetchAdminOptions = { force?: boolean; range?: string }

export async function fetchAdminOverview(options: FetchAdminOptions = {}): Promise<AdminOverview> {
  const token = await getAdminToken()
  const range = options.range || '30d'
  if (!options.force && cachedOverview?.token === token && cachedOverview.range === range) return cachedOverview.request

  const request = (async () => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 10000)
    let response: Response
    try {
      const url = new URL(adminOverviewUrl)
      url.searchParams.set('range', range)
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        const timeoutError = new Error('The admin overview request timed out. Please try again.')
        Object.defineProperty(timeoutError, 'cause', { value: error })
        throw timeoutError
      }
      throw error
    } finally {
      window.clearTimeout(timeout)
    }
    const body = await response.json().catch(() => ({})) as { error?: string; data?: AdminOverview } | AdminOverview
    if (!response.ok) {
      const errorBody = body as { error?: string }
      throw new Error(errorBody.error || `Admin request failed (${response.status})`)
    }
    const dataBody = body as AdminOverview
    return typeof dataBody.authorized === 'boolean' ? dataBody : (body as { data?: AdminOverview }).data ?? body as AdminOverview
  })()

  cachedOverview = { token, range, request }
  try {
    return await request
  } catch (error) {
    if (cachedOverview?.request === request) cachedOverview = null
    throw error
  }
}

export async function fetchAdminSearch(query: string): Promise<AdminSearchResult[]> {
  if (query.trim().length < 2) return []
  const token = await getAdminToken()
  const url = new URL('https://el8e8zlx.backend.blink.new/api/admin/search')
  url.searchParams.set('q', query.trim())
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  const body = await response.json().catch(() => ({})) as { results?: AdminSearchResult[]; error?: string }
  if (!response.ok) throw new Error(body.error || `Admin search failed (${response.status})`)
  return Array.isArray(body.results) ? body.results : []
}

// Kept for the existing auth and login checks; both now share the same request.
export const fetchAdminSummary = () => fetchAdminOverview()
