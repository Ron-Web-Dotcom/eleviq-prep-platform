import { blink } from '@/blink/client'

export interface AdminSummary {
  authorized: boolean
  counts: {
    leads: number
    students: number
    questions: number
    products: number
  }
}

const adminSummaryUrl = 'https://el8e8zlx.backend.blink.new/api/admin/summary'

export async function fetchAdminSummary(): Promise<AdminSummary> {
  const token = await blink.auth.getValidToken()
  if (!token) throw new Error('Your admin session has expired. Please sign in again.')

  const response = await fetch(adminSummaryUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })
  const body = await response.json().catch(() => ({})) as { error?: string; data?: AdminSummary } | AdminSummary
  if (!response.ok) {
    const errorBody = body as { error?: string }
    throw new Error(errorBody.error || `Admin request failed (${response.status})`)
  }
  const dataBody = body as AdminSummary
  return typeof dataBody.authorized === 'boolean' ? dataBody : (body as { data?: AdminSummary }).data ?? body as AdminSummary
}
