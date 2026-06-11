import { apiClient } from '@/shared/utils/apiClient'
import { API_CONFIG } from '@/shared/config/api.config'
import type { ApiResponse, PageResponse } from '@/shared/types/api.types'
import { commodityService, type Commodity } from '@/modules/gallery/services/commodityService'

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
  getCommoditiesByServiceType: async (
    serviceTypeId: number,
    _signal?: AbortSignal,
  ): Promise<Commodity[]> => {
    return commodityService.getCommoditiesByServiceType(serviceTypeId)
  },

  getPublicImages: async (
    serviceTypeId?: number,
    commodityId?: number,
    page: number = 0,
    size: number = 100,
    signal?: AbortSignal,
  ): Promise<GalleryImage[]> => {
    const params = new URLSearchParams()
    if (serviceTypeId) params.append('serviceTypeId', serviceTypeId.toString())
    if (commodityId) params.append('commodityId', commodityId.toString())
    params.append('page', page.toString())
    params.append('size', size.toString())

    const response = await apiClient.get<ApiResponse<PageResponse<GalleryImageApiDto>>>(
      `${API_CONFIG.GALLERY.PUBLIC_IMAGES}?${params.toString()}`,
      { signal, skipAuth: true },
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to load gallery images', response.status, errorText)
      throw new Error(`Failed to load gallery images: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    const content = result?.data?.content

    if (!Array.isArray(content)) {
      console.error('Invalid gallery images response', result)
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
    size: number = 20,
  ): Promise<PageResponse<GalleryImage>> => {
    const params = new URLSearchParams()
    if (provinceId) params.append('provinceId', provinceId.toString())
    if (portId) params.append('portId', portId.toString())
    if (serviceTypeId) params.append('serviceTypeId', serviceTypeId.toString())
    if (commodityId) params.append('commodityId', commodityId.toString())
    params.append('page', page.toString())
    params.append('size', size.toString())

    const response = await apiClient.get<ApiResponse<PageResponse<GalleryImageApiDto>>>(
      `${API_CONFIG.GALLERY.ADMIN_BASE}?${params.toString()}`,
    )

    const result = await response.json()

    return {
      ...result.data,
      content: result.data.content.map(toGalleryImage),
    }
  },

  uploadImage: async (
    file: File,
    provinceId: number,
    portId: number,
    serviceTypeId: number,
    commodityId: number,
  ): Promise<GalleryImage> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('province_id', provinceId.toString())
    formData.append('port_id', portId.toString())
    formData.append('service_type_id', serviceTypeId.toString())
    formData.append('commodity_id', commodityId.toString())

    const response = await apiClient.post<ApiResponse<GalleryImageApiDto>>(
      API_CONFIG.GALLERY.ADMIN_BASE,
      formData,
    )

    const result = await response.json()
    return toGalleryImage(result.data)
  },

  uploadMultiple: async (
    files: File[],
    provinceId: number,
    portId: number,
    serviceTypeId: number,
    commodityId: number,
  ): Promise<GalleryImage[]> => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    formData.append('province_id', provinceId.toString())
    formData.append('port_id', portId.toString())
    formData.append('service_type_id', serviceTypeId.toString())
    formData.append('commodity_id', commodityId.toString())

    const response = await apiClient.post<ApiResponse<GalleryImageApiDto[]>>(
      API_CONFIG.GALLERY.ADMIN_BATCH,
      formData,
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error((error as { message?: string }).message || 'Upload failed')
    }

    const result = await response.json()
    return Array.isArray(result.data) ? result.data.map(toGalleryImage) : []
  },

  updateImage: async (id: number, data: UpdateImageRequest): Promise<GalleryImage> => {
    const response = await apiClient.put<ApiResponse<GalleryImageApiDto>>(
      API_CONFIG.GALLERY.ADMIN_BY_ID(id),
      data,
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
