'use client'

import { Archive, Loader2, Lock, RotateCcw, Trash2, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { useTransportDocumentHistoryActions } from './useTransportDocumentHistoryActions'

type HistoryActions = ReturnType<typeof useTransportDocumentHistoryActions>

/** Confirm dialogs mirroring InquiryMutationDialogs for lock / unlock / archive / delete. */
export function TransportDocumentMutationDialogs({
  actions,
}: {
  actions: HistoryActions
}) {
  return (
    <>
      <DeleteDialog actions={actions} />
      <RestoreDialog actions={actions} />
      <LockDialog actions={actions} />
      <UnlockDialog actions={actions} />
    </>
  )
}

function DeleteDialog({ actions }: { actions: HistoryActions }) {
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
            {isHardDelete
              ? 'Permanently delete document record?'
              : 'Archive document record?'}
          </DialogTitle>
          <DialogDescription>
            {isHardDelete ? (
              <>
                Record #
                {actions.deleteTarget?.referenceNumber ||
                  actions.deleteTarget?.id}{' '}
                will be permanently removed. This cannot be undone.
              </>
            ) : (
              <>
                Record #
                {actions.deleteTarget?.referenceNumber ||
                  actions.deleteTarget?.id}{' '}
                will be archived. Admins can restore it from the archived
                filter.
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

function RestoreDialog({ actions }: { actions: HistoryActions }) {
  return (
    <Dialog
      open={Boolean(actions.restoreTarget)}
      onOpenChange={(open) => {
        if (!open && !actions.isRestoring) actions.closeRestore()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restore document record?</DialogTitle>
          <DialogDescription>
            Record #
            {actions.restoreTarget?.referenceNumber ||
              actions.restoreTarget?.id}{' '}
            will return to the active history list.
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

function LockDialog({ actions }: { actions: HistoryActions }) {
  return (
    <Dialog
      open={Boolean(actions.lockTarget)}
      onOpenChange={(open) => {
        if (!open && !actions.isLocking) actions.closeLock()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lock document edit?</DialogTitle>
          <DialogDescription>
            Staff will still be able to view and preview the PDF, but the form
            can no longer be edited until an admin unlocks it.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className='gap-2 sm:gap-2'>
          <Button
            variant='outline'
            onClick={actions.closeLock}
            disabled={actions.isLocking}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void actions.confirmLock()}
            disabled={actions.isLocking}
            className='gap-2'
          >
            {actions.isLocking ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Lock className='h-4 w-4' />
            )}
            Lock edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function UnlockDialog({ actions }: { actions: HistoryActions }) {
  return (
    <Dialog
      open={Boolean(actions.unlockTarget)}
      onOpenChange={(open) => {
        if (!open && !actions.isUnlocking) actions.closeUnlock()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unlock document edit?</DialogTitle>
          <DialogDescription>
            Record #
            {actions.unlockTarget?.referenceNumber || actions.unlockTarget?.id}{' '}
            will be editable again. Only admins can unlock.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className='gap-2 sm:gap-2'>
          <Button
            variant='outline'
            onClick={actions.closeUnlock}
            disabled={actions.isUnlocking}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void actions.confirmUnlock()}
            disabled={actions.isUnlocking}
            className='gap-2'
          >
            {actions.isUnlocking ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Unlock className='h-4 w-4' />
            )}
            Unlock edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
