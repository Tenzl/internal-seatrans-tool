/**
 * Role-based access for sidebar sections — the single place to add/remove rules.
 *
 * HOW TO USE
 *   • Key   = the nav item `title` exactly as written in
 *             `src/components/layout/data/sidebar-data.ts` (a group or a single link).
 *   • Value = the roles allowed to see it.
 *   • A title that is NOT listed here is visible to EVERYONE.
 *
 * Examples:
 *   'Booking Management': ['ADMIN'],            // only admins
 *   'Reports':            ['ADMIN', 'EMPLOYEE'], // admins + employees
 *   // remove a line entirely → that section becomes visible to all roles
 *
 * Matching is case-insensitive and substring-based, so a backend role like
 * "ROLE_ADMIN" or "SUPER_ADMIN" still satisfies the 'ADMIN' rule.
 */

import type { NavGroup, NavItem } from '@/components/layout/types'

export type AppRole = 'ADMIN' | 'EMPLOYEE' | 'CUSTOMER'

/** title → roles allowed to see it. Unlisted titles are visible to everyone. */
export const NAV_ROLE_ACCESS: Record<string, AppRole[]> = {
  'Booking Management': ['ADMIN'],
  'Data Management': ['ADMIN'],
}

/**
 * Route-level access (real block, not just hiding the menu). Matched by path
 * prefix against the current pathname. A route NOT listed here is open to all.
 *
 * Keep this in sync with NAV_ROLE_ACCESS above:
 *   '/booking/*' = Booking Management, '/data/*' + '/users' = Data Management.
 * To protect a new route: add `{ prefix: '/my-route', roles: ['ADMIN'] }`.
 */
export const ROUTE_ROLE_ACCESS: Array<{ prefix: string; roles: AppRole[] }> = [
  { prefix: '/booking', roles: ['ADMIN'] },
  { prefix: '/data', roles: ['ADMIN'] },
  { prefix: '/users', roles: ['ADMIN'] },
]

/** True if `role` satisfies the given app role (case-insensitive, substring). */
export function hasRole(role: string | null | undefined, appRole: AppRole): boolean {
  if (!role) return false
  return role.toUpperCase().includes(appRole)
}

/** Convenience: true for any admin-level backend role (e.g. ROLE_ADMIN, SUPER_ADMIN). */
export function isAdminRole(role: string | null | undefined): boolean {
  return hasRole(role, 'ADMIN')
}

/** True if `role` may open `pathname` (unmatched paths → everyone). */
export function canAccessRoute(pathname: string, role?: string | null): boolean {
  const rule = ROUTE_ROLE_ACCESS.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + '/'),
  )
  if (!rule || rule.roles.length === 0) return true
  if (!role) return false
  const normalized = role.toUpperCase()
  return rule.roles.some((r) => normalized.includes(r))
}

/** True if `role` may see a nav item with this title (unlisted → everyone). */
export function canAccessNavTitle(title: string, role?: string | null): boolean {
  const allowed = NAV_ROLE_ACCESS[title]
  if (!allowed || allowed.length === 0) return true
  if (!role) return false
  const normalized = role.toUpperCase()
  return allowed.some((r) => normalized.includes(r))
}

/**
 * Returns the nav groups the given role may see — drops restricted groups/links
 * (and restricted sub-links), then removes any group left with no items.
 */
export function filterNavGroupsByRole(
  groups: NavGroup[],
  role?: string | null,
): NavGroup[] {
  return groups
    .map((group) => {
      const items = group.items
        .filter((item) => canAccessNavTitle(item.title, role))
        .map((item) => {
          if ('items' in item && Array.isArray(item.items)) {
            const subItems = item.items.filter((sub) =>
              canAccessNavTitle(sub.title, role),
            )
            return { ...item, items: subItems } as NavItem
          }
          return item
        })
        .filter((item) =>
          'items' in item && Array.isArray(item.items) ? item.items.length > 0 : true,
        )
      return { ...group, items }
    })
    .filter((group) => group.items.length > 0)
}
