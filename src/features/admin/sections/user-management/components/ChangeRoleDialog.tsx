import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  adminUsersService,
  type AdminRoleOption,
  type AdminUserRow,
} from '../api/adminUsersService'
import { ADMIN_USERS_QUERY_ROOT } from '../model/userManagement.constants'
import type { UserScope } from '../model/userManagement.types'
import { parseRequiredRoleId } from '../model/userManagementRules'

type ChangeRoleDialogProps = {
  user: AdminUserRow | null
  roles: AdminRoleOption[]
  isLoadingRoles: boolean
  fallbackRoleGroup: UserScope
  onClose: () => void
}

export function ChangeRoleDialog(props: ChangeRoleDialogProps) {
  if (!props.user) return null

  return (
    <OpenChangeRoleDialog key={props.user.id} {...props} user={props.user} />
  )
}

function OpenChangeRoleDialog({
  user,
  roles,
  isLoadingRoles,
  fallbackRoleGroup,
  onClose,
}: Omit<ChangeRoleDialogProps, 'user'> & { user: AdminUserRow }) {
  const queryClient = useQueryClient()
  const [roleIdValue, setRoleIdValue] = useState(
    user.roleId ? String(user.roleId) : ''
  )
  const [isUpdating, setIsUpdating] = useState(false)
  const roleGroup = user.roleGroup ?? fallbackRoleGroup
  const availableRoles = useMemo(
    () => roles.filter((role) => role.roleGroup === roleGroup),
    [roleGroup, roles]
  )

  const handleUpdate = async () => {
    const role = parseRequiredRoleId(roleIdValue)
    if (!role.ok) {
      toast.error(role.error)
      return
    }
    if (role.data === user.roleId) {
      onClose()
      return
    }

    setIsUpdating(true)
    try {
      await adminUsersService.updateUserRole(user.id, role.data)
      toast.success(`Role updated for ${user.email}`)
      onClose()
      await queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_ROOT })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update role'
      )
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-w-md'>
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
        </DialogHeader>
        <div className='space-y-3'>
          <p className='text-sm text-muted-foreground'>
            Set a new role for <span className='font-medium'>{user.email}</span>
            .
          </p>
          <div className='space-y-1.5'>
            <Label>Role</Label>
            <Select
              value={roleIdValue}
              onValueChange={setRoleIdValue}
              disabled={isLoadingRoles}
            >
              <SelectTrigger className='h-9'>
                <SelectValue
                  placeholder={
                    isLoadingRoles ? 'Loading roles…' : 'Select role'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className='text-xs text-muted-foreground'>
              Only roles in the same group ({roleGroup}) are available.
            </p>
          </div>
        </div>
        <DialogFooter className='mt-4'>
          <Button type='button' variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            type='button'
            onClick={() => void handleUpdate()}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              'Save role'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
