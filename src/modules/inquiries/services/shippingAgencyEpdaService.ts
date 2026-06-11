import { API_CONFIG } from '@/shared/config/api.config'
import type { EpdaApiPayload } from '@/features/admin/components/invoice/epda/epdaApiMappers'
import type { ShippingAgencyAdminInquiry } from '@/features/admin/components/invoice/epda/epdaApiMappers'
import type { InquiryFieldChangeLogEntry } from '@/features/admin/components/invoice/epda/epdaCustomerFieldTracking'
import type { PageResponse } from '@/shared/types/api.types'
import { apiClient } from '@/shared/utils/apiClient'
import { unwrapApiResponse } from '@/shared/utils/apiUnwrap'

export const shippingAgencyEpdaService = {
  async createInternalInquiry(body: EpdaApiPayload): Promise<ShippingAgencyAdminInquiry> {
    const response = await apiClient.post(API_CONFIG.INQUIRIES.ADMIN_SHIPPING_AGENCY_CREATE, body)
    return unwrapApiResponse<ShippingAgencyAdminInquiry>(response)
  },

  async updateEpda(
    inquiryId: number,
    body: EpdaApiPayload & {
      confirmedCustomerFieldChanges?: Array<{
        field: string
        previousValue?: string
        newValue?: string
      }>
    },
  ): Promise<ShippingAgencyAdminInquiry> {
    const response = await apiClient.patch(
      API_CONFIG.INQUIRIES.ADMIN_SHIPPING_AGENCY_EPDA(inquiryId),
      body,
    )
    return unwrapApiResponse<ShippingAgencyAdminInquiry>(response)
  },

  async issueEpda(
    inquiryId: number,
    epdaSnapshot: Record<string, unknown>,
    options?: {
      internalNotes?: string
      confirmedCustomerFieldChanges?: Array<{
        field: string
        previousValue?: string
        newValue?: string
      }>
    },
  ): Promise<ShippingAgencyAdminInquiry> {
    const response = await apiClient.post(
      API_CONFIG.INQUIRIES.ADMIN_SHIPPING_AGENCY_EPDA_ISSUE(inquiryId),
      {
        epdaSnapshot,
        internalNotes: options?.internalNotes,
        confirmedCustomerFieldChanges: options?.confirmedCustomerFieldChanges,
      },
    )
    return unwrapApiResponse<ShippingAgencyAdminInquiry>(response)
  },

  async listFieldChanges(inquiryId: number, page = 0, size = 6) {
    const response = await apiClient.get(
      API_CONFIG.INQUIRIES.ADMIN_SHIPPING_AGENCY_FIELD_CHANGES(inquiryId, page, size),
    )
    return unwrapApiResponse<PageResponse<InquiryFieldChangeLogEntry>>(response)
  },

  async listLatestCustomerFieldChanges(inquiryId: number) {
    const response = await apiClient.get(
      API_CONFIG.INQUIRIES.ADMIN_SHIPPING_AGENCY_CUSTOMER_FIELD_CHANGES(inquiryId),
    )
    return unwrapApiResponse<InquiryFieldChangeLogEntry[]>(response)
  },
}
