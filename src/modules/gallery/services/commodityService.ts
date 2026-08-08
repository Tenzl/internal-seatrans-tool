import { galleryService } from '@/modules/gallery/services/galleryService'
import { API_CONFIG } from '@/shared/config/api.config'
import type { ApiResponse } from '@/shared/types/api.types'
import { ApiError, apiClient } from '@/shared/utils/apiClient'

export type CargoType = string

export type CommodityAdminServiceSlug =
  | 'shipping-agency'
  | 'freight-forwarding'

export interface Commodity {
  id: number
  name: string
  displayName: string
  serviceTypeId: number
  serviceTypeName?: string
  requiredImageCount: number
  cargoType: CargoType
  groupId?: number | null
  groupName?: string | null
  /** BE may send `{commodity} IN {group}`; FE also formats locally. */
  displayLabel?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CommodityGroup {
  id: number
  serviceTypeId: number
  serviceSlug: string
  name: string
  commodities: Commodity[]
  createdAt?: string
  updatedAt?: string
}

export interface BookingCommodityOption {
  id: number
  commodityName: string
  groupName: string
  displayLabel: string
}

export interface CargoTypeCatalogItem {
  code: string
  displayLabel: string
  serviceTypeType: string
}

export interface CreateCommodityRequest {
  name: string
  displayName: string
  serviceTypeId: number
  requiredImageCount: number
  cargoType: CargoType
}

export interface CreateGroupedCommodityInput {
  name: string
  displayName: string
  description?: string
  requiredImageCount?: number
  cargoType?: CargoType
}

export interface CreateCommodityGroupRequest {
  serviceSlug: CommodityAdminServiceSlug
  name: string
  commodities: CreateGroupedCommodityInput[]
}

export interface CommodityImageCount {
  commodityId: number
  current: number
  required: number
}

/** Exact booking / AN format: `{commodity} IN {group}`. */
export function formatCommodityInGroupLabel(
  commodityName: string,
  groupName: string
): string {
  const commodity = commodityName.trim()
  const group = groupName.trim()
  if (!commodity) return group
  if (!group) return commodity
  return `${commodity} IN ${group}`
}

function readErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback
  const record = body as {
    message?: unknown
    error?: { message?: unknown }
  }
  const nested =
    typeof record.error?.message === 'string' ? record.error.message.trim() : ''
  const top = typeof record.message === 'string' ? record.message.trim() : ''
  return nested || top || fallback
}

async function throwApiFailure(
  response: Response,
  fallback: string
): Promise<never> {
  const body = await response.json().catch(() => ({}))
  throw new ApiError(readErrorMessage(body, fallback), {
    status: response.status,
  })
}

const unwrapList = async <T>(response: Response): Promise<T[]> => {
  const result = await response.json()
  if (!response.ok || result.success === false) {
    throw new ApiError(readErrorMessage(result, 'Request failed'), {
      status: response.status,
    })
  }
  return Array.isArray(result.data) ? result.data : []
}

const unwrapOne = async <T>(response: Response): Promise<T> => {
  const result = await response.json()
  if (!response.ok || result.success === false) {
    throw new ApiError(readErrorMessage(result, 'Request failed'), {
      status: response.status,
    })
  }
  return result.data as T
}

function mapCommodity(raw: Record<string, unknown>): Commodity {
  const displayName = (raw.displayName as string) ?? ''
  const groupName =
    typeof raw.groupName === 'string' ? raw.groupName : null
  const beLabel =
    typeof raw.displayLabel === 'string' ? raw.displayLabel.trim() : ''
  return {
    id: raw.id as number,
    name: raw.name as string,
    displayName,
    serviceTypeId: raw.serviceTypeId as number,
    requiredImageCount: (raw.requiredImageCount as number) ?? 18,
    cargoType: (raw.cargoType as string) ?? 'IN_BULK',
    groupId:
      typeof raw.groupId === 'number'
        ? raw.groupId
        : raw.groupId == null
          ? null
          : Number(raw.groupId),
    groupName,
    displayLabel:
      beLabel ||
      (groupName
        ? formatCommodityInGroupLabel(displayName || String(raw.name ?? ''), groupName)
        : null),
  }
}

function mapGroup(raw: Record<string, unknown>): CommodityGroup {
  const commoditiesRaw = Array.isArray(raw.commodities) ? raw.commodities : []
  return {
    id: raw.id as number,
    serviceTypeId: raw.serviceTypeId as number,
    serviceSlug: String(raw.serviceSlug ?? ''),
    name: String(raw.name ?? ''),
    commodities: commoditiesRaw.map((item) =>
      mapCommodity(item as Record<string, unknown>)
    ),
    createdAt:
      typeof raw.createdAt === 'string' ? raw.createdAt : undefined,
    updatedAt:
      typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
  }
}

function mapBookingOption(raw: Record<string, unknown>): BookingCommodityOption {
  const commodityName = String(raw.commodityName ?? '').trim()
  const groupName = String(raw.groupName ?? '').trim()
  const beLabel =
    typeof raw.displayLabel === 'string' ? raw.displayLabel.trim() : ''
  return {
    id: Number(raw.id),
    commodityName,
    groupName,
    displayLabel:
      beLabel || formatCommodityInGroupLabel(commodityName, groupName),
  }
}

export const commodityService = {
  list: async (
    params?: {
      serviceTypeId?: number
      q?: string
      limit?: number
    },
    signal?: AbortSignal
  ): Promise<Commodity[]> => {
    const response = await apiClient.get<
      ApiResponse<Record<string, unknown>[]>
    >(API_CONFIG.COMMODITIES.LIST(params), { signal })
    const rows = await unwrapList<Record<string, unknown>>(response)
    return rows.map(mapCommodity)
  },

  getCommoditiesByServiceType: async (
    serviceTypeId: number,
    signal?: AbortSignal
  ): Promise<Commodity[]> => {
    return commodityService.list({ serviceTypeId }, signal)
  },

  listGroups: async (
    params?: { serviceSlug?: CommodityAdminServiceSlug; q?: string },
    signal?: AbortSignal
  ): Promise<CommodityGroup[]> => {
    const response = await apiClient.get<
      ApiResponse<Record<string, unknown>[]>
    >(API_CONFIG.COMMODITY_GROUPS.ADMIN_LIST(params), { signal })
    const rows = await unwrapList<Record<string, unknown>>(response)
    return rows.map(mapGroup)
  },

  createGroup: async (
    data: CreateCommodityGroupRequest
  ): Promise<CommodityGroup> => {
    const response = await apiClient.post<ApiResponse<Record<string, unknown>>>(
      API_CONFIG.COMMODITY_GROUPS.ADMIN_BASE,
      data
    )
    if (!response.ok) {
      await throwApiFailure(response, 'Failed to create commodity group')
    }
    return mapGroup(await unwrapOne<Record<string, unknown>>(response))
  },

  addCommodityToGroup: async (
    groupId: number,
    data: CreateGroupedCommodityInput
  ): Promise<Commodity> => {
    const response = await apiClient.post<ApiResponse<Record<string, unknown>>>(
      API_CONFIG.COMMODITY_GROUPS.ADMIN_COMMODITIES(groupId),
      data
    )
    if (!response.ok) {
      await throwApiFailure(response, 'Failed to add commodity')
    }
    return mapCommodity(await unwrapOne<Record<string, unknown>>(response))
  },

  deleteGroup: async (id: number): Promise<void> => {
    const response = await apiClient.delete(
      API_CONFIG.COMMODITY_GROUPS.ADMIN_BY_ID(id)
    )
    if (!response.ok) {
      await throwApiFailure(response, 'Failed to delete commodity group')
    }
  },

  updateGroup: async (
    id: number,
    data: { name: string }
  ): Promise<CommodityGroup> => {
    const response = await apiClient.patch<ApiResponse<Record<string, unknown>>>(
      API_CONFIG.COMMODITY_GROUPS.ADMIN_BY_ID(id),
      data
    )
    if (!response.ok) {
      await throwApiFailure(response, 'Failed to rename commodity group')
    }
    return mapGroup(await unwrapOne<Record<string, unknown>>(response))
  },

  /** Freight-forwarding options for booking commodity + AN description. */
  listBookingOptions: async (
    signal?: AbortSignal
  ): Promise<BookingCommodityOption[]> => {
    const response = await apiClient.get<
      ApiResponse<Record<string, unknown>[]>
    >(API_CONFIG.COMMODITIES.ADMIN_BOOKING_OPTIONS, { signal })
    const rows = await unwrapList<Record<string, unknown>>(response)
    return rows.map(mapBookingOption)
  },

  getImageCount: async (
    commodityId: number,
    provinceId?: number,
    portId?: number,
    serviceTypeId?: number,
    signal?: AbortSignal
  ): Promise<CommodityImageCount> => {
    const commodities = serviceTypeId
      ? await commodityService.list({ serviceTypeId }, signal)
      : []
    const commodity = commodities.find((c) => c.id === commodityId)
    const required = commodity?.requiredImageCount ?? 18

    const counts = await galleryService.getCommodityCounts(
      {
        provinceId,
        portId,
        serviceTypeId,
      },
      signal
    )
    const current =
      counts.find((row) => row.commodityId === commodityId)?.count ?? 0

    return { commodityId, current, required }
  },

  /** One request for all commodity counts in the current filter scope. */
  getImageCounts: async (
    params: {
      provinceId?: number
      portId?: number
      serviceTypeId?: number
    },
    signal?: AbortSignal
  ): Promise<Record<number, number>> => {
    const rows = await galleryService.getCommodityCounts(params, signal)
    const map: Record<number, number> = {}
    for (const row of rows) {
      map[row.commodityId] = row.count
    }
    return map
  },

  createCommodity: async (data: CreateCommodityRequest): Promise<Commodity> => {
    const response = await apiClient.post<ApiResponse<Record<string, unknown>>>(
      API_CONFIG.COMMODITIES.ADMIN_BASE,
      data
    )
    if (!response.ok) {
      await throwApiFailure(response, 'Failed to create commodity')
    }
    return mapCommodity(await unwrapOne<Record<string, unknown>>(response))
  },

  updateCommodity: async (
    id: number,
    data: CreateCommodityRequest
  ): Promise<Commodity> => {
    const response = await apiClient.put<ApiResponse<Record<string, unknown>>>(
      API_CONFIG.COMMODITIES.ADMIN_BY_ID(id),
      data
    )
    if (!response.ok) {
      await throwApiFailure(response, 'Failed to update commodity')
    }
    return mapCommodity(await unwrapOne<Record<string, unknown>>(response))
  },

  deleteCommodity: async (id: number): Promise<void> => {
    const response = await apiClient.delete(
      API_CONFIG.COMMODITIES.ADMIN_BY_ID(id)
    )
    if (!response.ok) {
      await throwApiFailure(response, 'Failed to delete commodity')
    }
  },
}
