import type { GalleryImage } from '@/modules/gallery/services/galleryService'
import { API_CONFIG } from '@/shared/config/api.config'
import { describe, expect, it } from 'vitest'
import {
  galleryImageMatchesSearch,
  getDeleteWarningType,
  getGalleryImageScopeKey,
  getGalleryImageUrl,
  hasEditableMetadata,
} from './galleryImageRules'

const image: GalleryImage = {
  id: 1,
  fileName: 'bulk-cargo.jpg',
  url: '/gallery/bulk-cargo.jpg',
  provinceId: 2,
  provinceName: 'Hai Phong',
  portId: 3,
  portName: 'Green Port',
  serviceTypeId: 4,
  serviceTypeName: 'Cargo',
  commodityId: 5,
  commodityName: 'Steel Coil',
}

describe('gallery image rules', () => {
  it('normalizes relative asset paths but preserves remote URLs', () => {
    expect(getGalleryImageUrl('gallery\\photo.jpg')).toBe(
      `${API_CONFIG.ASSET_BASE_URL}/gallery/photo.jpg`
    )
    expect(getGalleryImageUrl('https://cdn.example/photo.jpg')).toBe(
      'https://cdn.example/photo.jpg'
    )
  })

  it('builds the same scoped count key used by the backend query', () => {
    expect(getGalleryImageScopeKey(image)).toBe('2_3_4_5')
  })

  it.each([
    [19, 'over'],
    [18, 'below'],
    [17, 'normal'],
  ] as const)('classifies count %s as %s', (count, expected) => {
    expect(getDeleteWarningType(count)).toBe(expected)
  })

  it('requires all metadata before opening the edit form', () => {
    expect(hasEditableMetadata(image)).toBe(true)
    expect(hasEditableMetadata({ ...image, portId: undefined })).toBe(false)
  })

  it('searches the same visible image metadata case-insensitively', () => {
    expect(galleryImageMatchesSearch(image, 'STEEL')).toBe(true)
    expect(galleryImageMatchesSearch(image, 'green port')).toBe(true)
    expect(galleryImageMatchesSearch(image, 'container')).toBe(false)
  })
})
