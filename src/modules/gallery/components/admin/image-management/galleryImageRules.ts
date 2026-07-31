import type { GalleryImage } from '@/modules/gallery/services/galleryService'
import { API_CONFIG } from '@/shared/config/api.config'

export type DeleteWarningType = 'over' | 'below' | 'normal'

export const GALLERY_IMAGES_PER_PAGE = 6

export function getGalleryImageUrl(url: string): string {
  if (!url || url.startsWith('http')) return url

  const normalizedPath = url.replace(/\\/g, '/')
  const path = normalizedPath.startsWith('/')
    ? normalizedPath
    : `/${normalizedPath}`
  return `${API_CONFIG.ASSET_BASE_URL}${path}`
}

export function getGalleryImageScopeKey(
  image: Pick<
    GalleryImage,
    'provinceId' | 'portId' | 'serviceTypeId' | 'commodityId'
  >
): string {
  return `${image.provinceId}_${image.portId}_${image.serviceTypeId}_${image.commodityId}`
}

export function getDeleteWarningType(count: number): DeleteWarningType {
  if (count > 18) return 'over'
  if (count === 18) return 'below'
  return 'normal'
}

export function hasEditableMetadata(
  image: Pick<
    GalleryImage,
    'provinceId' | 'portId' | 'serviceTypeId' | 'commodityId'
  >
): boolean {
  return Boolean(
    image.provinceId && image.portId && image.serviceTypeId && image.commodityId
  )
}

export function galleryImageMatchesSearch(
  image: GalleryImage,
  value: unknown
): boolean {
  const query = String(value || '')
    .toLowerCase()
    .trim()
  if (!query) return true

  return [
    image.fileName,
    image.provinceName,
    image.portName,
    image.commodityName,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .includes(query)
}
