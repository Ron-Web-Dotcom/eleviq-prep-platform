import { blink } from '@/blink/client'

export interface AdminSearchResult {
  type: string
  id?: string
  title?: string
  subtitle?: string
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

const adminOverviewUrl = 'https://el8e8zlx.backend.blink.new/api/admin/overview'
let cachedOverview: { token: string; range: string; request: Promise<AdminOverview> } | null = null

type FetchAdminOptions = { force?: boolean; range?: string }

export async function fetchAdminOverview(options: FetchAdminOptions = {}): Promise<AdminOverview> {
  if (!blink.auth.isAuthenticated()) throw new Error('Your admin session has expired. Please sign in again.')
  const token = await blink.auth.getValidToken()
  if (!token) throw new Error('Your admin session has expired. Please sign in again.')
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
  if (!blink.auth.isAuthenticated()) throw new Error('Your admin session has expired. Please sign in again.')
  const token = await blink.auth.getValidToken()
  if (!token) throw new Error('Your admin session has expired. Please sign in again.')
  const url = new URL('https://el8e8zlx.backend.blink.new/api/admin/search')
  url.searchParams.set('q', query.trim())
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  const body = await response.json().catch(() => ({})) as { results?: AdminSearchResult[]; error?: string }
  if (!response.ok) throw new Error(body.error || `Admin search failed (${response.status})`)
  return Array.isArray(body.results) ? body.results : []
}

// Kept for the existing auth and login checks; both now share the same request.
export const fetchAdminSummary = () => fetchAdminOverview()
