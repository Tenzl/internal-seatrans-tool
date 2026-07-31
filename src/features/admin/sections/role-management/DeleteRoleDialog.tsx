import { Loader2 } from 'lucide-react'
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
import type { AdminRole } from './rolesService'

type DeleteRoleDialogProps = {
  role: AdminRole | null
  deleting: boolean
  onClose: () => void
  onConfirm: (id: number) => void
}

export function DeleteRoleDialog({
  role,
  deleting,
  onClose,
  onConfirm,
}: DeleteRoleDialogProps) {
  return (
    <AlertDialog
      open={role !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete role &ldquo;{role?.name}&rdquo;?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This can&apos;t be undone. A role that still has users assigned
            can&apos;t be deleted — reassign them first.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              if (role) onConfirm(role.id)
            }}
            disabled={deleting}
          >
            {deleting ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
