import { useCallback, useEffect, useRef, useState } from 'react'
import { galleryService } from '@/modules/gallery/services/galleryService'
import {
  canEnableGalleryUpload,
  uploadGalleryFilesSequentially,
  type GalleryUploadResult,
} from './galleryUploadRules'

const RESULT_VISIBLE_DURATION_MS = 8_000

interface UseGalleryImageUploadOptions {
  area: string
  provinceId?: number | null
  portId?: number | null
  serviceTypeId?: number | null
  commodityId?: number | null
  onUploadSuccess?: () => void
}

export function useGalleryImageUpload({
  area,
  provinceId,
  portId,
  serviceTypeId,
  commodityId,
  onUploadSuccess,
}: UseGalleryImageUploadOptions) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<GalleryUploadResult | null>(
    null
  )
  const [dropzoneResetKey, setDropzoneResetKey] = useState(0)
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const canUpload = canEnableGalleryUpload({
    area,
    portId,
    serviceTypeId,
    commodityId,
    files: selectedFiles,
  })

  const dismissResult = useCallback(() => {
    if (resultTimer.current) clearTimeout(resultTimer.current)
    resultTimer.current = null
    setUploadResult(null)
  }, [])

  useEffect(() => {
    return () => {
      if (resultTimer.current) clearTimeout(resultTimer.current)
    }
  }, [])

  const upload = useCallback(async () => {
    if (
      !provinceId ||
      !portId ||
      !serviceTypeId ||
      !commodityId ||
      selectedFiles.length === 0
    ) {
      alert('Please complete all filters on the left and select files')
      return
    }

    setIsUploading(true)
    dismissResult()
    const result = await uploadGalleryFilesSequentially(selectedFiles, (file) =>
      galleryService.uploadImage(
        file,
        provinceId,
        portId,
        serviceTypeId,
        commodityId
      )
    )
    setIsUploading(false)
    setUploadResult(result)

    if (result.success > 0) onUploadSuccess?.()

    setSelectedFiles([])
    // The dropzone owns its file list, so remount it after every upload attempt.
    setDropzoneResetKey((key) => key + 1)
    resultTimer.current = setTimeout(
      () => setUploadResult(null),
      RESULT_VISIBLE_DURATION_MS
    )
  }, [
    commodityId,
    dismissResult,
    onUploadSuccess,
    portId,
    provinceId,
    selectedFiles,
    serviceTypeId,
  ])

  return {
    selectedFiles,
    setSelectedFiles,
    isUploading,
    uploadResult,
    dropzoneResetKey,
    canUpload,
    upload,
    dismissResult,
  }
}
