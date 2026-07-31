import {
  DASHBOARD_CATALOG,
  SECTION_CATALOG,
  type SectionDef,
} from '@/config/dashboard-catalog'
import { canonicalizeDashboardPath } from '@/config/dashboard-routes'

export { SECTION_CATALOG, type SectionDef }

const sectionsByRoute = [...SECTION_CATALOG].sort(
  (a, b) => b.route.length - a.route.length
)

export type GateUser =
  | { role?: string | null; sections?: string[] | null }
  | null
  | undefined

const SELF_SERVICE_ROUTES = ['/', '/settings', '/errors'] as const

/** Only the backend's reserved ROLE_ADMIN role has the global bypass. */
export function isAdminRole(role?: string | null): boolean {
  return (
    (role ?? '')
      .trim()
      .toUpperCase()
      .replace(/^ROLE_/, '') === 'ADMIN'
  )
}

/** Returns the permission section that owns the requested dashboard path. */
export function sectionForPath(pathname: string): SectionDef | null {
  return (
    sectionsByRoute.find(
      (section) =>
        pathname === section.route || pathname.startsWith(`${section.route}/`)
    ) ?? null
  )
}

export function canAccessPath(pathname: string, user: GateUser): boolean {
  if (isAdminRole(user?.role)) return true
  const section = sectionForPath(pathname)
  return section ? (user?.sections ?? []).includes(section.key) : false
}

function isSelfServicePath(pathname: string): boolean {
  return SELF_SERVICE_ROUTES.some(
    (route) =>
      pathname === route || (route !== '/' && pathname.startsWith(`${route}/`))
  )
}

/**
 * Complete policy for authenticated routes. Business pages require a section
 * grant; account and error pages only require a verified session.
 */
export function canAccessAuthenticatedPath(
  pathname: string,
  user: GateUser
): boolean {
  if (!user) return false
  if (isSelfServicePath(pathname)) return true
  return canAccessPath(canonicalizeDashboardPath(pathname), user)
}

/** Picks the first visible navigation destination for the signed-in user. */
export function firstAccessibleDashboardPath(user: GateUser): string | null {
  if (!user) return null

  for (const category of DASHBOARD_CATALOG) {
    for (const section of category.sections) {
      if (canAccessPath(section.route, user)) {
        return section.navigation?.[0]?.url ?? section.route
      }
    }
  }

  // Users without business sections can still manage their own account.
  return '/settings'
}
