import { API_CONFIG } from '@/shared/config/api.config'
import { apiClient } from '@/shared/utils/apiClient'
import { unwrapApiResponse } from '@/shared/utils/apiUnwrap'
import type {
  BookingShippingResponse,
  BookingShippingUpsertRequest,
} from './bookingShippingTypes'

const path = (partnerId: number) =>
  API_CONFIG.BOOKING_PARTNERS.BY_PARTNER(partnerId)

export const bookingShippingService = {
  async get(partnerId: number): Promise<BookingShippingResponse> {
    const res = await apiClient.get(path(partnerId))
    return unwrapApiResponse<BookingShippingResponse>(res)
  },

  async put(
    partnerId: number,
    body: BookingShippingUpsertRequest
  ): Promise<BookingShippingResponse> {
    const res = await apiClient.put(path(partnerId), body)
    return unwrapApiResponse<BookingShippingResponse>(res)
  },
}
