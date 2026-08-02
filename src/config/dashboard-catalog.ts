import { CANONICAL_CREATE_EPDA_PATH } from '@/config/dashboard-routes'

export type DashboardIconKey =
  | 'anchor'
  | 'briefcase'
  | 'building'
  | 'database'
  | 'file-text'
  | 'hard-drive'
  | 'image'
  | 'newspaper'
  | 'package'
  | 'shield'
  | 'ship'
  | 'tag'
  | 'users'

export interface SectionDef {
  key: string
  label: string
  group: string
  /** Route prefix owned by this permission section. */
  route: string
}

export interface NavigationEntry {
  title: string
  url: string
  icon?: DashboardIconKey
}

export interface DashboardSection extends Omit<SectionDef, 'group'> {
  /** Override only when the backend permission group differs from navigation. */
  permissionGroup?: string
  /** Omit for the standard one-link section generated from label + route. */
  navigation?: readonly NavigationEntry[]
  navigationTitle?: string
  navigationIcon?: DashboardIconKey
}

export interface NavigationCategory {
  title: string
  icon: DashboardIconKey
  sections: readonly DashboardSection[]
}

// Canonical dashboard metadata; access policy and navigation UI derive from it.
export const DASHBOARD_CATALOG: readonly NavigationCategory[] = [
  {
    title: 'EPDA',
    icon: 'file-text',
    sections: [
      {
        key: 'epda-create',
        label: 'Create EPDA',
        route: CANONICAL_CREATE_EPDA_PATH,
      },
      {
        key: 'epda-inquiry',
        label: 'Inquiry',
        route: '/epda/inquiry',
        navigationTitle: 'History record',
      },
      {
        key: 'epda-parameter',
        label: 'Parameter',
        route: '/epda/parameter',
      },
    ],
  },
  {
    title: 'Booking Management',
    icon: 'briefcase',
    sections: [
      {
        key: 'booking-documents',
        label: 'Booking Management',
        permissionGroup: 'Data Management',
        route: '/booking/documents',
        navigation: [
          {
            title: 'Create Arrival Notice',
            url: '/booking/documents/arrival-notice',
          },
          {
            title: 'Create Booking Confirmation',
            url: '/booking/documents/booking-confirmation',
          },
          {
            title: 'Create Delivery Order',
            url: '/booking/documents/delivery-order',
          },
          {
            title: 'Create Bill of Lading',
            url: '/booking/documents/bill-of-lading',
          },
          {
            title: 'History record',
            url: '/booking/documents/history',
          },
        ],
      },
    ],
  },
  {
    title: 'Data Management',
    icon: 'database',
    sections: [
      {
        key: 'booking-partner',
        label: 'Partner',
        route: '/booking/partner',
        navigationIcon: 'briefcase',
      },
      {
        key: 'booking-shipment',
        label: 'Shipment',
        route: '/booking/shipping',
        navigationIcon: 'ship',
      },
      {
        key: 'users',
        label: 'Users',
        route: '/users',
        navigationIcon: 'users',
      },
      {
        key: 'roles',
        label: 'Roles & access',
        permissionGroup: 'Administration',
        route: '/roles',
        navigationTitle: 'Roles',
        navigationIcon: 'shield',
      },
      {
        key: 'data-ports',
        label: 'Ports',
        route: '/data/ports',
        navigationIcon: 'anchor',
      },
      {
        key: 'data-cargo',
        label: 'Cargo',
        route: '/data/cargo',
        navigationIcon: 'package',
      },
      {
        key: 'data-images',
        label: 'Images',
        route: '/data/images',
        navigationIcon: 'image',
      },
      {
        key: 'data-offices',
        label: 'Offices',
        route: '/data/offices',
        navigationIcon: 'building',
      },
      {
        key: 'data-storage',
        label: 'Storage',
        route: '/data/storage',
        navigationIcon: 'hard-drive',
      },
    ],
  },
  {
    title: 'Content Management',
    icon: 'newspaper',
    sections: [
      {
        key: 'content-posts',
        label: 'Posts',
        route: '/content/posts',
        navigationIcon: 'newspaper',
      },
      {
        key: 'content-categories',
        label: 'Categories',
        route: '/content/categories',
        navigationIcon: 'tag',
      },
    ],
  },
]

export const SECTION_CATALOG: readonly SectionDef[] = DASHBOARD_CATALOG.flatMap(
  (category) =>
    category.sections.map(({ key, label, permissionGroup, route }) => ({
      key,
      label,
      group: permissionGroup ?? category.title,
      route,
    }))
)
