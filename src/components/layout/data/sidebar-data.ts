import {
  DASHBOARD_CATALOG,
  type DashboardIconKey,
  type DashboardSection,
  type NavigationCategory,
} from '@/config/dashboard-catalog'
import { canAccessPath, type GateUser } from '@/config/section-catalog'
import {
  Anchor,
  BriefcaseBusiness,
  Building2,
  Database,
  FileText,
  HardDrive,
  Image,
  Newspaper,
  Package,
  ShieldCheck,
  Ship,
  Tag,
  Users,
} from 'lucide-react'
import type { NavCollapsible, NavGroup, NavLink, SidebarData } from '../types'

const iconByKey: Record<DashboardIconKey, React.ElementType> = {
  anchor: Anchor,
  briefcase: BriefcaseBusiness,
  building: Building2,
  database: Database,
  'file-text': FileText,
  'hard-drive': HardDrive,
  image: Image,
  newspaper: Newspaper,
  package: Package,
  shield: ShieldCheck,
  ship: Ship,
  tag: Tag,
  users: Users,
}

function navigationEntriesFor(section: DashboardSection): NavLink[] {
  if (section.navigation) {
    return section.navigation.map(({ icon, ...entry }) => ({
      ...entry,
      icon: icon ? iconByKey[icon] : undefined,
    }))
  }

  return [
    {
      title: section.navigationTitle ?? section.label,
      url: section.route,
      icon: section.navigationIcon
        ? iconByKey[section.navigationIcon]
        : undefined,
    },
  ]
}

function createNavigationItem(category: NavigationCategory): NavCollapsible {
  return {
    title: category.title,
    icon: iconByKey[category.icon],
    items: category.sections.flatMap(navigationEntriesFor),
  }
}

// Converts framework-neutral catalog metadata into sidebar presentation types.
export const sidebarData: SidebarData = {
  navGroups: [
    {
      title: 'General',
      items: DASHBOARD_CATALOG.map(createNavigationItem),
    },
  ],
}

function canAccessNavUrl(url: string | undefined, user: GateUser): boolean {
  return url ? canAccessPath(url, user) : false
}

/** Returns one consistent permission-filtered navigation model for all menus. */
export function filterNavGroupsBySections(
  groups: NavGroup[],
  user: GateUser
): NavGroup[] {
  const itemVisible = (item: NavLink | NavCollapsible): boolean => {
    if (item.items) {
      return item.items.some((subItem) => canAccessNavUrl(subItem.url, user))
    }
    return canAccessNavUrl(item.url, user)
  }

  return groups
    .map((group) => {
      const items = group.items
        .map((item) => {
          if (!item.items) return item
          return {
            ...item,
            items: item.items.filter((subItem) =>
              canAccessNavUrl(subItem.url, user)
            ),
          }
        })
        .filter(itemVisible)

      return { ...group, items }
    })
    .filter((group) => group.items.length > 0)
}
