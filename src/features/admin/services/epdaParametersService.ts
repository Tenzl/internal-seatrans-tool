import { API_CONFIG } from '@/shared/config/api.config'
import { apiClient } from '@/shared/utils/apiClient'
import { unwrapApiResponse } from '@/shared/utils/apiUnwrap'
import {
  normalizeParameterValues,
  type EpdaParameterValues,
  type PartialEpdaParameterValues,
  type GrtTier,
  type LoaTier,
} from '@/modules/inquiries/components/common/quoteParameters'

export type {
  EpdaParameterValues,
  PartialEpdaParameterValues,
  GrtTier,
  LoaTier,
}

export type EpdaParameterScope = 'AREA' | 'GROUP' | 'PORT'

export interface EpdaParameterSet {
  id: number
  scope: EpdaParameterScope
  area: '1' | '2' | '3' | null
  portId: number | null
  /** GROUP rows only. */
  name?: string | null
  /** GROUP rows only — port ids that belong to the group. */
  memberPortIds?: number[] | null
  values: PartialEpdaParameterValues
  createdAt?: string
  updatedAt?: string
}

export type EpdaParameterChangeAction =
  | 'UPSERT_AREA'
  | 'UPSERT_PORT'
  | 'DELETE_PORT'
  | 'UPSERT_GROUP'
  | 'DELETE_GROUP'
  | 'SET_GROUP_MEMBERS'

export interface EpdaParameterChangeLogEntry {
  id: number
  scope: EpdaParameterScope
  area: '1' | '2' | '3' | null
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
    area: '1' | '2' | '3',
    portId?: number,
    signal?: AbortSignal,
  ): Promise<EpdaParameterValues> {
    const safePortId =
      portId != null && Number.isFinite(portId) && portId > 0 ? portId : undefined
    const endpoint = API_CONFIG.EPDA_PARAMETERS.EFFECTIVE(area, safePortId)
    const res = signal
      ? await apiClient.get(endpoint, { signal })
      : await apiClient.get(endpoint)
    const values = await unwrapApiResponse<EpdaParameterValues>(res)
    return normalizeParameterValues(values)
  },

  async getArea(area: '1' | '2' | '3'): Promise<EpdaParameterSet | null> {
    const res = await apiClient.get(API_CONFIG.EPDA_PARAMETERS.AREA(area))
    return unwrapApiResponse<EpdaParameterSet | null>(res)
  },

  async upsertArea(
    area: '1' | '2' | '3',
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

  // ---------- port groups ----------

  async listGroups(area: '1' | '2' | '3'): Promise<EpdaParameterSet[]> {
    const res = await apiClient.get(API_CONFIG.EPDA_PARAMETERS.GROUPS(area))
    return unwrapApiResponse<EpdaParameterSet[]>(res)
  },

  async createGroup(
    area: '1' | '2' | '3',
    name: string,
    values?: PartialEpdaParameterValues,
  ): Promise<EpdaParameterSet> {
    const res = await apiClient.post(API_CONFIG.EPDA_PARAMETERS.GROUPS_CREATE, {
      area,
      name,
      values: values ?? {},
    })
    return unwrapApiResponse<EpdaParameterSet>(res)
  },

  async updateGroup(
    id: number,
    patch: { name?: string; values?: PartialEpdaParameterValues },
  ): Promise<EpdaParameterSet> {
    const res = await apiClient.put(API_CONFIG.EPDA_PARAMETERS.GROUP(id), patch)
    return unwrapApiResponse<EpdaParameterSet>(res)
  },

  async setGroupMembers(id: number, portIds: number[]): Promise<EpdaParameterSet> {
    const res = await apiClient.put(API_CONFIG.EPDA_PARAMETERS.GROUP_MEMBERS(id), {
      portIds,
    })
    return unwrapApiResponse<EpdaParameterSet>(res)
  },

  async deleteGroup(id: number): Promise<void> {
    const res = await apiClient.delete(API_CONFIG.EPDA_PARAMETERS.GROUP(id))
    if (!res.ok && res.status !== 204) {
      throw new Error('Failed to delete group')
    }
  },

  async listChangeLogs(opts?: {
    area?: '1' | '2' | '3'
    portId?: number
    limit?: number
  }): Promise<EpdaParameterChangeLogEntry[]> {
    const res = await apiClient.get(API_CONFIG.EPDA_PARAMETERS.LOGS(opts))
    return unwrapApiResponse<EpdaParameterChangeLogEntry[]>(res)
  },
}
