import { API_CONFIG } from '@/shared/config/api.config'
import type { PortAreaCode } from '@/shared/domain/portArea'
import type { PageResponse } from '@/shared/types/api.types'
import { apiClient } from '@/shared/utils/apiClient'
import { unwrapApiResponse } from '@/shared/utils/apiUnwrap'

export type PortArea = PortAreaCode

export type PortSearchFieldId =
  | 'area'
  | 'provinceName'
  | 'name'
  | 'portOfCall'
  | 'code'
  | 'zoneCode'
  | 'countryCode'

/** Max page size for multi-page bulk fetch (dropdowns, etc.) */
export const PORTS_PAGE_SIZE = 100

/** Admin Manage Ports table — search-driven, no paging UI */
export const PORTS_ADMIN_LIST_SIZE = 20

export interface Port {
  id: number
  name: string
  portOfCall?: string
  provinceId: number | null
  provinceName?: string | null
  provinceArea?: number | null

  code?: string
  zoneCode?: string
  countryCode?: string
  latitude?: number
  longitude?: number
  hasInfo?: number
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface PortOption {
  id: number
  name: string
  provinceName?: string | null
  code?: string | null
  countryCode?: string | null
}

export interface ListPortsParams {
  page?: number
  size?: number
  q?: string
  searchIn?: PortSearchFieldId
  area?: PortArea
  provinceId?: number
  active?: boolean
}

export interface ListPortOptionsParams {
  q?: string
  ids?: number[]
  limit?: number
}

export interface SavePortPayload {
  name: string
  provinceId: number | null
  portOfCall?: string
  code?: string
  zoneCode?: string
  countryCode?: string
  latitude?: string
  longitude?: string
}

function buildPortsListUrl(params: ListPortsParams = {}): string {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 0))
  search.set('size', String(params.size ?? PORTS_PAGE_SIZE))
  if (params.q?.trim()) search.set('q', params.q.trim())
  if (params.searchIn) search.set('searchIn', params.searchIn)
  if (params.area) {
    search.set('area', String(params.area))
  }
  if (params.provinceId != null) {
    search.set('provinceId', String(params.provinceId))
  }
  if (params.active != null) {
    search.set('active', String(params.active))
  }
  return `${API_CONFIG.PORTS.BASE}?${search.toString()}`
}

async function fetchPortsPage(
  endpoint: string,
  signal?: AbortSignal
): Promise<PageResponse<Port>> {
  const response = await apiClient.get(endpoint, { signal })
  const data = await unwrapApiResponse<PageResponse<Port>>(response)
  if (!data || !Array.isArray(data.content)) {
    return {
      content: [],
      page: 0,
      size: PORTS_PAGE_SIZE,
      totalElements: 0,
      totalPages: 0,
    }
  }
  return data
}

export const portService = {
  async getPortById(id: number): Promise<Port> {
    const response = await apiClient.get(API_CONFIG.PORTS.BY_ID(id))
    return unwrapApiResponse<Port>(response)
  },

  async listPortsPaginated(
    params: ListPortsParams = {},
    signal?: AbortSignal
  ): Promise<PageResponse<Port>> {
    return fetchPortsPage(buildPortsListUrl(params), signal)
  },

  async listPorts(
    params: ListPortsParams = {},
    signal?: AbortSignal
  ): Promise<Port[]> {
    const page = await this.listPortsPaginated(
      {
        ...params,
        page: params.page ?? 0,
      },
      signal
    )
    return page.content
  },

  /** Loads up to `maxPages` × page size (default 5 × 100) for screens that need a broader list */
  async getAllPorts(maxPages = 5): Promise<Port[]> {
    const items: Port[] = []
    for (let page = 0; page < maxPages; page += 1) {
      const batch = await this.listPortsPaginated({
        page,
        size: PORTS_PAGE_SIZE,
      })
      items.push(...batch.content)
      if (page >= batch.totalPages - 1 || !batch.content.length) break
    }
    return items
  },

  async listPortOptions(
    params: ListPortOptionsParams = {}
  ): Promise<PortOption[]> {
    const search = new URLSearchParams()
    if (params.q?.trim()) search.set('q', params.q.trim())
    if (params.ids?.length) search.set('ids', params.ids.join(','))
    if (params.limit != null) search.set('limit', String(params.limit))
    const query = search.toString()
    const endpoint = query
      ? `${API_CONFIG.PORTS.OPTIONS}?${query}`
      : API_CONFIG.PORTS.OPTIONS
    const response = await apiClient.get(endpoint)
    return unwrapApiResponse<PortOption[]>(response)
  },

  async getPortsByArea(
    area: PortArea,
    q?: string,
    signal?: AbortSignal
  ): Promise<Port[]> {
    const page = await this.listPortsPaginated(
      {
        area,
        q,
        page: 0,
        size: PORTS_PAGE_SIZE,
      },
      signal
    )
    return page.content
  },

  async getPortsByProvince(provinceId: number, q?: string): Promise<Port[]> {
    const response = await apiClient.get(
      `${API_CONFIG.PORTS.BY_PROVINCE(provinceId)}${q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`
    )
    return unwrapApiResponse<Port[]>(response)
  },

  async createPort(payload: SavePortPayload): Promise<void> {
    const response = await apiClient.post(API_CONFIG.PORTS.ADMIN_BASE, payload)
    await unwrapApiResponse<Port>(response)
  },

  async updatePort(id: number, payload: SavePortPayload): Promise<void> {
    const response = await apiClient.put(
      API_CONFIG.PORTS.ADMIN_BY_ID(id),
      payload
    )
    await unwrapApiResponse<Port>(response)
  },

  async deletePort(id: number): Promise<void> {
    const response = await apiClient.delete(API_CONFIG.PORTS.ADMIN_BY_ID(id))
    if (!response.ok) {
      throw new Error('Failed to delete port')
    }
  },

  async setPortHasInfo(id: number, hasInfo: 0 | 1): Promise<void> {
    const response = await apiClient.patch(
      API_CONFIG.PORTS.ADMIN_HAS_INFO(id),
      { hasInfo }
    )
    await unwrapApiResponse<Port>(response)
  },
}
