import {
  assertSerializableParameterValues,
  normalizeParameterValues,
  sanitizePartialParameterValues,
  type EpdaParameterValues,
  type PartialEpdaParameterValues,
  type GrtTier,
  type LoaTier,
} from '@/modules/inquiries/components/common/quoteParameters'
import { API_CONFIG } from '@/shared/config/api.config'
import { apiClient } from '@/shared/utils/apiClient'
import { unwrapApiResponse } from '@/shared/utils/apiUnwrap'

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
  version: number
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
  changedBy: {
    id: number | null
    fullName: string | null
    email: string | null
  }
  beforeValues: PartialEpdaParameterValues | null
  afterValues: PartialEpdaParameterValues | null
  portName?: string | null
  details?: Record<string, unknown> | null
}

function withExpectedVersion(
  endpoint: string,
  expectedVersion: number
): string {
  const separator = endpoint.includes('?') ? '&' : '?'
  return `${endpoint}${separator}expectedVersion=${expectedVersion}`
}

function assertNoVersionConflict(response: Response): void {
  if (response.status === 409) {
    throw new Error(
      'Parameters were changed by another user. Reload the latest values before saving.'
    )
  }
}

function prepareValuesForWrite(
  values: PartialEpdaParameterValues
): PartialEpdaParameterValues {
  const sanitized = sanitizePartialParameterValues(values)
  assertSerializableParameterValues(sanitized)
  return sanitized
}

export type PortOverrideWritePlan =
  | { action: 'none' }
  | { action: 'delete'; expectedVersion: number }
  | {
      action: 'upsert'
      values: PartialEpdaParameterValues
      expectedVersion: number | null
    }

export function planPortOverrideWrite(
  values: PartialEpdaParameterValues,
  existing?: EpdaParameterSet
): PortOverrideWritePlan {
  if (Object.keys(values).length === 0) {
    return existing
      ? { action: 'delete', expectedVersion: existing.version }
      : { action: 'none' }
  }
  return {
    action: 'upsert',
    values,
    expectedVersion: existing?.version ?? null,
  }
}

export const epdaParametersService = {
  async listAll(): Promise<EpdaParameterSet[]> {
    const res = await apiClient.get(API_CONFIG.EPDA_PARAMETERS.LIST)
    return unwrapApiResponse<EpdaParameterSet[]>(res)
  },

  async getEffective(
    area?: '1' | '2' | '3',
    portId?: number,
    signal?: AbortSignal
  ): Promise<EpdaParameterValues> {
    const safePortId =
      portId != null && Number.isFinite(portId) && portId > 0
        ? portId
        : undefined
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
    expectedVersion: number | null
  ): Promise<EpdaParameterSet> {
    const sanitizedValues = prepareValuesForWrite(values)
    const res = await apiClient.put(API_CONFIG.EPDA_PARAMETERS.AREA(area), {
      values: sanitizedValues,
      expectedVersion,
    })
    assertNoVersionConflict(res)
    return unwrapApiResponse<EpdaParameterSet>(res)
  },

  async getPort(portId: number): Promise<EpdaParameterSet | null> {
    const res = await apiClient.get(API_CONFIG.EPDA_PARAMETERS.PORT(portId))
    return unwrapApiResponse<EpdaParameterSet | null>(res)
  },

  async upsertPort(
    portId: number,
    values: PartialEpdaParameterValues,
    expectedVersion: number | null
  ): Promise<EpdaParameterSet> {
    const sanitizedValues = prepareValuesForWrite(values)
    /* eslint-disable no-console -- local EPDA payload diagnostics */
    if (process.env.NODE_ENV === 'development') {
      console.groupCollapsed(`[EPDA] PUT PORT override #${portId}`)
      console.log('raw diff', values)
      console.log('sanitized payload values', sanitizedValues)
      console.log('request body', {
        values: sanitizedValues,
        expectedVersion,
      })
      console.groupEnd()
    }
    /* eslint-enable no-console */
    const res = await apiClient.put(API_CONFIG.EPDA_PARAMETERS.PORT(portId), {
      values: sanitizedValues,
      expectedVersion,
    })
    /* eslint-disable no-console -- local EPDA response diagnostics */
    if (process.env.NODE_ENV === 'development' && !res.ok) {
      console.error(`[EPDA] PUT PORT override #${portId} rejected`, {
        status: res.status,
        statusText: res.statusText,
        responseBody: await res.clone().text(),
      })
    }
    /* eslint-enable no-console */
    assertNoVersionConflict(res)
    return unwrapApiResponse<EpdaParameterSet>(res)
  },

  async deletePort(portId: number, expectedVersion: number): Promise<void> {
    const res = await apiClient.delete(
      withExpectedVersion(
        API_CONFIG.EPDA_PARAMETERS.PORT(portId),
        expectedVersion
      )
    )
    assertNoVersionConflict(res)
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
    values?: PartialEpdaParameterValues
  ): Promise<EpdaParameterSet> {
    const sanitizedValues = prepareValuesForWrite(values ?? {})
    const res = await apiClient.post(API_CONFIG.EPDA_PARAMETERS.GROUPS_CREATE, {
      area,
      name,
      values: sanitizedValues,
    })
    return unwrapApiResponse<EpdaParameterSet>(res)
  },

  async updateGroup(
    id: number,
    patch: {
      name?: string
      values?: PartialEpdaParameterValues
      expectedVersion: number
    }
  ): Promise<EpdaParameterSet> {
    const sanitizedPatch = patch.values
      ? { ...patch, values: prepareValuesForWrite(patch.values) }
      : patch
    const res = await apiClient.put(
      API_CONFIG.EPDA_PARAMETERS.GROUP(id),
      sanitizedPatch
    )
    assertNoVersionConflict(res)
    return unwrapApiResponse<EpdaParameterSet>(res)
  },

  async setGroupMembers(
    id: number,
    portIds: number[],
    expectedVersion: number
  ): Promise<EpdaParameterSet> {
    const res = await apiClient.put(
      API_CONFIG.EPDA_PARAMETERS.GROUP_MEMBERS(id),
      {
        portIds,
        expectedVersion,
      }
    )
    assertNoVersionConflict(res)
    return unwrapApiResponse<EpdaParameterSet>(res)
  },

  async deleteGroup(id: number, expectedVersion: number): Promise<void> {
    const res = await apiClient.delete(
      withExpectedVersion(API_CONFIG.EPDA_PARAMETERS.GROUP(id), expectedVersion)
    )
    assertNoVersionConflict(res)
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
