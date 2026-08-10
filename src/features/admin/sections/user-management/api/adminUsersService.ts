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
  companyEmail: string | null
  isActive: boolean
  roleId: number | null
  roleName: string | null
  roleGroup: RoleGroup | null
  createdAt: string
}

export type AdminUsersPage = {
  content: AdminUserRow[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export type AdminListUsersParams = {
  q?: string
  roleGroup?: RoleGroup
  roleName?: string
  page?: number
  limit?: number
}

/** Lean Person In Charge option — no password / unused profile fields. */
export type PicOption = {
  id: number
  email: string
  companyEmail: string | null
  fullName: string | null
  roleName: string | null
}

export type PicOptionsParams = {
  q?: string
  limit?: number
}

export type CreateInternalUserInput = {
  email: string
  username?: string
  fullName?: string
  companyEmail?: string
  password: string
  roleId: number
}

export const adminUsersService = {
  async listUsers(
    params: AdminListUsersParams = {},
    signal?: AbortSignal
  ): Promise<AdminUsersPage> {
    const sp = new URLSearchParams()
    if (params.q?.trim()) sp.set("q", params.q.trim())
    if (params.roleGroup) sp.set("roleGroup", params.roleGroup)
    if (params.roleName?.trim()) sp.set("roleName", params.roleName.trim())
    sp.set("page", String(Math.max(0, params.page ?? 0)))
    if (params.limit) sp.set("limit", String(params.limit))

    const qs = sp.toString()
    const path = `${API_CONFIG.USERS.ADMIN_USERS}?${qs}`
    const response = await apiClient.get(path, { signal })
    const data = await unwrapApiResponse<
      AdminUsersPage | AdminUserRow[]
    >(response)
    if (Array.isArray(data)) {
      return {
        content: data,
        totalElements: data.length,
        totalPages: data.length === 0 ? 0 : 1,
        size: data.length,
        number: 0,
      }
    }
    return {
      content: Array.isArray(data.content) ? data.content : [],
      totalElements: data.totalElements ?? data.content?.length ?? 0,
      totalPages: data.totalPages ?? 0,
      size: data.size ?? params.limit ?? 20,
      number: data.number ?? (data as { page?: number }).page ?? params.page ?? 0,
    }
  },

  async listPicOptions(params: PicOptionsParams = {}): Promise<PicOption[]> {
    const sp = new URLSearchParams()
    if (params.q?.trim()) sp.set('q', params.q.trim())
    if (params.limit) sp.set('limit', String(params.limit))

    const qs = sp.toString()
    const path = qs
      ? `${API_CONFIG.USERS.ADMIN_USER_PIC_OPTIONS}?${qs}`
      : API_CONFIG.USERS.ADMIN_USER_PIC_OPTIONS
    const response = await apiClient.get(path)
    return unwrapApiResponse<PicOption[]>(response)
  },

  async listRoles(roleGroup?: RoleGroup): Promise<AdminRoleOption[]> {
    const qs = roleGroup ? `?roleGroup=${encodeURIComponent(roleGroup)}` : ''
    const response = await apiClient.get(
      `${API_CONFIG.USERS.ADMIN_USER_ROLES}${qs}`
    )
    return unwrapApiResponse<AdminRoleOption[]>(response)
  },

  async createInternalUser(
    input: CreateInternalUserInput
  ): Promise<AdminUserRow> {
    const response = await apiClient.post(API_CONFIG.USERS.ADMIN_USERS, input)
    return unwrapApiResponse<AdminUserRow>(response)
  },

  async updateUserRole(userId: number, roleId: number): Promise<AdminUserRow> {
    const response = await apiClient.patch(
      API_CONFIG.USERS.ADMIN_USER_ROLE(userId),
      {
        roleId,
      }
    )
    return unwrapApiResponse<AdminUserRow>(response)
  },

  async updateUserProfile(
    userId: number,
    input: {
      email: string
      username?: string | null
      fullName?: string | null
      companyEmail?: string | null
    }
  ): Promise<AdminUserRow> {
    const response = await apiClient.patch(
      API_CONFIG.USERS.ADMIN_USER_PROFILE(userId),
      input
    )
    return unwrapApiResponse<AdminUserRow>(response)
  },

  async resetPassword(
    userId: number,
    newPassword: string
  ): Promise<{ id: number }> {
    const response = await apiClient.post(
      API_CONFIG.USERS.ADMIN_USER_RESET_PASSWORD(userId),
      {
        newPassword,
      }
    )
    return unwrapApiResponse<{ id: number }>(response)
  },

  async deleteUser(userId: number): Promise<{ id: number }> {
    const response = await apiClient.delete(
      API_CONFIG.USERS.ADMIN_USER_BY_ID(userId)
    )
    return unwrapApiResponse<{ id: number }>(response)
  },

  async reactivateUser(userId: number): Promise<{ id: number }> {
    const response = await apiClient.post(
      API_CONFIG.USERS.ADMIN_USER_REACTIVATE(userId)
    )
    return unwrapApiResponse<{ id: number }>(response)
  },
}
