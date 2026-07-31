import type { GalleryImage } from '@/modules/gallery/services/galleryService'
import { AlertTriangle, Info } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { getDeleteWarningType } from './galleryImageRules'

type DeleteGalleryImageDialogProps = {
  image: GalleryImage
  count: number
  onClose: () => void
  onConfirm: () => void
}

export function DeleteGalleryImageDialog({
  image,
  count,
  onClose,
  onConfirm,
}: DeleteGalleryImageDialogProps) {
  const warningType = getDeleteWarningType(count)

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className='flex items-center gap-2'>
            {warningType === 'over' ? (
              <AlertTriangle className='h-5 w-5 text-orange-500' />
            ) : null}
            {warningType === 'below' ? (
              <Info className='text-info h-5 w-5' />
            ) : null}
            {warningType === 'over'
              ? 'Image Limit Exceeded'
              : warningType === 'below'
                ? 'Warning: Below Required Limit'
                : 'Delete Image?'}
          </AlertDialogTitle>
          <AlertDialogDescription className='space-y-2'>
            {warningType === 'over' ? (
              <>
                This type has <strong>{count}/18 images</strong>. You MUST
                delete this image to meet the requirement.
              </>
            ) : warningType === 'below' ? (
              <>
                Deleting this image will bring the count below 18. After
                deletion: <strong>{count - 1}/18</strong>
              </>
            ) : (
              <>
                Are you sure you want to delete{' '}
                <strong>{image.fileName}</strong>?
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              warningType === 'over'
                ? 'bg-orange-500 hover:bg-orange-600'
                : 'bg-destructive hover:bg-destructive/90'
            }
          >
            {warningType === 'over' ? 'Delete (Required)' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
