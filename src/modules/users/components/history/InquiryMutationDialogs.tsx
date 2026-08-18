import { Loader2, Lock, Trash2, Unlock } from 'lucide-react'
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
      <LockEpdaDialog actions={actions} />
      <UnlockEpdaDialog actions={actions} />
    </>
  )
}

function DeleteInquiryDialog({ actions }: { actions: InquiryHistoryActions }) {
  return (
    <Dialog
      open={Boolean(actions.deleteTarget)}
      onOpenChange={(open) => {
        if (!open && !actions.isDeleting) actions.closeDelete()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permanently delete inquiry?</DialogTitle>
          <DialogDescription>
            Inquiry #{actions.deleteTarget?.id} and its attached documents will
            be permanently removed. This cannot be undone.
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
            variant='destructive'
            onClick={() => void actions.confirmDelete()}
            disabled={actions.isDeleting}
            className='gap-2'
          >
            {actions.isDeleting ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Trash2 className='h-4 w-4' />
            )}
            Delete permanently
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
            be able to edit this EPDA. Tariff rates will be frozen in a snapshot
            until an administrator unlocks edit.
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

function UnlockEpdaDialog({ actions }: { actions: InquiryHistoryActions }) {
  return (
    <AlertDialog
      open={Boolean(actions.unlockTarget)}
      onOpenChange={(open) => {
        if (!open && !actions.isUnlocking) actions.closeUnlock()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unlock this EPDA?</AlertDialogTitle>
          <AlertDialogDescription>
            Inquiry #{actions.unlockTarget?.id} will become editable again. Only
            administrators can perform this action.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={actions.isUnlocking}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={actions.isUnlocking}
            onClick={(event) => {
              event.preventDefault()
              void actions.confirmUnlock()
            }}
            className='gap-2'
          >
            {actions.isUnlocking ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Unlock className='h-4 w-4' />
            )}
            Unlock edit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
