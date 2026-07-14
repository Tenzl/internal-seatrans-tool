import { API_CONFIG } from '@/shared/config/api.config'
import type { PageResponse } from '@/shared/types/api.types'
import { apiClient } from '@/shared/utils/apiClient'
import { unwrapApiResponse, unwrapPaginatedContent } from '@/shared/utils/apiUnwrap'

/** Backend admin detail routes use service display name in the path */
export const INQUIRY_SERVICE_DISPLAY = {
  SHIPPING_AGENCY: 'SHIPPING AGENCY',
  CHARTERING: 'CHARTERING',
  FREIGHT_FORWARDING: 'FREIGHT FORWARDING',
  LOGISTICS: 'LOGISTICS',
  SPECIAL_REQUEST: 'SPECIAL REQUEST',
} as const

export type InquiryListParams = {
  page?: number
  size?: number
  serviceSlug?: string
  serviceType?: string
  status?: string
}

function buildListQuery(params: InquiryListParams = {}): string {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 0))
  search.set('size', String(params.size ?? 100))
  if (params.status) search.set('status', params.status)
  const slug = params.serviceSlug ?? params.serviceType
  if (slug?.trim()) {
    search.set('serviceSlug', slug.trim())
  }
  return search.toString()
}

export const inquiryService = {
  submitJson(body: unknown) {
    return apiClient.post(API_CONFIG.INQUIRIES.SUBMIT, body)
  },

  submitMultipart(formData: FormData) {
    return apiClient.post(API_CONFIG.INQUIRIES.SUBMIT, formData)
  },

  async listForUser<T>(userId: number, params: InquiryListParams = {}): Promise<T[]> {
    const response = await apiClient.get<PageResponse<T>>(
      `${API_CONFIG.INQUIRIES.USER_HISTORY(userId)}?${buildListQuery(params)}`,
    )
    if (!response.ok) throw new Error('Failed to fetch inquiries')
    const payload = await response.json()
    const data = (payload as { data?: PageResponse<T> }).data ?? payload
    return unwrapPaginatedContent<T>(data as PageResponse<T>)
  },

  async listForAdmin<T>(params: InquiryListParams = {}): Promise<T[]> {
    const response = await apiClient.get<PageResponse<T>>(
      `${API_CONFIG.INQUIRIES.ADMIN_BASE}?${buildListQuery(params)}`,
    )
    if (!response.ok) throw new Error('Failed to fetch inquiries')
    const payload = await response.json()
    const data = (payload as { data?: PageResponse<T> }).data ?? payload
    return unwrapPaginatedContent<T>(data as PageResponse<T>)
  },

  async getAdminDetail<T>(serviceType: string, id: number): Promise<T> {
    const response = await apiClient.get(API_CONFIG.INQUIRIES.ADMIN_DETAIL(serviceType, id))
    return unwrapApiResponse<T>(response)
  },

  getShippingAgencyDetail<T>(id: number) {
    return this.getAdminDetail<T>(INQUIRY_SERVICE_DISPLAY.SHIPPING_AGENCY, id)
  },

  async updateStatus(serviceType: string, id: number, status: string): Promise<void> {
    const response = await apiClient.patch(API_CONFIG.INQUIRIES.ADMIN_STATUS(serviceType, id), {
      status,
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error((err as { message?: string }).message || 'Failed to update status')
    }
  },

  async updateForm(serviceType: string, id: number, form: string): Promise<void> {
    const response = await apiClient.patch(API_CONFIG.INQUIRIES.ADMIN_FORM(serviceType, id), { form })
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error((err as { message?: string }).message || 'Failed to update form')
    }
  },

  async updateHours(
    serviceType: string,
    id: number,
    hours: { berthHours: number; anchorageHours: number; pilotage3rdMiles: number },
  ): Promise<void> {
    const response = await apiClient.patch(API_CONFIG.INQUIRIES.ADMIN_HOURS(serviceType, id), hours)
    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error((err as { message?: string }).message || 'Failed to update hours')
    }
  },
}
