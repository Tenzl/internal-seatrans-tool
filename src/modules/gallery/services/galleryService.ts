import { API_CONFIG } from '@/shared/config/api.config'
import type { ApiResponse, PageResponse } from '@/shared/types/api.types'
import { apiClient } from '@/shared/utils/apiClient'

/** Gallery image shape returned by backend2.0 (flat DTO). */
export interface GalleryImageApiDto {
  id: number
  imageUrl: string
  cloudinaryPublicId?: string | null
  uploadedAt?: string
  uploadedById?: number
  serviceTypeId: number
  commodityId: number
  commodityName: string
  provinceId?: number | null
  provinceName?: string | null
  portId?: number | null
  portName?: string | null
  provinceCode?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface GalleryImage {
  id: number
  fileName: string
  url: string
  provinceId?: number
  provinceName: string
  portId?: number
  portName: string
  serviceTypeId?: number
  serviceTypeName: string
  commodityId?: number
  commodityName: string
  uploadedBy?: number
  uploadedAt?: string
}

export interface UpdateImageRequest {
  provinceId?: number
  portId?: number
  serviceTypeId?: number
  commodityId?: number
}

export interface GalleryCommodityCount {
  commodityId: number
  count: number
}

const toGalleryImage = (raw: GalleryImageApiDto): GalleryImage => ({
  id: raw.id,
  fileName: raw.imageUrl.split('/').pop() || '',
  url: raw.imageUrl,
  provinceId: raw.provinceId ?? undefined,
  provinceName: raw.provinceName ?? '',
  portId: raw.portId ?? undefined,
  portName: raw.portName ?? '',
  serviceTypeId: raw.serviceTypeId,
  serviceTypeName: '',
  commodityId: raw.commodityId,
  commodityName: raw.commodityName,
  uploadedBy: raw.uploadedById,
  uploadedAt: raw.uploadedAt,
})

export const galleryService = {
  getPublicImages: async (
    serviceTypeId?: number,
    commodityId?: number,
    page: number = 0,
    size: number = 100,
    signal?: AbortSignal
  ): Promise<GalleryImage[]> => {
    const params = new URLSearchParams()
    if (serviceTypeId) params.append('serviceTypeId', serviceTypeId.toString())
    if (commodityId) params.append('commodityId', commodityId.toString())
    params.append('page', page.toString())
    params.append('size', size.toString())

    const response = await apiClient.get<
      ApiResponse<PageResponse<GalleryImageApiDto>>
    >(`${API_CONFIG.GALLERY.PUBLIC_IMAGES}?${params.toString()}`, {
      signal,
      skipAuth: true,
    })

    if (!response.ok) {
      throw new Error(
        `Failed to load gallery images: ${response.status} ${response.statusText}`
      )
    }

    const result = await response.json()
    const content = result?.data?.content

    if (!Array.isArray(content)) {
      return []
    }

    return content.map(toGalleryImage)
  },

  getAllImages: async (
    provinceId?: number,
    portId?: number,
    serviceTypeId?: number,
    commodityId?: number,
    page: number = 0,
    size: number = 20
  ): Promise<PageResponse<GalleryImage>> => {
    const params = new URLSearchParams()
    if (provinceId) params.append('provinceId', provinceId.toString())
    if (portId) params.append('portId', portId.toString())
    if (serviceTypeId) params.append('serviceTypeId', serviceTypeId.toString())
    if (commodityId) params.append('commodityId', commodityId.toString())
    params.append('page', page.toString())
    params.append('size', size.toString())

    const response = await apiClient.get<
      ApiResponse<PageResponse<GalleryImageApiDto>>
    >(`${API_CONFIG.GALLERY.ADMIN_BASE}?${params.toString()}`)

    const result = await response.json()

    return {
      ...result.data,
      content: result.data.content.map(toGalleryImage),
    }
  },

  getCommodityCounts: async (
    params: {
      provinceId?: number
      portId?: number
      serviceTypeId?: number
    },
    signal?: AbortSignal
  ): Promise<GalleryCommodityCount[]> => {
    const search = new URLSearchParams()
    if (params.provinceId)
      search.append('provinceId', params.provinceId.toString())
    if (params.portId) search.append('portId', params.portId.toString())
    if (params.serviceTypeId)
      search.append('serviceTypeId', params.serviceTypeId.toString())

    const response = await apiClient.get<
      ApiResponse<GalleryCommodityCount[]>
    >(`${API_CONFIG.GALLERY.ADMIN_COUNTS}?${search.toString()}`, { signal })

    const result = await response.json()
    if (!response.ok || result.success === false) {
      throw new Error(result.message || 'Failed to load image counts')
    }

    return Array.isArray(result.data) ? result.data : []
  },

  uploadImage: async (
    file: File,
    provinceId: number,
    portId: number,
    serviceTypeId: number,
    commodityId: number
  ): Promise<GalleryImage> => {
    const formData = new FormData()
    formData.append('file', file)

    // Send the metadata as query params (not multipart fields): a same-origin
    // reverse proxy can strip multipart text parts, but URL query always survives.
    const params = new URLSearchParams({
      province_id: String(provinceId),
      port_id: String(portId),
      service_type_id: String(serviceTypeId),
      commodity_id: String(commodityId),
    })

    const response = await apiClient.post<ApiResponse<GalleryImageApiDto>>(
      `${API_CONFIG.GALLERY.ADMIN_BASE}?${params.toString()}`,
      formData
    )

    const result = await response.json().catch(() => null)
    // Surface the real backend reason instead of crashing on a null payload.
    // Validation errors are nested under `error.details` (see GlobalExceptionFilter).
    if (!response.ok) {
      const rawDetails = result?.error?.details ?? result?.details
      const details = Array.isArray(rawDetails)
        ? rawDetails
            .map(
              (d: { field?: string; message?: string }) =>
                `${d.field}: ${d.message}`
            )
            .join('; ')
        : ''
      throw new Error(
        details ||
          result?.error?.message ||
          result?.message ||
          `Upload failed (HTTP ${response.status})`
      )
    }
    const dto = (result?.data ?? null) as GalleryImageApiDto | null
    if (!dto || dto.id == null) {
      throw new Error(
        result?.message || 'Upload failed: unexpected server response'
      )
    }
    return toGalleryImage(dto)
  },

  uploadMultiple: async (
    files: File[],
    provinceId: number,
    portId: number,
    serviceTypeId: number,
    commodityId: number
  ): Promise<GalleryImage[]> => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    formData.append('province_id', provinceId.toString())
    formData.append('port_id', portId.toString())
    formData.append('service_type_id', serviceTypeId.toString())
    formData.append('commodity_id', commodityId.toString())

    const response = await apiClient.post<ApiResponse<GalleryImageApiDto[]>>(
      API_CONFIG.GALLERY.ADMIN_BATCH,
      formData
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(
        (error as { message?: string }).message || 'Upload failed'
      )
    }

    const result = await response.json()
    return Array.isArray(result.data) ? result.data.map(toGalleryImage) : []
  },

  updateImage: async (
    id: number,
    data: UpdateImageRequest
  ): Promise<GalleryImage> => {
    const response = await apiClient.put<ApiResponse<GalleryImageApiDto>>(
      API_CONFIG.GALLERY.ADMIN_BY_ID(id),
      data
    )

    const result = await response.json()
    return toGalleryImage(result.data)
  },

  deleteImage: async (id: number): Promise<void> => {
    const response = await apiClient.delete(API_CONFIG.GALLERY.ADMIN_BY_ID(id))

    if (!response.ok) {
      throw new Error('Failed to delete image')
    }
  },
}

export type { PageResponse }
