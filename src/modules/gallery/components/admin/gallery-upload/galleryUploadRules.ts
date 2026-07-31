export interface GalleryUploadResult {
  success: number
  failed: number
  errors: string[]
}

export interface GalleryUploadSelection {
  area: string
  portId?: number | null
  serviceTypeId?: number | null
  commodityId?: number | null
  files: File[]
}

export function canEnableGalleryUpload(selection: GalleryUploadSelection) {
  return Boolean(
    selection.area &&
    selection.portId &&
    selection.serviceTypeId &&
    selection.commodityId &&
    selection.files.length > 0
  )
}

export function buildCommodityCountKey(
  provinceId?: number | null,
  portId?: number | null,
  serviceTypeId?: number | null,
  commodityId?: number | null
) {
  return provinceId && portId && serviceTypeId && commodityId
    ? `${provinceId}_${portId}_${serviceTypeId}_${commodityId}`
    : null
}

export function getUploadRequirement(
  currentCount: number,
  requiredCount: number
) {
  const complete = currentCount >= requiredCount
  return {
    complete,
    message: complete
      ? `This type already has ${requiredCount} images. Additional uploads will exceed the limit.`
      : `${requiredCount - currentCount} more images needed to reach the required ${requiredCount}.`,
  }
}

export async function uploadGalleryFilesSequentially(
  files: File[],
  uploadFile: (file: File) => Promise<unknown>
): Promise<GalleryUploadResult> {
  const result: GalleryUploadResult = {
    success: 0,
    failed: 0,
    errors: [],
  }

  // Sequential uploads preserve the existing backend request order and load profile.
  for (const file of files) {
    try {
      await uploadFile(file)
      result.success += 1
    } catch (error) {
      result.failed += 1
      const message = error instanceof Error ? error.message : 'Unknown error'
      result.errors.push(`${file.name}: ${message}`)
    }
  }

  return result
}
