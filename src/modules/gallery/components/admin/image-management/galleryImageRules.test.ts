import {
  changeGalleryCommodityType,
  changeGalleryService,
  galleryCatalogSelectionFromImage,
  galleryService,
  type GalleryImage,
} from '@/modules/gallery/services/galleryService'
import { API_CONFIG } from '@/shared/config/api.config'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  galleryImageMatchesSearch,
  getDeleteWarningType,
  getGalleryImageScopeKey,
  getGalleryImageUrl,
  hasEditableMetadata,
} from './galleryImageRules'

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('@/shared/utils/apiClient', () => ({
  apiClient: apiClientMock,
}))

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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes relative asset paths but preserves non-Cloudinary remote URLs', () => {
    expect(getGalleryImageUrl('gallery\\photo.jpg')).toBe(
      `${API_CONFIG.ASSET_BASE_URL}/gallery/photo.jpg`
    )
    expect(getGalleryImageUrl('https://cdn.example/photo.jpg')).toBe(
      'https://cdn.example/photo.jpg'
    )
  })

  it('applies Cloudinary delivery transforms by variant', () => {
    const original =
      'https://res.cloudinary.com/demo/image/upload/v123/gallery/bulk.jpg'
    expect(getGalleryImageUrl(original, 'thumb')).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_96,c_limit/v123/gallery/bulk.jpg'
    )
    expect(getGalleryImageUrl(original, 'card')).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_800,c_limit/v123/gallery/bulk.jpg'
    )
    expect(getGalleryImageUrl(original, 'full')).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit/v123/gallery/bulk.jpg'
    )
  })

  it('replaces an existing Cloudinary transform segment', () => {
    const alreadyTransformed =
      'https://res.cloudinary.com/demo/image/upload/w_2000/v123/gallery/bulk.jpg'
    expect(getGalleryImageUrl(alreadyTransformed, 'thumb')).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_96,c_limit/v123/gallery/bulk.jpg'
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

  it('changes Type without clearing or filtering Commodity selection', () => {
    expect(
      changeGalleryCommodityType(
        { serviceTypeId: 4, commodityTypeId: 6, commodityId: 5 },
        9
      )
    ).toEqual({ serviceTypeId: 4, commodityTypeId: 9, commodityId: 5 })
  })

  it('clears both independent catalogs when Service changes', () => {
    expect(
      changeGalleryService(
        { serviceTypeId: 4, commodityTypeId: 6, commodityId: 5 },
        8
      )
    ).toEqual({ serviceTypeId: 8, commodityTypeId: null, commodityId: null })
  })

  it('keeps legacy null Type editable without clearing Commodity', () => {
    expect(
      galleryCatalogSelectionFromImage({
        ...image,
        commodityTypeId: null,
      })
    ).toEqual({ serviceTypeId: 4, commodityTypeId: null, commodityId: 5 })
  })

  it('sends independent Type and Commodity filters to the image list API', async () => {
    apiClientMock.get.mockResolvedValue({
      json: async () => ({
        data: {
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 20,
          number: 0,
        },
      }),
    })

    await galleryService.getAllImages(2, 3, 4, 5, 6, 0, 20)

    expect(apiClientMock.get).toHaveBeenCalledWith(
      expect.stringContaining('commodityId=5')
    )
    expect(apiClientMock.get).toHaveBeenCalledWith(
      expect.stringContaining('commodityTypeId=6')
    )
  })
})
