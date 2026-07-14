import type { RoleGroup, User } from "@/shared/types/dashboard"

const INTERNAL_MARKERS = ["ADMIN", "EMPLOYEE"] as const
const EXTERNAL_MARKERS = ["CUSTOMER"] as const

type RoleGroupResult = RoleGroup | undefined

function normalizeRole(role?: string): string {
  return role?.toUpperCase() ?? ""
}

export function getRoleGroup(user?: User | null): RoleGroupResult {
  if (!user) return undefined

  // The backend role group is the authorization boundary. Role names are
  // user-defined labels and must not override an explicit group.
  if (user.roleGroup) return user.roleGroup

  const role = normalizeRole(user.role)
  if (role && INTERNAL_MARKERS.some((marker) => role.includes(marker))) return "INTERNAL"
  if (role && EXTERNAL_MARKERS.some((marker) => role.includes(marker))) return "EXTERNAL"

  return undefined
}

/** Staff-only APIs (admin inquiry list, etc.) */
export function isInternalStaff(user?: User | null): boolean {
  return getRoleGroup(user) === "INTERNAL"
}
