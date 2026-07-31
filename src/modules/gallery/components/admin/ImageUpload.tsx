import { GalleryUploadForm } from './gallery-upload/GalleryUploadForm'
import { UploadRequirementBanner } from './gallery-upload/UploadRequirementBanner'
import { UploadResultBanner } from './gallery-upload/UploadResultBanner'
import { buildCommodityCountKey } from './gallery-upload/galleryUploadRules'
import { useGalleryImageUpload } from './gallery-upload/useGalleryImageUpload'
import { useGalleryManageFilters } from './galleryManageContext'

export interface AddImageTabProps {
  /** Called after at least one file uploaded successfully. */
  onUploadSuccess?: () => void
}

export function AddImageTab({ onUploadSuccess }: AddImageTabProps = {}) {
  const filters = useGalleryManageFilters()
  const commodity = filters.filterCommodity
    ? filters.availableCommodities.find(
        (item) => item.id === filters.filterCommodity
      )
    : null
  const countKey = buildCommodityCountKey(
    filters.filterProvinceId,
    filters.filterPort,
    filters.filterServiceType,
    filters.filterCommodity
  )
  const currentCount = countKey ? (filters.commodityCounts[countKey] ?? 0) : 0
  const requiredCount = commodity?.requiredImageCount ?? 0
  const upload = useGalleryImageUpload({
    area: filters.filterArea,
    provinceId: filters.filterProvinceId,
    portId: filters.filterPort,
    serviceTypeId: filters.filterServiceType,
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

      {filters.filterCommodity && commodity && (
        <UploadRequirementBanner
          currentCount={currentCount}
          requiredCount={requiredCount}
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
