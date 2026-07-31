import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/config/react-query.config'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { adminUsersService } from '../api/adminUsersService'
import { ALL_ROLES_FILTER } from '../model/userManagement.constants'
import type { UserScope } from '../model/userManagement.types'

type UserManagementFilters = {
  scope: UserScope
  search: string
  roleFilter: string
}

export function useUserManagementData({
  scope,
  search,
  roleFilter,
}: UserManagementFilters) {
  const debouncedSearch = useDebouncedValue(search, 250)
  const roleName = roleFilter === ALL_ROLES_FILTER ? undefined : roleFilter

  const rolesQuery = useQuery({
    queryKey: queryKeys.adminUserRoles(scope),
    queryFn: () => adminUsersService.listRoles(scope),
  })

  const usersQuery = useQuery({
    queryKey: queryKeys.adminUsers({
      roleGroup: scope,
      q: debouncedSearch,
      roleName,
    }),
    queryFn: () =>
      adminUsersService.listUsers({
        roleGroup: scope,
        q: debouncedSearch,
        roleName,
        limit: 200,
      }),
  })

  return {
    roles: rolesQuery.data ?? [],
    users: usersQuery.data ?? [],
    isLoadingRoles: rolesQuery.isLoading,
    isLoadingUsers: usersQuery.isLoading,
  }
}
