import { GalleryUploadForm } from './gallery-upload/GalleryUploadForm'
import { UploadResultBanner } from './gallery-upload/UploadResultBanner'
import { useGalleryImageUpload } from './gallery-upload/useGalleryImageUpload'
import { useGalleryManageFilters } from './galleryManageContext'

export interface AddImageTabProps {
  /** Called after at least one file uploaded successfully. */
  onUploadSuccess?: () => void
}

export function AddImageTab({ onUploadSuccess }: AddImageTabProps = {}) {
  const filters = useGalleryManageFilters()
  const upload = useGalleryImageUpload({
    area: filters.filterArea,
    provinceId: filters.filterProvinceId,
    portId: filters.filterPort,
    serviceTypeId: filters.filterServiceType,
    commodityTypeId: filters.filterCommodityType,
    commodityId: filters.filterCommodity,
    onUploadSuccess,
  })

  return (
    <div className='space-y-6'>
      {upload.uploadResult && (
        <UploadResultBanner
          result={upload.uploadResult}
          onDismiss={upload.dismissResult}
        />
      )}

      <GalleryUploadForm
        hasSelectedCommodity={Boolean(filters.filterCommodity)}
        selectedFiles={upload.selectedFiles}
        dropzoneResetKey={upload.dropzoneResetKey}
        canUpload={upload.canUpload}
        isUploading={upload.isUploading}
        onFilesChange={upload.setSelectedFiles}
        onUpload={() => void upload.upload()}
      />
    </div>
  )
}
