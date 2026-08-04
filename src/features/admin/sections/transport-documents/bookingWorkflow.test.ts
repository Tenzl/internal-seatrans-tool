import { describe, expect, it } from 'vitest'
import {
  buildBookingWorkflowUrl,
  buildCreateBookingUrl,
  getBookingWorkflowSteps,
  recordBelongsToBooking,
} from './bookingWorkflow'

describe('booking workflow routing', () => {
  it('uses Booking -> AN -> BL for exports', () => {
    expect(getBookingWorkflowSteps('EXPORT')).toEqual(['booking', 'an', 'bl'])
  })

  it('uses Booking -> AN -> D/O for imports', () => {
    expect(getBookingWorkflowSteps('IMPORT')).toEqual(['booking', 'an', 'do'])
  })

  it('builds create and existing step URLs with workflow identity', () => {
    expect(buildCreateBookingUrl('IMPORT')).toBe(
      '/booking/documents/booking-confirmation?flow=IMPORT'
    )
    expect(
      buildBookingWorkflowUrl('EXPORT', 12, 'an', {
        id: 15,
      } as never)
    ).toBe(
      '/booking/documents/arrival-notice?flow=EXPORT&bookingId=12&recordId=15'
    )
  })

  it('rejects a document record from another booking context', () => {
    expect(
      recordBelongsToBooking(
        { id: 20, documentType: 'an', bookingId: 12 } as never,
        12
      )
    ).toBe(true)
    expect(
      recordBelongsToBooking(
        { id: 20, documentType: 'an', bookingId: 13 } as never,
        12
      )
    ).toBe(false)
    expect(
      recordBelongsToBooking({ id: 12, documentType: 'booking' } as never, 12)
    ).toBe(true)
  })
})
