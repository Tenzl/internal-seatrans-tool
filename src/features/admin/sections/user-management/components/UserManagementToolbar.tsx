import {
  AdminToolbar,
  AdminToolbarGroup,
} from '@/shared/components/layout/dashboard/admin'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { AdminRoleOption } from '../api/adminUsersService'
import {
  ALL_ROLES_FILTER,
  USER_SCOPE_OPTIONS,
} from '../model/userManagement.constants'
import type { UserScope } from '../model/userManagement.types'

type UserManagementToolbarProps = {
  scope: UserScope
  search: string
  roleFilter: string
  roles: AdminRoleOption[]
  isLoadingRoles: boolean
  onScopeChange: (scope: UserScope) => void
  onSearchChange: (search: string) => void
  onRoleFilterChange: (role: string) => void
  onCreate: () => void
}

export function UserManagementToolbar({
  scope,
  search,
  roleFilter,
  roles,
  isLoadingRoles,
  onScopeChange,
  onSearchChange,
  onRoleFilterChange,
  onCreate,
}: UserManagementToolbarProps) {
  return (
    <AdminToolbar>
      <AdminToolbarGroup>
        <div className='space-y-1.5'>
          <Label className='text-xs font-medium text-muted-foreground'>
            Scope
          </Label>
          <Select
            value={scope}
            onValueChange={(value) => onScopeChange(value as UserScope)}
          >
            <SelectTrigger className='h-9 w-full sm:w-[220px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {USER_SCOPE_OPTIONS.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-1.5'>
          <Label className='text-xs font-medium text-muted-foreground'>
            Role
          </Label>
          <Select
            value={roleFilter}
            onValueChange={onRoleFilterChange}
            disabled={isLoadingRoles}
          >
            <SelectTrigger className='h-9 w-full sm:w-[240px]'>
              <SelectValue placeholder='All roles' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ROLES_FILTER}>All roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.name}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='space-y-1.5'>
          <Label className='text-xs font-medium text-muted-foreground'>
            Search
          </Label>
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder='Search email, name, company…'
            className='h-9 w-full sm:w-[320px]'
          />
        </div>
      </AdminToolbarGroup>

      <AdminToolbarGroup>
        <Button
          type='button'
          onClick={onCreate}
          disabled={scope !== 'INTERNAL'}
          className='gap-2 active:scale-[0.98]'
        >
          <Plus className='h-4 w-4' />
          Create internal user
        </Button>
      </AdminToolbarGroup>
    </AdminToolbar>
  )
}
