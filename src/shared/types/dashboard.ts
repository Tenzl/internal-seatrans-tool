import { LucideIcon } from "lucide-react"

export type RoleGroup = "INTERNAL" | "EXTERNAL"

export interface NavigationItem {
  title: string
  url: string
  icon: LucideIcon
  isActive?: boolean
  items?: NavigationSubItem[]
  badge?: string | number
}

export interface NavigationSubItem {
  title: string
  url: string
}

export interface DashboardConfig {
  navigation: NavigationItem[]
  projects?: ProjectItem[]
}

export interface ProjectItem {
  name: string
  url: string
  icon: LucideIcon
}

export interface User {
  id: number
  email: string
  username?: string | null
  fullName: string | null
  nation?: string
  phone?: string | null
  company?: string | null
  role?: string
  roleId?: number
  roleGroup?: RoleGroup
  oauthProvider?: string | null
  emailVerified?: boolean
}
