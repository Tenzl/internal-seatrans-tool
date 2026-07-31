import { API_CONFIG } from '@/shared/config/api.config'
import type { ApiResponse } from '@/shared/types/api.types'
import { apiClient } from '@/shared/utils/apiClient'
import {
  unwrapApiResponse,
  unwrapNullableApiResponse,
} from '@/shared/utils/apiUnwrap'
import type { Office, OfficeUpsertRequest } from './officeModel'

export const officeService = {
  async list(): Promise<Office[]> {
    const response = await apiClient.get<ApiResponse<Office[]>>(
      API_CONFIG.OFFICES.ADMIN_BASE
    )
    return unwrapApiResponse<Office[]>(response)
  },

  async create(request: OfficeUpsertRequest): Promise<Office> {
    const response = await apiClient.post<ApiResponse<Office>>(
      API_CONFIG.OFFICES.ADMIN_BASE,
      request
    )
    return unwrapApiResponse<Office>(response)
  },

  async update(id: number, request: OfficeUpsertRequest): Promise<Office> {
    const response = await apiClient.put<ApiResponse<Office>>(
      API_CONFIG.OFFICES.ADMIN_BY_ID(id),
      request
    )
    return unwrapApiResponse<Office>(response)
  },

  async delete(id: number): Promise<void> {
    const response = await apiClient.delete<ApiResponse<unknown>>(
      API_CONFIG.OFFICES.ADMIN_BY_ID(id)
    )
    await unwrapNullableApiResponse<unknown>(response)
  },
}
