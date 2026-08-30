import { blink } from '@/blink/client'

export interface AdminOverview {
  authorized: boolean
  counts: {
    leads: number
    students: number
    questions: number
    products: number
  }
  recent?: {
    leads?: Array<{ id?: string; name?: string; email?: string; createdAt?: string; stage?: string; programInterest?: string }>
    students?: Array<{ id?: string; userId?: string; school?: string; programType?: string; examType?: string; status?: string; readinessScore?: string | number; createdAt?: string }>
    auditLogs?: Array<{ id?: string; action?: string; userId?: string; resourceType?: string; result?: string; createdAt?: string }>
  }
  health?: { status?: string; database?: string; message?: string; checkedAt?: string }
}

const adminOverviewUrl = 'https://el8e8zlx.backend.blink.new/api/admin/overview'
let cachedOverview: { token: string; request: Promise<AdminOverview> } | null = null

type FetchAdminOptions = { force?: boolean }

export async function fetchAdminOverview(options: FetchAdminOptions = {}): Promise<AdminOverview> {
  if (!blink.auth.isAuthenticated()) throw new Error('Your admin session has expired. Please sign in again.')
  const token = await blink.auth.getValidToken()
  if (!token) throw new Error('Your admin session has expired. Please sign in again.')
  if (!options.force && cachedOverview?.token === token) return cachedOverview.request

  const request = (async () => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 10000)
    let response: Response
    try {
      response = await fetch(adminOverviewUrl, {
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

  cachedOverview = { token, request }
  try {
    return await request
  } catch (error) {
    if (cachedOverview?.request === request) cachedOverview = null
    throw error
  }
}

// Kept for the existing auth and login checks; both now share the same request.
export const fetchAdminSummary = () => fetchAdminOverview()
