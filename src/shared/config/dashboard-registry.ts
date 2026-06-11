import { lazy } from "react"
import type React from "react"
import {
  User,
  Calculator,
  ListChecks,
  Package,
  Truck,
  Ship,
  Anchor,
  FileText,
  Image as ImageIcon,
  Cog,
  LayoutDashboard,
  Database,
  BriefcaseBusiness,
} from "lucide-react"

import { RoleGroup } from "@/shared/types/dashboard"

// Role strings from backend
export type SectionRole = "ADMIN" | "EMPLOYEE" | "CUSTOMER"

export type DashboardSection =
  | "profile"
  | "create-epda"
  | "shipping-agency-inquiry-detail"
  | "shipping-agency-inquiries"
  | "freight-forwarding-inquiries"
  | "logistics-inquiries"
  | "chartering-inquiries"
  | "special-request-inquiries"
  | "users"
  | "images"
  | "services"
  | "ports"
  | "offices"
  | "cargo-types"
  | "categories"
  | "posts"
  | "booking-partners"
  | "booking-shipping"
  | "inquiry"

export interface SectionConfig {
  id: DashboardSection
  label: string
  icon: React.ComponentType<{ className?: string }>
  component: React.LazyExoticComponent<React.ComponentType<any>>
  roles: SectionRole[]
  roleGroups: RoleGroup[] // allow sharing sections (e.g., profile) across groups
  category: string
  title: string
  description?: string
  /** Deep-link screen only (e.g. inquiry detail); omitted from sidebar */
  navHidden?: boolean
}

// Lazy loaded components
const EditProfileTab = lazy(() => import("@/features/admin/components/EditProfileTab").then(m => ({ default: m.EditProfileTab })))
const CreateInvoiceTab = lazy(() => import("@/features/admin/components/CreateInvoiceTab").then(m => ({ default: m.CreateInvoiceTab })))
const ShippingAgencyInquiryDetailTab = lazy(() =>
  import("@/features/admin/components/ShippingAgencyInquiryDetailTab").then(m => ({
    default: m.ShippingAgencyInquiryDetailTab,
  })),
)
const ShippingAgencyInquiriesTab = lazy(() => import("@/features/admin/components/ShippingAgencyInquiriesTab").then(m => ({ default: m.ShippingAgencyInquiriesTab })))
const FreightForwardingInquiriesTab = lazy(() => import("@/features/admin/components/FreightForwardingInquiriesTab").then(m => ({ default: m.FreightForwardingInquiriesTab })))
const LogisticsInquiriesTab = lazy(() => import("@/features/admin/components/LogisticsInquiriesTab").then(m => ({ default: m.LogisticsInquiriesTab })))
const CharteringInquiriesTab = lazy(() => import("@/features/admin/components/CharteringInquiriesTab").then(m => ({ default: m.CharteringInquiriesTab })))
const SpecialRequestInquiriesTab = lazy(() => import("@/features/admin/components/SpecialRequestInquiriesTab").then(m => ({ default: m.SpecialRequestInquiriesTab })))
const GalleryImageHub = lazy(() => import("@/modules/gallery/components/admin/GalleryImageHub").then(m => ({ default: m.GalleryImageHub })))
const ManageServices = lazy(() => import("@/features/admin/components/ManageServices").then(m => ({ default: m.ManageServices })))
const ManagePorts = lazy(() => import("@/features/admin/components/ManagePorts").then(m => ({ default: m.ManagePorts })))
const ManageOffices = lazy(() => import("@/features/admin/components/ManageOffices").then(m => ({ default: m.ManageOffices })))
const ManageCommodities = lazy(() => import("@/modules/gallery/components/admin/CommodityManagement").then(m => ({ default: m.ManageCommodities })))
const ManageCategories = lazy(() => import("@/modules/categories/components/admin/CategoryManagement").then(m => ({ default: m.ManageCategories })))
const ManagePosts = lazy(() => import("@/modules/posts/components/admin/PostManagement").then(m => ({ default: m.ManagePosts })))
const PartnerManagementTab = lazy(() => import("@/features/admin/components/PartnerManagementTab").then(m => ({ default: m.PartnerManagementTab })))
const BookingShippingTab = lazy(() => import("@/features/admin/components/BookingShippingTab").then(m => ({ default: m.BookingShippingTab })))
const ManageUsers = lazy(() => import("@/features/admin/components/ManageUsers").then(m => ({ default: m.ManageUsers })))

const UserInquiriesPage = lazy(() => import("@/features/user/component/UserInquiriesPage").then(m => ({ default: m.UserInquiriesPage })))

export const SECTION_REGISTRY: Record<DashboardSection, SectionConfig> = {
  profile: {
    id: "profile",
    label: "Edit Profile",
    icon: User,
    component: EditProfileTab,
    roles: ["ADMIN", "EMPLOYEE", "CUSTOMER"],
    roleGroups: ["INTERNAL", "EXTERNAL"],
    category: "Profile",
    title: "Edit Profile",
  },
  "create-epda": {
    id: "create-epda",
    label: "Create EPDA",
    icon: Calculator,
    component: CreateInvoiceTab,
    roles: ["ADMIN", "EMPLOYEE"],
    roleGroups: ["INTERNAL"],
    category: "Port Charge",
    title: "Create EPDA",
  },
  "shipping-agency-inquiry-detail": {
    id: "shipping-agency-inquiry-detail",
    label: "Inquiry detail",
    icon: ListChecks,
    component: ShippingAgencyInquiryDetailTab,
    roles: ["ADMIN", "EMPLOYEE"],
    roleGroups: ["INTERNAL"],
    category: "Inquiries",
    title: "Shipping Agency Inquiry",
    navHidden: true,
  },
  "shipping-agency-inquiries": {
    id: "shipping-agency-inquiries",
    label: "Shipping Agency",
    icon: ListChecks,
    component: ShippingAgencyInquiriesTab,
    roles: ["ADMIN", "EMPLOYEE"],
    roleGroups: ["INTERNAL"],
    category: "Inquiries",
    title: "Shipping Agency Inquiries",
  },
  "freight-forwarding-inquiries": {
    id: "freight-forwarding-inquiries",
    label: "Freight Forwarding",
    icon: Package,
    component: FreightForwardingInquiriesTab,
    roles: ["ADMIN", "EMPLOYEE"],
    roleGroups: ["INTERNAL"],
    category: "Inquiries",
    title: "Freight Forwarding Inquiries",
  },
  "logistics-inquiries": {
    id: "logistics-inquiries",
    label: "Logistics",
    icon: Truck,
    component: LogisticsInquiriesTab,
    roles: ["ADMIN", "EMPLOYEE"],
    roleGroups: ["INTERNAL"],
    category: "Inquiries",
    title: "Logistics Inquiries",
  },
  "chartering-inquiries": {
    id: "chartering-inquiries",
    label: "Chartering",
    icon: Anchor,
    component: CharteringInquiriesTab,
    roles: ["ADMIN", "EMPLOYEE"],
    roleGroups: ["INTERNAL"],
    category: "Inquiries",
    title: "Chartering Inquiries",
  },
  "special-request-inquiries": {
    id: "special-request-inquiries",
    label: "Special Request",
    icon: FileText,
    component: SpecialRequestInquiriesTab,
    roles: ["ADMIN", "EMPLOYEE"],
    roleGroups: ["INTERNAL"],
    category: "Inquiries",
    title: "Special Request Inquiries",
  },
  images: {
    id: "images",
    label: "Images",
    icon: ImageIcon,
    component: GalleryImageHub,
    roles: ["ADMIN", "EMPLOYEE"],
    roleGroups: ["INTERNAL"],
    category: "Data Management",
    title: "Gallery Images",
    description: "Upload and manage field gallery images by area, port, and cargo type.",
  },
  users: {
    id: "users",
    label: "Users",
    icon: User,
    component: ManageUsers,
    roles: ["ADMIN"],
    roleGroups: ["INTERNAL"],
    category: "Data Management",
    title: "Manage Users",
    description: "Manage internal accounts and view external customer accounts.",
  },
  services: {
    id: "services",
    label: "Services",
    icon: Cog,
    component: ManageServices,
    roles: [],
    roleGroups: [],
    category: "Data Management",
    title: "Manage Services",
  },
  ports: {
    id: "ports",
    label: "Ports",
    icon: Anchor,
    component: ManagePorts,
    roles: ["ADMIN", "EMPLOYEE"],
    roleGroups: ["INTERNAL"],
    category: "Data Management",
    title: "Manage Ports",
  },
  offices: {
    id: "offices",
    label: "Offices",
    icon: LayoutDashboard,
    component: ManageOffices,
    roles: ["ADMIN", "EMPLOYEE"],
    roleGroups: ["INTERNAL"],
    category: "Data Management",
    title: "Manage Offices",
  },
  "cargo-types": {
    id: "cargo-types",
    label: "Cargo",
    icon: Package,
    component: ManageCommodities,
    roles: ["ADMIN", "EMPLOYEE"],
    roleGroups: ["INTERNAL"],
    category: "Data Management",
    title: "Manage Cargo",
  },
  categories: {
    id: "categories",
    label: "Categories",
    icon: Database,
    component: ManageCategories,
    roles: ["ADMIN", "EMPLOYEE"],
    roleGroups: ["INTERNAL"],
    category: "Content Management",
    title: "Manage Categories",
  },
  posts: {
    id: "posts",
    label: "Posts",
    icon: FileText,
    component: ManagePosts,
    roles: ["ADMIN", "EMPLOYEE"],
    roleGroups: ["INTERNAL"],
    category: "Content Management",
    title: "Manage Posts",
  },
  "booking-partners": {
    id: "booking-partners",
    label: "Partner",
    icon: BriefcaseBusiness,
    component: PartnerManagementTab,
    roles: ["ADMIN", "EMPLOYEE"],
    roleGroups: ["INTERNAL"],
    category: "Booking Management",
    title: "Partner Management",
  },
  "booking-shipping": {
    id: "booking-shipping",
    label: "Shipping",
    icon: Ship,
    component: BookingShippingTab,
    roles: ["ADMIN", "EMPLOYEE"],
    roleGroups: ["INTERNAL"],
    category: "Booking Management",
    title: "Shipping",
  },
  inquiry: {
    id: "inquiry",
    label: "My Inquiries",
    icon: FileText,
    component: UserInquiriesPage,
    roles: ["CUSTOMER"],
    roleGroups: ["EXTERNAL"],
    category: "Inquiries",
    title: "My Inquiries",
  },
}

export function getSectionConfig(section: DashboardSection): SectionConfig | undefined {
  return SECTION_REGISTRY[section]
}

export function listSectionsByRole(role: SectionRole): SectionConfig[] {
  return Object.values(SECTION_REGISTRY).filter((section) => section.roles.includes(role))
}

export function listSectionsByRoleGroup(roleGroup: RoleGroup): SectionConfig[] {
  return Object.values(SECTION_REGISTRY).filter((section) => section.roleGroups.includes(roleGroup))
}

export function listNavSectionsByRoleGroup(roleGroup: RoleGroup): SectionConfig[] {
  return listSectionsByRoleGroup(roleGroup).filter((section) => !section.navHidden)
}

export function canAccessSection(section: DashboardSection, role: SectionRole): boolean {
  const config = getSectionConfig(section)
  if (!config) return false
  return config.roles.includes(role)
}
