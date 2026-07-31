import { describe, expect, it } from 'vitest'
import {
  addTransitLeg,
  collectPortIds,
  composeBookingContact,
  contactOptionLabel,
  emptyBookingShippingForm,
  removeTransitLeg,
  setBookingShippingField,
  updateTransitLeg,
} from './bookingShippingForm'

describe('booking shipping form rules', () => {
  it('formats contact labels and persisted contact text', () => {
    const contact = {
      firstName: 'Lan',
      lastName: 'Nguyen',
      title: 'Manager',
      email: 'lan@example.com',
      phone: '0901',
    }

    expect(contactOptionLabel(contact)).toBe('Lan Nguyen — Manager')
    expect(composeBookingContact(contact)).toBe(
      'Lan Nguyen · lan@example.com · 0901'
    )
  })

  it('normalizes an empty field value to null', () => {
    const form = emptyBookingShippingForm()
    expect(setBookingShippingField(form, 'bookingNo', '').bookingNo).toBeNull()
    expect(setBookingShippingField(form, 'bookingNo', 'B-1').bookingNo).toBe(
      'B-1'
    )
  })

  it('adds, updates and removes transit legs without mutating the source form', () => {
    const original = emptyBookingShippingForm()
    const added = addTransitLeg(original, 12)
    const updated = updateTransitLeg(added, 0, { eta: '2026-08-01T12:00' })
    const withSecond = addTransitLeg(updated, 13)
    const removed = removeTransitLeg(withSecond, 0)

    expect(original.transitLegs).toEqual([])
    expect(added.transitLegs[0]).toMatchObject({ portId: 12, sortOrder: 1 })
    expect(updated.transitLegs[0].eta).toBe('2026-08-01T12:00')
    expect(removed.transitLegs).toEqual([
      { portId: 13, sortOrder: 1, eta: null, etd: null },
    ])
  })

  it('collects unique scalar and transit port IDs', () => {
    const form = emptyBookingShippingForm()
    form.placeOfReceiptPortId = 2
    form.portOfLoadingPortId = 2
    form.transitLegs = [{ portId: 3, sortOrder: 1 }]

    expect(collectPortIds(form)).toEqual([2, 3])
  })
})
