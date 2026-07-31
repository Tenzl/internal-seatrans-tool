import { describe, expect, it } from 'vitest'
import type { InquiryHistoryRecord } from './inquiryHistory.types'
import {
  canLockInquiryEpda,
  getInquiryDisplayName,
  getInquiryPort,
  getInquiryRowCapabilities,
  getShippingAgencyDetailParams,
  resolveInquiryServiceLabel,
} from './inquiryHistoryRules'

function inquiry(
  overrides: Partial<InquiryHistoryRecord> = {}
): InquiryHistoryRecord {
  return {
    id: 42,
    status: 'PENDING',
    submittedAt: '2026-07-30T00:00:00.000Z',
    ...overrides,
  }
}

describe('inquiryHistoryRules', () => {
  it('uses the same service label fallback order as history', () => {
    expect(
      resolveInquiryServiceLabel(
        inquiry({
          serviceType: { name: 'Shipping', displayName: 'Shipping Agency' },
        }),
        'Fallback'
      )
    ).toBe('Shipping Agency')
    expect(resolveInquiryServiceLabel(inquiry(), 'Fallback')).toBe('Fallback')
  })

  it('resolves vessel, customer and port display fallbacks', () => {
    expect(
      getInquiryDisplayName(inquiry({ vesselName: 'MV Test' }), true)
    ).toBe('MV Test')
    expect(
      getInquiryDisplayName(inquiry({ contactName: 'Nguyen Van A' }), false)
    ).toBe('Nguyen Van A')
    expect(getInquiryPort(inquiry({ dischargingPort: 'HCM' }))).toBe('HCM')
  })

  it('only allows locking an active, unlocked shipping-agency EPDA for admins', () => {
    expect(canLockInquiryEpda(inquiry(), true, 'shipping-agency')).toBe(true)
    expect(
      canLockInquiryEpda(inquiry({ isArchived: true }), true, 'shipping-agency')
    ).toBe(false)
    expect(
      canLockInquiryEpda(
        inquiry({ epdaLockedAt: '2026-07-30T00:00:00Z' }),
        true,
        'shipping-agency'
      )
    ).toBe(false)
    expect(canLockInquiryEpda(inquiry(), false, 'shipping-agency')).toBe(false)
  })

  it('opens unlocked inquiries in edit mode', () => {
    expect(getShippingAgencyDetailParams(inquiry())).toEqual({
      inquiryId: '42',
      mode: 'edit',
    })
  })

  it.each(['QUOTED', 'COMPLETED'])(
    'adds preview mode for %s inquiries',
    (status) => {
      expect(getShippingAgencyDetailParams(inquiry({ status }))).toEqual({
        inquiryId: '42',
        mode: 'edit',
        preview: '1',
      })
    }
  )

  it('makes a locked inquiry preview-only', () => {
    expect(
      getShippingAgencyDetailParams(
        inquiry({ epdaLockedAt: '2026-07-30T00:00:00Z' })
      )
    ).toEqual({
      inquiryId: '42',
      preview: '1',
    })
  })

  it('derives archive, restore, delete and invoice actions from permissions', () => {
    expect(
      getInquiryRowCapabilities({
        inquiry: inquiry({ isArchived: true, status: 'QUOTED' }),
        isAdmin: true,
        canSoftDelete: false,
        canHardDelete: true,
        fallbackServiceType: 'shipping-agency',
      })
    ).toMatchObject({
      canArchive: false,
      canDelete: true,
      canRestore: true,
      canViewInvoice: false,
    })

    expect(
      getInquiryRowCapabilities({
        inquiry: inquiry({ status: 'QUOTED' }),
        isAdmin: false,
        canSoftDelete: false,
        canHardDelete: false,
        fallbackServiceType: 'shipping-agency',
      })
    ).toMatchObject({
      canDelete: false,
      canRestore: false,
      canViewInvoice: true,
    })
  })
})
