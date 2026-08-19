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

export const GALLERY_UPLOAD_MAX_FILES = 20
export const GALLERY_UPLOAD_MAX_FILE_SIZE = 10 * 1024 * 1024

export function canEnableGalleryUpload(selection: GalleryUploadSelection) {
  return Boolean(
    selection.area &&
    selection.portId &&
    selection.serviceTypeId &&
    selection.commodityId &&
    selection.files.length > 0 &&
    selection.files.length <= GALLERY_UPLOAD_MAX_FILES &&
    selection.files.every((file) => file.size <= GALLERY_UPLOAD_MAX_FILE_SIZE)
  )
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
