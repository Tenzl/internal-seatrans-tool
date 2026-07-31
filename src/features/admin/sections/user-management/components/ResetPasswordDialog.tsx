import { useState } from 'react'
import { toast } from '@/shared/utils/toast'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { adminUsersService, type AdminUserRow } from '../api/adminUsersService'

type ResetPasswordDialogProps = {
  user: AdminUserRow | null
  onClose: () => void
}

export function ResetPasswordDialog({
  user,
  onClose,
}: ResetPasswordDialogProps) {
  if (!user) return null

  return <OpenResetPasswordDialog key={user.id} user={user} onClose={onClose} />
}

function OpenResetPasswordDialog({
  user,
  onClose,
}: {
  user: AdminUserRow
  onClose: () => void
}) {
  const [password, setPassword] = useState('')
  const [isResetting, setIsResetting] = useState(false)

  const close = () => {
    setPassword('')
    onClose()
  }

  const handleReset = async () => {
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    setIsResetting(true)
    try {
      await adminUsersService.resetPassword(user.id, password)
      toast.success(`Password reset for ${user.email}`)
      close()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to reset password'
      )
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && close()}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
        </DialogHeader>
        <div className='space-y-3'>
          <p className='text-sm text-muted-foreground'>
            Set a new password for{' '}
            <span className='font-medium'>{user.email}</span>.
          </p>
          <div className='space-y-1.5'>
            <Label>New password</Label>
            <Input
              type='password'
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder='At least 8 characters'
              autoComplete='new-password'
              name='newPassword'
            />
          </div>
        </div>
        <DialogFooter className='mt-4'>
          <Button type='button' variant='outline' onClick={close}>
            Cancel
          </Button>
          <Button
            type='button'
            onClick={() => void handleReset()}
            disabled={isResetting}
          >
            {isResetting ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              'Reset password'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
