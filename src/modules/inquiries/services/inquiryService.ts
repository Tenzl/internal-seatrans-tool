import { API_CONFIG } from '@/shared/config/api.config'
import { apiClient } from '@/shared/utils/apiClient'
import { unwrapApiResponse } from '@/shared/utils/apiUnwrap'

/** Backend admin detail routes use service display name in the path */
export const INQUIRY_SERVICE_DISPLAY = {
  SHIPPING_AGENCY: 'SHIPPING AGENCY',
  CHARTERING: 'CHARTERING',
  FREIGHT_FORWARDING: 'FREIGHT FORWARDING',
  LOGISTICS: 'LOGISTICS',
  SPECIAL_REQUEST: 'SPECIAL REQUEST',
} as const

export const inquiryService = {
  async getAdminDetail<T>(serviceType: string, id: number): Promise<T> {
    const response = await apiClient.get(
      API_CONFIG.INQUIRIES.ADMIN_DETAIL(serviceType, id)
    )
    return unwrapApiResponse<T>(response)
  },

  getShippingAgencyDetail<T>(id: number) {
    return this.getAdminDetail<T>(INQUIRY_SERVICE_DISPLAY.SHIPPING_AGENCY, id)
  },
}
