import { apiClient } from '@/shared/utils/apiClient'
import { API_CONFIG } from '@/shared/config/api.config'
import type { ApiResponse, PageResponse } from '@/shared/types/api.types'

export type PortArea = 'NORTHERN' | 'MIDDLE' | 'SOUTHERN'

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
  provinceArea?: string | null

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
}

export interface ListPortsParams {
  page?: number
  size?: number
  q?: string
  searchIn?: PortSearchFieldId
  area?: PortArea | string
  provinceId?: number
  active?: boolean
}

export interface ListPortOptionsParams {
  q?: string
  ids?: number[]
  limit?: number
}

function buildPortsListUrl(params: ListPortsParams = {}): string {
  const search = new URLSearchParams()
  search.set('page', String(params.page ?? 0))
  search.set('size', String(params.size ?? PORTS_PAGE_SIZE))
  if (params.q?.trim()) search.set('q', params.q.trim())
  if (params.searchIn) search.set('searchIn', params.searchIn)
  if (params.area) {
    search.set('area', params.area.trim().toUpperCase())
  }
  if (params.provinceId != null) {
    search.set('provinceId', String(params.provinceId))
  }
  if (params.active != null) {
    search.set('active', String(params.active))
  }
  return `${API_CONFIG.PORTS.BASE}?${search.toString()}`
}

async function fetchPortsPage(endpoint: string): Promise<PageResponse<Port>> {
  const response = await apiClient.get<ApiResponse<PageResponse<Port>>>(endpoint)
  if (!response.ok) {
    throw new Error('Failed to load ports')
  }
  const payload = await response.json()
  const data = payload.data
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
    const response = await apiClient.get<ApiResponse<Port>>(API_CONFIG.PORTS.BY_ID(id))
    if (!response.ok) {
      throw new Error('Failed to load port details')
    }
    const data = await response.json()
    if (!data.data) {
      throw new Error('Port not found')
    }
    return data.data
  },

  async listPortsPaginated(params: ListPortsParams = {}): Promise<PageResponse<Port>> {
    return fetchPortsPage(buildPortsListUrl(params))
  },

  async listPorts(params: ListPortsParams = {}): Promise<Port[]> {
    const page = await this.listPortsPaginated({ ...params, page: params.page ?? 0 })
    return page.content
  },

  /** Loads up to `maxPages` × page size (default 5 × 100) for screens that need a broader list */
  async getAllPorts(maxPages = 5): Promise<Port[]> {
    const items: Port[] = []
    for (let page = 0; page < maxPages; page += 1) {
      const batch = await this.listPortsPaginated({ page, size: PORTS_PAGE_SIZE })
      items.push(...batch.content)
      if (page >= batch.totalPages - 1 || !batch.content.length) break
    }
    return items
  },

  async listPortOptions(params: ListPortOptionsParams = {}): Promise<PortOption[]> {
    const search = new URLSearchParams()
    if (params.q?.trim()) search.set('q', params.q.trim())
    if (params.ids?.length) search.set('ids', params.ids.join(','))
    if (params.limit != null) search.set('limit', String(params.limit))
    const query = search.toString()
    const endpoint = query ? `${API_CONFIG.PORTS.OPTIONS}?${query}` : API_CONFIG.PORTS.OPTIONS
    const response = await apiClient.get<ApiResponse<PortOption[]>>(endpoint)
    if (!response.ok) {
      throw new Error('Failed to load port options')
    }
    const data = await response.json()
    return data.data ?? []
  },

  async getPortsByArea(area: PortArea | string, q?: string): Promise<Port[]> {
    const page = await this.listPortsPaginated({
      area,
      q,
      page: 0,
      size: PORTS_PAGE_SIZE,
    })
    return page.content
  },

  async getPortsByProvince(provinceId: number, q?: string): Promise<Port[]> {
    const response = await apiClient.get<ApiResponse<Port[]>>(
      `${API_CONFIG.PORTS.BY_PROVINCE(provinceId)}${q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`,
    )
    const data = await response.json()
    return data.data ?? []
  },
}
