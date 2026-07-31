'use client'

import { useMemo, useState } from 'react'
import { AdminSection } from '@/shared/components/layout/dashboard/admin'
import type { AdminUserRow } from './api/adminUsersService'
import { ChangeRoleDialog } from './components/ChangeRoleDialog'
import { CreateInternalUserDialog } from './components/CreateInternalUserDialog'
import { ResetPasswordDialog } from './components/ResetPasswordDialog'
import { UserManagementToolbar } from './components/UserManagementToolbar'
import { UserStatusDialog } from './components/UserStatusDialog'
import { UsersTable } from './components/UsersTable'
import { useUserManagementData } from './hooks/useUserManagementData'
import { ALL_ROLES_FILTER } from './model/userManagement.constants'
import type { UserRowActions, UserScope } from './model/userManagement.types'

export function UserManagementScreen() {
  const [scope, setScope] = useState<UserScope>('INTERNAL')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState(ALL_ROLES_FILTER)
  const [createOpen, setCreateOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<AdminUserRow | null>(null)
  const [roleTarget, setRoleTarget] = useState<AdminUserRow | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUserRow | null>(
    null
  )
  const [reactivateTarget, setReactivateTarget] = useState<AdminUserRow | null>(
    null
  )

  const { roles, users, isLoadingRoles, isLoadingUsers } =
    useUserManagementData({
      scope,
      search,
      roleFilter,
    })

  const rowActions = useMemo<UserRowActions>(
    () => ({
      onChangeRole: setRoleTarget,
      onResetPassword: setResetTarget,
      onDeactivate: setDeactivateTarget,
      onReactivate: setReactivateTarget,
    }),
    []
  )

  return (
    <AdminSection description='Manage internal users (create allowed) and view external accounts (read-only).'>
      <UserManagementToolbar
        scope={scope}
        search={search}
        roleFilter={roleFilter}
        roles={roles}
        isLoadingRoles={isLoadingRoles}
        onScopeChange={setScope}
        onSearchChange={setSearch}
        onRoleFilterChange={setRoleFilter}
        onCreate={() => setCreateOpen(true)}
      />

      <UsersTable
        users={users}
        isLoading={isLoadingUsers}
        actions={rowActions}
      />

      <CreateInternalUserDialog
        open={createOpen}
        roles={roles}
        isLoadingRoles={isLoadingRoles}
        onOpenChange={setCreateOpen}
      />
      <ResetPasswordDialog
        user={resetTarget}
        onClose={() => setResetTarget(null)}
      />
      <ChangeRoleDialog
        user={roleTarget}
        roles={roles}
        isLoadingRoles={isLoadingRoles}
        fallbackRoleGroup={scope}
        onClose={() => setRoleTarget(null)}
      />
      <UserStatusDialog
        action='deactivate'
        user={deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
      />
      <UserStatusDialog
        action='reactivate'
        user={reactivateTarget}
        onClose={() => setReactivateTarget(null)}
      />
    </AdminSection>
  )
}
