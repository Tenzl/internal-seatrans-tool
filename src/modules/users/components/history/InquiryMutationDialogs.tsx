import { Archive, Loader2, Lock, RotateCcw, Trash2 } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { InquiryHistoryActions } from './useInquiryHistoryActions'

export function InquiryMutationDialogs({
  actions,
}: {
  actions: InquiryHistoryActions
}) {
  return (
    <>
      <DeleteInquiryDialog actions={actions} />
      <RestoreInquiryDialog actions={actions} />
      <LockEpdaDialog actions={actions} />
    </>
  )
}

function DeleteInquiryDialog({ actions }: { actions: InquiryHistoryActions }) {
  const isHardDelete = actions.deleteMode === 'hard'

  return (
    <Dialog
      open={Boolean(actions.deleteTarget)}
      onOpenChange={(open) => {
        if (!open && !actions.isDeleting) actions.closeDelete()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isHardDelete ? 'Permanently delete inquiry?' : 'Archive inquiry?'}
          </DialogTitle>
          <DialogDescription>
            {isHardDelete ? (
              <>
                Inquiry #{actions.deleteTarget?.id} and its attached documents
                will be permanently removed. This cannot be undone.
              </>
            ) : (
              <>
                Inquiry #{actions.deleteTarget?.id} will be archived and hidden
                from user/staff history. Administrators will still see it as
                archived.
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className='gap-2 sm:gap-2'>
          <Button
            variant='outline'
            onClick={actions.closeDelete}
            disabled={actions.isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant={isHardDelete ? 'destructive' : 'default'}
            onClick={() => void actions.confirmDelete()}
            disabled={actions.isDeleting}
            className='gap-2'
          >
            {actions.isDeleting ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : isHardDelete ? (
              <Trash2 className='h-4 w-4' />
            ) : (
              <Archive className='h-4 w-4' />
            )}
            {isHardDelete ? 'Delete permanently' : 'Archive'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RestoreInquiryDialog({ actions }: { actions: InquiryHistoryActions }) {
  return (
    <Dialog
      open={Boolean(actions.restoreTarget)}
      onOpenChange={(open) => {
        if (!open && !actions.isRestoring) actions.closeRestore()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restore inquiry?</DialogTitle>
          <DialogDescription>
            Inquiry #{actions.restoreTarget?.id} will be moved back to the
            active list.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className='gap-2 sm:gap-2'>
          <Button
            variant='outline'
            onClick={actions.closeRestore}
            disabled={actions.isRestoring}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void actions.confirmRestore()}
            disabled={actions.isRestoring}
            className='gap-2'
          >
            {actions.isRestoring ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <RotateCcw className='h-4 w-4' />
            )}
            Restore
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LockEpdaDialog({ actions }: { actions: InquiryHistoryActions }) {
  return (
    <AlertDialog
      open={Boolean(actions.lockTarget)}
      onOpenChange={(open) => {
        if (!open && !actions.isLocking) actions.closeLock()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Lock this EPDA?</AlertDialogTitle>
          <AlertDialogDescription>
            After locking inquiry #{actions.lockTarget?.id}, you will no longer
            be able to edit this EPDA. Tariff rates will be frozen in a
            snapshot. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={actions.isLocking}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={actions.isLocking}
            onClick={(event) => {
              event.preventDefault()
              void actions.confirmLock()
            }}
            className='gap-2'
          >
            {actions.isLocking ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Lock className='h-4 w-4' />
            )}
            Lock edit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
