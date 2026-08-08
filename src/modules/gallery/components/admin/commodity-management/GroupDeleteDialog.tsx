import type { CommodityGroup } from '@/modules/gallery/services/commodityService'
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

interface GroupDeleteDialogProps {
  open: boolean
  group: CommodityGroup | null
  onClose: () => void
  onConfirm: () => void
}

export function GroupDeleteDialog({
  open,
  group,
  onClose,
  onConfirm,
}: GroupDeleteDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => !nextOpen && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete group?</AlertDialogTitle>
          <AlertDialogDescription>
            Delete group &quot;<strong>{group?.name}</strong>&quot; and all of
            its commodities? This cannot be undone. If any commodity is in use,
            the API will reject the delete.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className='bg-destructive hover:bg-destructive/90'
          >
            Delete group
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
