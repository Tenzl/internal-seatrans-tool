'use client'

import { useLayout } from '@/context/layout-provider'
import { useAuthUser } from '@/hooks/use-current-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { AppTitle } from './app-title'
import { filterNavGroupsBySections, sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { user, loading } = useAuthUser()
  // Show only the pages this user's role is granted (admins see everything).
  // Access is per-section — managed in /roles and resolved from /auth/me.
  const navGroups = loading
    ? []
    : filterNavGroupsBySections(sidebarData.navGroups, user)
  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <AppTitle />
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
