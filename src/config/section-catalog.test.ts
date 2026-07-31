import { describe, expect, it } from 'vitest'
import {
  filterNavGroupsBySections,
  sidebarData,
} from '@/components/layout/data/sidebar-data'
import { isAdminRole, SECTION_CATALOG, sectionForPath } from './section-catalog'

describe('dashboard section catalog contract', () => {
  it('recognizes only the reserved admin role', () => {
    expect(isAdminRole('ROLE_ADMIN')).toBe(true)
    expect(isAdminRole(' admin ')).toBe(true)
    expect(isAdminRole('ROLE_ADMIN_ASSISTANT')).toBe(false)
    expect(isAdminRole('SUPER_ADMIN')).toBe(false)
    expect(isAdminRole('ADMINISTRATOR')).toBe(false)
  })

  it('matches the backend permission catalog', () => {
    expect(
      SECTION_CATALOG.map(({ key, label, group }) => ({ key, label, group }))
    ).toMatchInlineSnapshot(`
      [
        {
          "group": "EPDA",
          "key": "epda-create",
          "label": "Create EPDA",
        },
        {
          "group": "EPDA",
          "key": "epda-inquiry",
          "label": "Inquiry",
        },
        {
          "group": "EPDA",
          "key": "epda-parameter",
          "label": "Parameter",
        },
        {
          "group": "Booking Management",
          "key": "booking-documents",
          "label": "Transport documents",
        },
        {
          "group": "Data Management",
          "key": "booking-partner",
          "label": "Partner",
        },
        {
          "group": "Data Management",
          "key": "booking-shipment",
          "label": "Shipment",
        },
        {
          "group": "Data Management",
          "key": "users",
          "label": "Users",
        },
        {
          "group": "Administration",
          "key": "roles",
          "label": "Roles & access",
        },
        {
          "group": "Data Management",
          "key": "data-ports",
          "label": "Ports",
        },
        {
          "group": "Data Management",
          "key": "data-cargo",
          "label": "Cargo",
        },
        {
          "group": "Data Management",
          "key": "data-images",
          "label": "Images",
        },
        {
          "group": "Data Management",
          "key": "data-offices",
          "label": "Offices",
        },
        {
          "group": "Data Management",
          "key": "data-storage",
          "label": "Storage",
        },
        {
          "group": "Content Management",
          "key": "content-posts",
          "label": "Posts",
        },
        {
          "group": "Content Management",
          "key": "content-categories",
          "label": "Categories",
        },
      ]
    `)
  })

  it('keeps every key, permission route, and navigation URL unambiguous', () => {
    const keys = SECTION_CATALOG.map((section) => section.key)
    const routes = SECTION_CATALOG.map((section) => section.route)
    const navigationUrls = sidebarData.navGroups
      .flatMap((group) =>
        group.items.flatMap((item) =>
          item.items ? item.items.map((subItem) => subItem.url) : [item.url]
        )
      )
      .filter((url): url is string => typeof url === 'string')

    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(routes).size).toBe(routes.length)
    expect(new Set(navigationUrls).size).toBe(navigationUrls.length)
    expect(navigationUrls.every((url) => sectionForPath(url) !== null)).toBe(
      true
    )
  })

  it('maps all four transport-document links to one permission section', () => {
    const booking = sidebarData.navGroups
      .flatMap((group) => group.items)
      .find((item) => item.title === 'Booking Management')
    const ownedSections = (booking?.items ?? []).map((item) =>
      item.url ? sectionForPath(item.url)?.key : undefined
    )

    expect(ownedSections).toEqual(Array(4).fill('booking-documents'))
  })

  it('produces the same permission-filtered model for sidebar and command menu', () => {
    const groups = filterNavGroupsBySections(sidebarData.navGroups, {
      role: 'ROLE_OPERATOR',
      sections: ['booking-documents'],
    })

    expect(groups).toHaveLength(1)
    expect(groups[0]?.items.map((item) => item.title)).toEqual([
      'Booking Management',
    ])
    expect(groups[0]?.items[0]?.items).toHaveLength(4)
  })
})
