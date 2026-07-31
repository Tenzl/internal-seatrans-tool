import { describe, expect, it, vi } from 'vitest'
import {
  buildCommodityCountKey,
  canEnableGalleryUpload,
  getUploadRequirement,
  uploadGalleryFilesSequentially,
} from './galleryUploadRules'

const file = (name: string) => ({ name }) as File

describe('gallery upload rules', () => {
  it('requires the complete scoped selection and at least one file', () => {
    const complete = {
      area: '1',
      portId: 20,
      serviceTypeId: 30,
      commodityId: 40,
      files: [file('port.jpg')],
    }

    expect(canEnableGalleryUpload(complete)).toBe(true)
    expect(canEnableGalleryUpload({ ...complete, portId: null })).toBe(false)
    expect(canEnableGalleryUpload({ ...complete, files: [] })).toBe(false)
  })

  it('builds the same scoped count key as the gallery filters', () => {
    expect(buildCommodityCountKey(10, 20, 30, 40)).toBe('10_20_30_40')
    expect(buildCommodityCountKey(10, null, 30, 40)).toBeNull()
  })

  it('describes remaining and excess image requirements', () => {
    expect(getUploadRequirement(2, 5)).toEqual({
      complete: false,
      message: '3 more images needed to reach the required 5.',
    })
    expect(getUploadRequirement(5, 5)).toEqual({
      complete: true,
      message:
        'This type already has 5 images. Additional uploads will exceed the limit.',
    })
  })

  it('uploads sequentially and keeps per-file failures', async () => {
    const calls: string[] = []
    const upload = vi.fn(async (selectedFile: File) => {
      calls.push(selectedFile.name)
      if (selectedFile.name === 'broken.jpg') {
        throw new Error('Invalid image')
      }
    })

    const result = await uploadGalleryFilesSequentially(
      [file('first.jpg'), file('broken.jpg'), file('last.jpg')],
      upload
    )

    expect(calls).toEqual(['first.jpg', 'broken.jpg', 'last.jpg'])
    expect(result).toEqual({
      success: 2,
      failed: 1,
      errors: ['broken.jpg: Invalid image'],
    })
  })
})
