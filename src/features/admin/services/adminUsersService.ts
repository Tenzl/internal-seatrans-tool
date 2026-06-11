import { API_CONFIG } from '@/shared/config/api.config'
import { apiClient } from '@/shared/utils/apiClient'
import { unwrapApiResponse } from '@/shared/utils/apiUnwrap'

export type RoleGroup = 'INTERNAL' | 'EXTERNAL'

export type AdminRoleOption = {
  id: number
  name: string
  roleGroup: RoleGroup
  label: string
}

export type AdminUserRow = {
  id: number
  email: string
  username: string | null
  fullName: string | null
  phone: string | null
  company: string | null
  isActive: boolean
  roleId: number | null
  roleName: string | null
  roleGroup: RoleGroup | null
  createdAt: string
}

export type AdminListUsersParams = {
  q?: string
  roleGroup?: RoleGroup
  roleName?: string
  limit?: number
}

export type CreateInternalUserInput = {
  email: string
  username?: string
  fullName?: string
  password: string
  roleId: number
}

export const adminUsersService = {
  async listUsers(params: AdminListUsersParams = {}): Promise<AdminUserRow[]> {
    const sp = new URLSearchParams()
    if (params.q?.trim()) sp.set('q', params.q.trim())
    if (params.roleGroup) sp.set('roleGroup', params.roleGroup)
    if (params.roleName?.trim()) sp.set('roleName', params.roleName.trim())
    if (params.limit) sp.set('limit', String(params.limit))

    const qs = sp.toString()
    const path = qs ? `${API_CONFIG.USERS.ADMIN_USERS}?${qs}` : API_CONFIG.USERS.ADMIN_USERS
    const response = await apiClient.get(path)
    return unwrapApiResponse<AdminUserRow[]>(response)
  },

  async listRoles(roleGroup?: RoleGroup): Promise<AdminRoleOption[]> {
    const qs = roleGroup ? `?roleGroup=${encodeURIComponent(roleGroup)}` : ''
    const response = await apiClient.get(`${API_CONFIG.USERS.ADMIN_USER_ROLES}${qs}`)
    return unwrapApiResponse<AdminRoleOption[]>(response)
  },

  async createInternalUser(input: CreateInternalUserInput): Promise<AdminUserRow> {
    const response = await apiClient.post(API_CONFIG.USERS.ADMIN_USERS, input)
    return unwrapApiResponse<AdminUserRow>(response)
  },

  async resetPassword(userId: number, newPassword: string): Promise<{ id: number }> {
    const response = await apiClient.post(API_CONFIG.USERS.ADMIN_USER_RESET_PASSWORD(userId), {
      newPassword,
    })
    return unwrapApiResponse<{ id: number }>(response)
  },

  async deleteUser(userId: number): Promise<{ id: number }> {
    const response = await apiClient.delete(API_CONFIG.USERS.ADMIN_USER_BY_ID(userId))
    return unwrapApiResponse<{ id: number }>(response)
  },
}

