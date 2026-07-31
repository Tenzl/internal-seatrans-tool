'use client'

import { Archive, Loader2, Lock, Trash2 } from 'lucide-react'
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

/** Confirm dialogs mirroring InquiryMutationDialogs for lock / archive / delete. */
export function TransportDocumentMutationDialogs({
  actions,
}: {
  actions: HistoryActions
}) {
  return (
    <>
      <DeleteDialog actions={actions} />
      <LockDialog actions={actions} />
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
                will be archived and hidden from the history list.
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
            Locking is permanent. Staff will still be able to view and preview
            the PDF, but the form can no longer be edited.
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
