import type { AdminUserRow } from '../api/adminUsersService'

export type UserScope = 'INTERNAL' | 'EXTERNAL'

export type UserRowActions = {
  onChangeRole: (user: AdminUserRow) => void
  onEdit: (user: AdminUserRow) => void
  onResetPassword: (user: AdminUserRow) => void
  onDeactivate: (user: AdminUserRow) => void
  onReactivate: (user: AdminUserRow) => void
}
