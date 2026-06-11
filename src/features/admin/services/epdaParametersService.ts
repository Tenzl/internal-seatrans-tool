import { API_CONFIG } from '@/shared/config/api.config'
import { apiClient } from '@/shared/utils/apiClient'
import { unwrapApiResponse } from '@/shared/utils/apiUnwrap'
import type {
  EpdaParameterValues,
  PartialEpdaParameterValues,
  GrtTier,
  LoaTier,
} from '@/modules/inquiries/components/common/quoteParameters'

export type {
  EpdaParameterValues,
  PartialEpdaParameterValues,
  GrtTier,
  LoaTier,
}

/** @deprecated use GrtTier — kept for backward-compatible imports. */
export type AgencyFeeTier = GrtTier

export type EpdaParameterScope = 'AREA' | 'PORT'

export interface EpdaParameterSet {
  id: number
  scope: EpdaParameterScope
  area: string | null
  portId: number | null
  values: PartialEpdaParameterValues
  createdAt?: string
  updatedAt?: string
}

export type EpdaParameterChangeAction = 'UPSERT_AREA' | 'UPSERT_PORT' | 'DELETE_PORT'

export interface EpdaParameterChangeLogEntry {
  id: number
  scope: EpdaParameterScope
  area: string | null
  portId: number | null
  action: EpdaParameterChangeAction
  createdAt: string
  changedBy: { id: number | null; fullName: string | null; email: string | null }
  beforeValues: PartialEpdaParameterValues | null
  afterValues: PartialEpdaParameterValues | null
}

export const epdaParametersService = {
  async listAll(): Promise<EpdaParameterSet[]> {
    const res = await apiClient.get(API_CONFIG.EPDA_PARAMETERS.LIST)
    return unwrapApiResponse<EpdaParameterSet[]>(res)
  },

  async getEffective(
    area: string,
    portId?: number,
  ): Promise<EpdaParameterValues> {
    const res = await apiClient.get(
      API_CONFIG.EPDA_PARAMETERS.EFFECTIVE(area, portId),
    )
    return unwrapApiResponse<EpdaParameterValues>(res)
  },

  async getArea(area: string): Promise<EpdaParameterSet | null> {
    const res = await apiClient.get(API_CONFIG.EPDA_PARAMETERS.AREA(area))
    return unwrapApiResponse<EpdaParameterSet | null>(res)
  },

  async upsertArea(
    area: string,
    values: PartialEpdaParameterValues,
  ): Promise<EpdaParameterSet> {
    const res = await apiClient.put(API_CONFIG.EPDA_PARAMETERS.AREA(area), {
      values,
    })
    return unwrapApiResponse<EpdaParameterSet>(res)
  },

  async getPort(portId: number): Promise<EpdaParameterSet | null> {
    const res = await apiClient.get(API_CONFIG.EPDA_PARAMETERS.PORT(portId))
    return unwrapApiResponse<EpdaParameterSet | null>(res)
  },

  async upsertPort(
    portId: number,
    values: PartialEpdaParameterValues,
  ): Promise<EpdaParameterSet> {
    const res = await apiClient.put(API_CONFIG.EPDA_PARAMETERS.PORT(portId), {
      values,
    })
    return unwrapApiResponse<EpdaParameterSet>(res)
  },

  async deletePort(portId: number): Promise<void> {
    const res = await apiClient.delete(API_CONFIG.EPDA_PARAMETERS.PORT(portId))
    if (!res.ok && res.status !== 204) {
      throw new Error('Failed to remove port override')
    }
  },

  async listChangeLogs(opts?: {
    area?: string
    portId?: number
    limit?: number
  }): Promise<EpdaParameterChangeLogEntry[]> {
    const res = await apiClient.get(API_CONFIG.EPDA_PARAMETERS.LOGS(opts))
    return unwrapApiResponse<EpdaParameterChangeLogEntry[]>(res)
  },
}
