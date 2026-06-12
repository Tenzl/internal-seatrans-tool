import { apiClient } from '@/shared/utils/apiClient'
import { API_CONFIG } from '@/shared/config/api.config'
import type { ApiResponse } from '@/shared/types/api.types'
import { galleryService } from '@/modules/gallery/services/galleryService'

export type CargoType = string

export interface Commodity {
  id: number
  name: string
  displayName: string
  serviceTypeId: number
  serviceTypeName?: string
  requiredImageCount: number
  cargoType: CargoType
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CargoTypeCatalogItem {
  code: string
  displayLabel: string
  serviceTypeType: string
}

export interface CargoTypeCatalogUpsertRequest {
  serviceTypeId: number
  code: string
  displayLabel: string
}

export interface CreateCommodityRequest {
  name: string
  displayName: string
  serviceTypeId: number
  requiredImageCount: number
  cargoType: CargoType
}

export interface CommodityImageCount {
  commodityId: number
  current: number
  required: number
}

const unwrapList = async <T>(response: Response): Promise<T[]> => {
  const result = await response.json()
  if (!response.ok || result.success === false) {
    throw new Error(result.message || 'Request failed')
  }
  return Array.isArray(result.data) ? result.data : []
}

const unwrapOne = async <T>(response: Response): Promise<T> => {
  const result = await response.json()
  if (!response.ok || result.success === false) {
    throw new Error(result.message || 'Request failed')
  }
  return result.data as T
}

function mapCommodity(raw: Record<string, unknown>): Commodity {
  return {
    id: raw.id as number,
    name: raw.name as string,
    displayName: raw.displayName as string,
    serviceTypeId: raw.serviceTypeId as number,
    requiredImageCount: (raw.requiredImageCount as number) ?? 18,
    cargoType: (raw.cargoType as string) ?? 'IN_BULK',
    isActive: raw.isActive !== false,
  }
}

export const commodityService = {
  getCommoditiesByServiceType: async (serviceTypeId: number): Promise<Commodity[]> => {
    const response = await apiClient.get<ApiResponse<Record<string, unknown>[]>>(
      API_CONFIG.COMMODITIES.BY_SERVICE_TYPE(serviceTypeId),
    )
    const rows = await unwrapList<Record<string, unknown>>(response)
    return rows.map(mapCommodity)
  },

  getImageCount: async (
    commodityId: number,
    provinceId?: number,
    portId?: number,
    serviceTypeId?: number,
  ): Promise<CommodityImageCount> => {
    const commodities = serviceTypeId
      ? await commodityService.getCommoditiesByServiceType(serviceTypeId)
      : []
    const commodity = commodities.find((c) => c.id === commodityId)
    const required = commodity?.requiredImageCount ?? 18

    const page = await galleryService.getAllImages(
      provinceId,
      portId,
      serviceTypeId,
      commodityId,
      0,
      1,
    )

    return { commodityId, current: page.totalElements ?? 0, required }
  },

  getCargoTypesByServiceType: async (serviceTypeId: number): Promise<CargoTypeCatalogItem[]> => {
    const response = await apiClient.get<ApiResponse<CargoTypeCatalogItem[]>>(
      API_CONFIG.CARGO_TYPES.BY_SERVICE_TYPE(serviceTypeId),
    )
    return unwrapList<CargoTypeCatalogItem>(response)
  },

  createCargoType: async (data: CargoTypeCatalogUpsertRequest): Promise<CargoTypeCatalogItem> => {
    const response = await apiClient.post<ApiResponse<CargoTypeCatalogItem>>(
      API_CONFIG.CARGO_TYPES.ADMIN_BASE,
      data,
    )
    return unwrapOne<CargoTypeCatalogItem>(response)
  },

  updateCargoType: async (data: CargoTypeCatalogUpsertRequest): Promise<CargoTypeCatalogItem> => {
    const response = await apiClient.put<ApiResponse<CargoTypeCatalogItem>>(
      API_CONFIG.CARGO_TYPES.ADMIN_BY_KEY(data.serviceTypeId, data.code),
      { displayLabel: data.displayLabel },
    )
    return unwrapOne<CargoTypeCatalogItem>(response)
  },

  deleteCargoType: async (serviceTypeId: number, code: string): Promise<void> => {
    const response = await apiClient.delete(API_CONFIG.CARGO_TYPES.ADMIN_BY_KEY(serviceTypeId, code))
    if (!response.ok) {
      const result = await response.json().catch(() => ({}))
      throw new Error((result as { message?: string }).message || 'Failed to delete cargo type')
    }
  },

  createCommodity: async (data: CreateCommodityRequest): Promise<Commodity> => {
    const response = await apiClient.post<ApiResponse<Record<string, unknown>>>(
      API_CONFIG.COMMODITIES.ADMIN_BASE,
      data,
    )
    return mapCommodity(await unwrapOne<Record<string, unknown>>(response))
  },

  updateCommodity: async (id: number, data: CreateCommodityRequest): Promise<Commodity> => {
    const response = await apiClient.put<ApiResponse<Record<string, unknown>>>(
      API_CONFIG.COMMODITIES.ADMIN_BY_ID(id),
      data,
    )
    return mapCommodity(await unwrapOne<Record<string, unknown>>(response))
  },

  deleteCommodity: async (id: number): Promise<void> => {
    const response = await apiClient.delete(API_CONFIG.COMMODITIES.ADMIN_BY_ID(id))
    if (!response.ok) {
      const result = await response.json().catch(() => ({}))
      throw new Error((result as { message?: string }).message || 'Failed to delete commodity')
    }
  },
}
