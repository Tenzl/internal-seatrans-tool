import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/config/react-query.config'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { adminUsersService } from '../api/adminUsersService'
import {
  ALL_ROLES_FILTER,
  USERS_PAGE_SIZE,
} from '../model/userManagement.constants'
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
  const [pageIndex, setPageIndex] = useState(0)
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
      page: pageIndex,
      limit: USERS_PAGE_SIZE,
    }),
    queryFn: ({ signal }) =>
      adminUsersService.listUsers(
        {
          roleGroup: scope,
          q: debouncedSearch,
          roleName,
          page: pageIndex,
          limit: USERS_PAGE_SIZE,
        },
        signal
      ),
  })

  const users = usersQuery.data?.content ?? []
  const totalElements = usersQuery.data?.totalElements ?? 0
  const pageCount = Math.max(
    1,
    Number(usersQuery.data?.totalPages) ||
      Math.ceil(totalElements / USERS_PAGE_SIZE) ||
      1
  )
  const safePage = Math.min(pageIndex, pageCount - 1)

  return {
    roles: rolesQuery.data ?? [],
    users,
    totalElements,
    pageIndex: safePage,
    setPageIndex,
    pageSize: USERS_PAGE_SIZE,
    pageCount,
    isLoadingRoles: rolesQuery.isLoading,
    isLoadingUsers: usersQuery.isLoading || usersQuery.isFetching,
  }
}
