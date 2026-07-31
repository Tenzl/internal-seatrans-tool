import type { UserScope } from './userManagement.types'

export const ALL_ROLES_FILTER = '__ALL__'

export const ADMIN_USERS_QUERY_ROOT = ['adminUsers'] as const

export const USER_SCOPE_OPTIONS: { id: UserScope; label: string }[] = [
  { id: 'INTERNAL', label: 'Internal users' },
  { id: 'EXTERNAL', label: 'External accounts' },
]
