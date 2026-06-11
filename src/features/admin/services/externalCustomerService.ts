import { API_CONFIG } from '@/shared/config/api.config'
import { apiClient } from '@/shared/utils/apiClient'
import { unwrapApiResponse } from '@/shared/utils/apiUnwrap'

export type ExternalCustomerOption = {
  id: number
  fullName: string
  email: string
  company: string | null
  label: string
}

export const externalCustomerService = {
  async list(q?: string, limit = 100): Promise<ExternalCustomerOption[]> {
    const params = new URLSearchParams()
    if (q?.trim()) params.set('q', q.trim())
    if (limit) params.set('limit', String(limit))
    const qs = params.toString()
    const path = qs
      ? `${API_CONFIG.USERS.ADMIN_EXTERNAL_CUSTOMERS}?${qs}`
      : API_CONFIG.USERS.ADMIN_EXTERNAL_CUSTOMERS
    const response = await apiClient.get(path)
    return unwrapApiResponse<ExternalCustomerOption[]>(response)
  },

  async create(fullName: string): Promise<ExternalCustomerOption> {
    const response = await apiClient.post(API_CONFIG.USERS.ADMIN_EXTERNAL_CUSTOMERS, {
      fullName,
    })
    return unwrapApiResponse<ExternalCustomerOption>(response)
  },
}
