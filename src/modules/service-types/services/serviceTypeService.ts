import { apiClient } from '@/shared/utils/apiClient'
import { API_CONFIG } from '@/shared/config/api.config'
import type { ApiResponse } from '@/shared/types/api.types'

interface ServiceType {
  id: number
  name: string
  displayName?: string
  description?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export const serviceTypeService = {
  getAllServiceTypes: async (): Promise<ServiceType[]> => {
    const response = await apiClient.get<ApiResponse<ServiceType[]>>(API_CONFIG.SERVICE_TYPES.BASE)

    if (!response.ok) {
      throw new Error('Failed to fetch service types')
    }

    const result: ApiResponse<ServiceType[]> = await response.json()
    return result.data
  },

  getActiveServiceTypes: async (): Promise<ServiceType[]> => {
    const response = await apiClient.get<ApiResponse<ServiceType[]>>(API_CONFIG.SERVICE_TYPES.ACTIVE)

    if (!response.ok) {
      throw new Error('Failed to fetch active service types')
    }

    const result: ApiResponse<ServiceType[]> = await response.json()
    return result.data
  },
}

export type { ServiceType }
