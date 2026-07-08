/**
 * Dashboard "sections" (one per page) and the access helpers that gate nav +
 * routes. Mirrors the backend catalog
 * (backend2.0/src/features/roles/section-catalog.ts) — keep the keys in sync.
 *
 * A page is visible/openable when its section key is in the user's granted
 * sections (from /auth/me). Admin roles implicitly hold every section. Routes
 * that don't map to any section stay open to everyone (e.g. home, settings).
 */
import type { NavGroup, NavItem } from '@/components/layout/types'

export interface SectionDef {
  key: string
  label: string
  group: string
  /** Route prefix this section owns (used to gate by pathname). */
  route: string
}

export const SECTION_CATALOG: SectionDef[] = [
  { key: 'epda-create', label: 'Create EPDA', group: 'EPDA', route: '/epda/create-epda' },
  { key: 'epda-inquiry', label: 'Inquiry', group: 'EPDA', route: '/epda/inquiry' },
  { key: 'epda-parameter', label: 'Parameter', group: 'EPDA', route: '/epda/parameter' },
  { key: 'booking-partner', label: 'Partner', group: 'Booking Management', route: '/booking/partner' },
  { key: 'booking-shipment', label: 'Shipment', group: 'Booking Management', route: '/booking/shipping' },
  { key: 'users', label: 'Users', group: 'Data Management', route: '/users' },
  { key: 'data-ports', label: 'Ports', group: 'Data Management', route: '/data/ports' },
  { key: 'data-cargo', label: 'Cargo', group: 'Data Management', route: '/data/cargo' },
  { key: 'data-images', label: 'Images', group: 'Data Management', route: '/data/images' },
  { key: 'data-offices', label: 'Offices', group: 'Data Management', route: '/data/offices' },
  { key: 'data-storage', label: 'Storage', group: 'Data Management', route: '/data/storage' },
  { key: 'content-posts', label: 'Posts', group: 'Content Management', route: '/content/posts' },
  { key: 'content-categories', label: 'Categories', group: 'Content Management', route: '/content/categories' },
  { key: 'roles', label: 'Roles & access', group: 'Administration', route: '/roles' },
]

const BY_ROUTE = [...SECTION_CATALOG].sort((a, b) => b.route.length - a.route.length)

/** Any admin-level backend role (e.g. ROLE_ADMIN, SUPER_ADMIN) → full access. */
export function isAdminRole(role?: string | null): boolean {
  return !!role && role.toUpperCase().includes('ADMIN')
}

/** The section that owns `pathname`, or null when the route is unmapped (open). */
export function sectionForPath(pathname: string): SectionDef | null {
  return (
    BY_ROUTE.find((s) => pathname === s.route || pathname.startsWith(s.route + '/')) ??
    null
  )
}

function sectionForUrl(url?: string): SectionDef | null {
  if (!url) return null
  return BY_ROUTE.find((s) => url === s.route || url.startsWith(s.route + '/')) ?? null
}

type GateUser = { role?: string | null; sections?: string[] | null } | null | undefined

/** True if the user may open `pathname` (admins always; unmapped routes open). */
export function canAccessPath(pathname: string, user: GateUser): boolean {
  if (isAdminRole(user?.role)) return true
  const section = sectionForPath(pathname)
  if (!section) return true
  return (user?.sections ?? []).includes(section.key)
}

/** True if the user may see a nav item pointing at `url`. */
function canAccessNavUrl(url: string | undefined, user: GateUser): boolean {
  if (isAdminRole(user?.role)) return true
  const section = sectionForUrl(url)
  if (!section) return true
  return (user?.sections ?? []).includes(section.key)
}

/**
 * Filters nav groups to what the user's sections allow — drops restricted
 * links and sub-links, then removes any group/parent left with no items.
 */
export function filterNavGroupsBySections(
  groups: NavGroup[],
  user: GateUser,
): NavGroup[] {
  const itemVisible = (item: NavItem): boolean => {
    if ('items' in item && Array.isArray(item.items)) {
      return item.items.some((sub) => canAccessNavUrl(sub.url, user))
    }
    return canAccessNavUrl((item as { url?: string }).url, user)
  }

  return groups
    .map((group) => {
      const items = group.items
        .map((item) => {
          if ('items' in item && Array.isArray(item.items)) {
            const sub = item.items.filter((s) => canAccessNavUrl(s.url, user))
            return { ...item, items: sub } as NavItem
          }
          return item
        })
        .filter(itemVisible)
      return { ...group, items }
    })
    .filter((group) => group.items.length > 0)
}
