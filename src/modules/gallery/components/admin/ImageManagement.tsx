import { useCallback, useEffect, useState } from 'react'
import type { RowSelectionState } from '@tanstack/react-table'
import { commodityService } from '@/modules/gallery/services/commodityService'
import {
  galleryService,
  type GalleryImage,
} from '@/modules/gallery/services/galleryService'
import {
  provinceService,
  type Province,
} from '@/modules/logistics/services/provinceService'
import { toast } from '@/shared/utils/toast'
import {
  GalleryImageFilters,
  GalleryManageProvider,
  useGalleryManageFilters,
} from './galleryManageContext'
import { DeleteGalleryImageDialog } from './image-management/DeleteGalleryImageDialog'
import { EditGalleryImageDialog } from './image-management/EditGalleryImageDialog'
import { GalleryImagesTable } from './image-management/GalleryImagesTable'
import {
  GALLERY_IMAGES_PER_PAGE,
  getGalleryImageScopeKey,
  hasEditableMetadata,
} from './image-management/galleryImageRules'

export interface ManageImagesTabProps {
  embedded?: boolean
  /** Filters render in GalleryImageHub sidebar; requires GalleryManageProvider ancestor. */
  hideFilters?: boolean
}

export function ManageImagesTab({
  embedded = false,
  hideFilters = false,
}: ManageImagesTabProps = {}) {
  if (hideFilters) {
    return <ManageImagesBody embedded={embedded} />
  }

  return (
    <GalleryManageProvider>
      <div className='space-y-6'>
        <GalleryImageFilters layout='bar' />
        <ManageImagesBody embedded={embedded} />
      </div>
    </GalleryManageProvider>
  )
}

function ManageImagesBody({ embedded = false }: { embedded?: boolean }) {
  const {
    filterPort,
    filterServiceType,
    filterCommodityType,
    filterCommodity,
    filterProvinceId,
    serviceTypes,
  } = useGalleryManageFilters()
  const [provinces, setProvinces] = useState<Province[]>([])
  const [images, setImages] = useState<GalleryImage[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalImages, setTotalImages] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [commodityCounts, setCommodityCounts] = useState<
    Record<string, number>
  >({})
  const [imageToDelete, setImageToDelete] = useState<GalleryImage | null>(null)
  const [imageToEdit, setImageToEdit] = useState<GalleryImage | null>(null)

  useEffect(() => {
    void provinceService
      .getAllProvinces()
      .then(setProvinces)
      .catch((error) => toast.error('Failed to load provinces', error))
  }, [])

  const loadCommodityCount = useCallback(async (image: GalleryImage) => {
    if (!image.commodityId) return

    try {
      const count = await commodityService.getImageCount(
        image.commodityId,
        image.provinceId,
        image.portId,
        image.serviceTypeId
      )
      const key = getGalleryImageScopeKey(image)
      setCommodityCounts((current) => ({ ...current, [key]: count.current }))
    } catch (error) {
      toast.error('Failed to load image count', error)
    }
  }, [])

  const loadPage = useCallback(
    async (page: number) => {
      setLoading(true)
      try {
        const response = await galleryService.getAllImages(
          filterProvinceId || undefined,
          filterPort || undefined,
          filterServiceType || undefined,
          filterCommodity || undefined,
          filterCommodityType || undefined,
          page,
          GALLERY_IMAGES_PER_PAGE
        )
        setImages(response.content)
        setTotalPages(response.totalPages)
        setTotalImages(response.totalElements)
        setRowSelection({})

        // Count each metadata scope once even when several rows share it.
        const uniqueScopes = new Map<string, GalleryImage>()
        response.content.forEach((image) => {
          if (hasEditableMetadata(image)) {
            uniqueScopes.set(getGalleryImageScopeKey(image), image)
          }
        })
        void Promise.all(Array.from(uniqueScopes.values(), loadCommodityCount))
      } catch (error) {
        toast.error('Failed to load images', error)
      } finally {
        setLoading(false)
      }
    },
    [
      filterCommodity,
      filterCommodityType,
      filterPort,
      filterProvinceId,
      filterServiceType,
      loadCommodityCount,
    ]
  )

  useEffect(() => {
    // Defer the stateful request until after the effect's synchronous phase.
    void Promise.resolve().then(() => loadPage(currentPage))
  }, [currentPage, loadPage])

  const openEditDialog = useCallback((image: GalleryImage) => {
    if (!hasEditableMetadata(image)) {
      alert('Image metadata is incomplete and cannot be edited.')
      return
    }
    setImageToEdit(image)
  }, [])

  const deleteSelected = async (ids: number[]) => {
    setLoading(true)
    try {
      await Promise.allSettled(ids.map((id) => galleryService.deleteImage(id)))
      setRowSelection({})
      await loadPage(currentPage)
    } catch {
      alert('Failed to delete some images')
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!imageToDelete) return

    try {
      await galleryService.deleteImage(imageToDelete.id)
      const deletedImage = imageToDelete
      const scopeKey = getGalleryImageScopeKey(deletedImage)

      setImages((current) =>
        current.filter((image) => image.id !== deletedImage.id)
      )
      setCommodityCounts((current) => {
        const count = current[scopeKey]
        return count ? { ...current, [scopeKey]: count - 1 } : current
      })
      setImageToDelete(null)
    } catch {
      alert('Failed to delete image')
    }
  }

  const deleteCount = imageToDelete
    ? commodityCounts[getGalleryImageScopeKey(imageToDelete)] || 0
    : 0

  return (
    <div className={embedded ? 'space-y-0' : 'space-y-6'}>
      <GalleryImagesTable
        embedded={embedded}
        images={images}
        totalImages={totalImages}
        totalPages={totalPages}
        currentPage={currentPage}
        loading={loading}
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        onPageChange={setCurrentPage}
        onReload={() => void loadPage(currentPage)}
        onEdit={openEditDialog}
        onDelete={setImageToDelete}
        onDeleteSelected={(ids) => void deleteSelected(ids)}
      />

      {imageToEdit ? (
        <EditGalleryImageDialog
          key={imageToEdit.id}
          image={imageToEdit}
          provinces={provinces}
          serviceTypes={serviceTypes}
          onClose={() => setImageToEdit(null)}
          onSaved={() => loadPage(currentPage)}
        />
      ) : null}

      {imageToDelete ? (
        <DeleteGalleryImageDialog
          image={imageToDelete}
          count={deleteCount}
          onClose={() => setImageToDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
    </div>
  )
}
