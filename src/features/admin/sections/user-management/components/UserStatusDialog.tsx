import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/shared/utils/toast'
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
import { adminUsersService, type AdminUserRow } from '../api/adminUsersService'
import { ADMIN_USERS_QUERY_ROOT } from '../model/userManagement.constants'

type UserStatusAction = 'deactivate' | 'reactivate'

type UserStatusDialogProps = {
  action: UserStatusAction
  user: AdminUserRow | null
  onClose: () => void
}

export function UserStatusDialog({
  action,
  user,
  onClose,
}: UserStatusDialogProps) {
  if (!user) return null

  return (
    <OpenUserStatusDialog
      key={`${action}-${user.id}`}
      action={action}
      user={user}
      onClose={onClose}
    />
  )
}

function OpenUserStatusDialog({
  action,
  user,
  onClose,
}: {
  action: UserStatusAction
  user: AdminUserRow
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isDeactivate = action === 'deactivate'
  const actionLabel = isDeactivate ? 'Deactivate' : 'Reactivate'

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      if (isDeactivate) {
        await adminUsersService.deleteUser(user.id)
      } else {
        await adminUsersService.reactivateUser(user.id)
      }
      toast.success(
        `${isDeactivate ? 'Deactivated' : 'Reactivated'} ${user.email}`
      )
      onClose()
      await queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_ROOT })
    } catch (error) {
      const fallback = isDeactivate
        ? 'Failed to deactivate user'
        : 'Failed to reactivate user'
      toast.error(error instanceof Error ? error.message : fallback)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{actionLabel} user?</AlertDialogTitle>
          <AlertDialogDescription>
            <StatusDescription action={action} email={user.email} />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              void handleSubmit()
            }}
            disabled={isSubmitting}
            className={
              isDeactivate
                ? 'bg-destructive text-white hover:bg-destructive/90'
                : undefined
            }
          >
            {isSubmitting ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              actionLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function StatusDescription({
  action,
  email,
}: {
  action: UserStatusAction
  email: string
}) {
  if (action === 'reactivate') {
    return (
      <>
        <span className='font-medium'>{email}</span> will be able to log in
        again.
      </>
    )
  }

  return (
    <>
      <span className='font-medium'>{email}</span> will no longer be able to log
      in, and existing sessions are revoked. Their records (inquiries, quotes,
      audit logs) are kept. You can reactivate them later.
    </>
  )
}
