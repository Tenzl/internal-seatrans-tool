import type { ShippingAgencyAdminInquiry } from '@/modules/inquiries/types/shippingAgencyEpda'
import { describe, expect, it } from 'vitest'
import {
  mergeIssuedInquiryMeta,
  resolveIssuedLockedAt,
} from './epdaPersistenceRules'

const inquiry = {
  id: 7,
  status: 'PROCESSING',
  epdaLockedAt: null,
} as ShippingAgencyAdminInquiry

describe('epdaPersistenceRules', () => {
  it('uses the server lock timestamp when available', () => {
    expect(
      resolveIssuedLockedAt(
        { ...inquiry, epdaLockedAt: '2026-07-30T10:00:00.000Z' },
        new Date('2026-07-30T11:00:00.000Z')
      )
    ).toBe('2026-07-30T10:00:00.000Z')
  })

  it('falls back to the issue time when the response omits a lock timestamp', () => {
    expect(
      resolveIssuedLockedAt(inquiry, new Date('2026-07-30T11:00:00.000Z'))
    ).toBe('2026-07-30T11:00:00.000Z')
  })

  it('merges server issue status and lock metadata into the loaded inquiry', () => {
    expect(
      mergeIssuedInquiryMeta(inquiry, {
        ...inquiry,
        status: 'QUOTED',
        epdaLockedAt: '2026-07-30T10:00:00.000Z',
      })
    ).toMatchObject({
      id: 7,
      status: 'QUOTED',
      epdaLockedAt: '2026-07-30T10:00:00.000Z',
    })
  })

  it('does not create inquiry metadata when none was loaded', () => {
    expect(mergeIssuedInquiryMeta(null, inquiry)).toBeNull()
  })
})
