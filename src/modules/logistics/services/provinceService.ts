import { apiClient } from '@/shared/utils/apiClient'
import { API_CONFIG } from '@/shared/config/api.config'
import type { ApiResponse } from '@/shared/types/api.types'

export interface Province {
  id: number
  name: string
  displayName?: string
  code?: number
  area?: string
}

export const provinceService = {
  async getAllProvinces(): Promise<Province[]> {
    const response = await apiClient.get<ApiResponse<Province[]>>(API_CONFIG.PROVINCES.BASE)
    const data = await response.json()
    return data.data
  },
}
