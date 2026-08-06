import { describe, expect, it } from 'vitest'
import { sidebarData } from '@/components/layout/data/sidebar-data'
import {
  CANONICAL_EPDA_HISTORY_PATH,
  CANONICAL_CREATE_EPDA_PATH,
  LEGACY_EPDA_HISTORY_PATH,
  LEGACY_CREATE_EPDA_PATH,
  canonicalizeDashboardPath,
} from './dashboard-routes'
import {
  canAccessAuthenticatedPath,
  canAccessPath,
  firstAccessibleDashboardPath,
  resolvePostLoginPath,
  SECTION_CATALOG,
} from './section-catalog'

describe('dashboard route policy', () => {
  const operator = { role: 'ROLE_OPERATOR', sections: ['epda-create'] }

  it('allows granted mapped routes and denies unmapped authenticated routes', () => {
    expect(canAccessPath(CANONICAL_CREATE_EPDA_PATH, operator)).toBe(true)
    expect(canAccessPath('/tasks', operator)).toBe(false)
    expect(canAccessPath(LEGACY_CREATE_EPDA_PATH, operator)).toBe(false)
  })

  it('allows authenticated self-service routes without granting business data', () => {
    const noSections = { role: 'ROLE_OPERATOR', sections: [] }

    expect(canAccessAuthenticatedPath('/settings', noSections)).toBe(true)
    expect(canAccessAuthenticatedPath('/settings/account', noSections)).toBe(
      true
    )
    expect(canAccessAuthenticatedPath('/errors/not-found', noSections)).toBe(
      true
    )
    expect(canAccessAuthenticatedPath('/data/ports', noSections)).toBe(false)
    expect(canAccessAuthenticatedPath('/settings', null)).toBe(false)
  })

  it('authorizes compatibility URLs using their canonical permission', () => {
    expect(canAccessAuthenticatedPath(LEGACY_CREATE_EPDA_PATH, operator)).toBe(
      true
    )
    expect(
      canAccessAuthenticatedPath(LEGACY_EPDA_HISTORY_PATH, {
        role: 'ROLE_OPERATOR',
        sections: ['epda-inquiry'],
      })
    ).toBe(true)
  })

  it('chooses a landing page the current user can access', () => {
    expect(firstAccessibleDashboardPath(operator)).toBe(
      CANONICAL_CREATE_EPDA_PATH
    )
    expect(
      firstAccessibleDashboardPath({
        role: 'ROLE_OPERATOR',
        sections: ['booking-documents'],
      })
    ).toBe('/booking/documents/booking-confirmation')
    expect(
      firstAccessibleDashboardPath({
        role: 'ROLE_OPERATOR',
        sections: [],
      })
    ).toBeNull()
    expect(firstAccessibleDashboardPath(null)).toBeNull()
  })

  it('resolves post-login navigation without defaulting to settings', () => {
    expect(
      resolvePostLoginPath({ role: 'ROLE_OPERATOR', sections: ['epda-create'] })
    ).toBe(CANONICAL_CREATE_EPDA_PATH)
    expect(
      resolvePostLoginPath({ role: 'ROLE_OPERATOR', sections: [] })
    ).toBe('/')
    expect(
      resolvePostLoginPath(
        { role: 'ROLE_OPERATOR', sections: [] },
        '/data/ports'
      )
    ).toBe('/data/ports')
  })

  it('maps transport documents to its own role section', () => {
    const documentOperator = {
      role: 'ROLE_OPERATOR',
      sections: ['booking-documents'],
    }
    expect(
      canAccessPath('/booking/documents/arrival-notice', documentOperator)
    ).toBe(true)
    expect(
      canAccessPath('/booking/documents/booking-confirmation', documentOperator)
    ).toBe(true)
    expect(
      canAccessPath('/booking/documents/delivery-order', documentOperator)
    ).toBe(true)
    expect(canAccessPath('/booking/documents/history', documentOperator)).toBe(
      true
    )
    expect(canAccessPath('/booking/documents', operator)).toBe(false)
  })

  it('shows Create Booking and History under Booking Management', () => {
    const general = sidebarData.navGroups.find(
      (group) => group.title === 'General'
    )
    const booking = general?.items.find(
      (item) => item.title === 'Booking Management'
    )

    expect(booking?.items).toEqual([
      {
        title: 'Create Booking',
        url: '/booking/documents/booking-confirmation',
      },
      {
        title: 'History',
        url: '/booking/documents/history',
      },
    ])
  })

  it('keeps Partner in Data Management without the retired Shipment page', () => {
    expect(
      SECTION_CATALOG.find((section) => section.key === 'booking-partner')
        ?.group
    ).toBe('Data Management')
    expect(
      SECTION_CATALOG.find((section) => section.key === 'booking-shipment')
    ).toBeUndefined()

    const general = sidebarData.navGroups.find(
      (group) => group.title === 'General'
    )
    const dataManagement = general?.items.find(
      (item) => item.title === 'Data Management'
    )
    const dataTitles = (dataManagement?.items ?? []).map((item) => item.title)

    expect(dataTitles).toContain('Partner')
    expect(dataTitles).not.toContain('Shipment')
  })

  it('keeps admin access while denying anonymous access by default', () => {
    expect(canAccessPath('/tasks', { role: 'ROLE_ADMIN' })).toBe(true)
    expect(canAccessPath(CANONICAL_CREATE_EPDA_PATH, null)).toBe(false)
  })

  it('canonicalizes the legacy Create EPDA URL', () => {
    expect(canonicalizeDashboardPath(LEGACY_CREATE_EPDA_PATH)).toBe(
      CANONICAL_CREATE_EPDA_PATH
    )
    expect(canonicalizeDashboardPath(CANONICAL_CREATE_EPDA_PATH)).toBe(
      CANONICAL_CREATE_EPDA_PATH
    )
    expect(canonicalizeDashboardPath(LEGACY_EPDA_HISTORY_PATH)).toBe(
      CANONICAL_EPDA_HISTORY_PATH
    )
  })
})
