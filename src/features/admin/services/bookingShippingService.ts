import { API_CONFIG } from '@/shared/config/api.config'
import type { ApiResponse } from '@/shared/types/api.types'
import { apiClient } from '@/shared/utils/apiClient'
import type { BookingShippingResponse, BookingShippingUpsertRequest } from '@/features/admin/types/bookingShipping.types'

const path = (partnerId: number) => API_CONFIG.BOOKING_PARTNERS.BY_PARTNER(partnerId)

const unwrap = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json()) as ApiResponse<T>
  if (!response.ok || payload.success === false) {
    throw new Error(payload.message || 'Request failed')
  }
  return payload.data as T
}

export const bookingShippingService = {
  async get(partnerId: number): Promise<BookingShippingResponse> {
    const res = await apiClient.get<ApiResponse<BookingShippingResponse>>(path(partnerId))
    return unwrap<BookingShippingResponse>(res)
  },

  async put(partnerId: number, body: BookingShippingUpsertRequest): Promise<BookingShippingResponse> {
    const res = await apiClient.put<ApiResponse<BookingShippingResponse>>(path(partnerId), body)
    return unwrap<BookingShippingResponse>(res)
  },
}
