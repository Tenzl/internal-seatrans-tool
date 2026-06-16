import { API_CONFIG } from '@/shared/config/api.config'
import { apiClient } from '@/shared/utils/apiClient'
import { unwrapApiResponse } from '@/shared/utils/apiUnwrap'
import type { RoleGroup } from '@/shared/types/dashboard'

export interface AdminRole {
  id: number
  name: string
  description: string | null
  roleGroup: RoleGroup
  /** Admin roles always have full access and cannot be deleted. */
  isAdmin: boolean
  userCount: number
  sections: string[]
}

export interface SectionCatalogItem {
  key: string
  label: string
  group: string
  /** Admin-only sections (users, roles) can't be granted to other roles. */
  adminOnly?: boolean
}

export interface CreateRoleInput {
  name: string
  description?: string
  roleGroup: RoleGroup
  sections: string[]
}

export interface UpdateRoleInput {
  name?: string
  description?: string
  roleGroup?: RoleGroup
  sections?: string[]
}

export const rolesService = {
  async listRoles(): Promise<AdminRole[]> {
    const res = await apiClient.get(API_CONFIG.ROLES.LIST)
    return unwrapApiResponse<AdminRole[]>(res)
  },

  async getSectionCatalog(): Promise<SectionCatalogItem[]> {
    const res = await apiClient.get(API_CONFIG.ROLES.SECTION_CATALOG)
    return unwrapApiResponse<SectionCatalogItem[]>(res)
  },

  async createRole(input: CreateRoleInput): Promise<AdminRole> {
    const res = await apiClient.post(API_CONFIG.ROLES.CREATE, input)
    return unwrapApiResponse<AdminRole>(res)
  },

  async updateRole(id: number, patch: UpdateRoleInput): Promise<AdminRole> {
    const res = await apiClient.put(API_CONFIG.ROLES.BY_ID(id), patch)
    return unwrapApiResponse<AdminRole>(res)
  },

  async deleteRole(id: number): Promise<void> {
    // unwrap surfaces the backend message (e.g. "reassign users first") on 4xx.
    const res = await apiClient.delete(API_CONFIG.ROLES.BY_ID(id))
    await unwrapApiResponse<{ id: number }>(res)
  },
}
