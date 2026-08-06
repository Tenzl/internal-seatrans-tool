import { describe, expect, it } from 'vitest'
import {
  PARTNER_ADDITION_TYPE_OPTIONS,
  createEmptyPartnerForm,
  partnerDetailToForm,
  partnerFormToRequest,
  validatePartnerForm,
} from './partnerFormModel'
import type { BookingPartnerDetail } from './partnerManagementTypes'

describe('partner form model', () => {
  it('classifies Agent through customer type instead of an addition tag', () => {
    expect(PARTNER_ADDITION_TYPE_OPTIONS).not.toContain('AGENT')
  })
  it('creates independent empty form values', () => {
    const first = createEmptyPartnerForm()
    const second = createEmptyPartnerForm()

    first.contacts.push({ person: 'Alice' })

    expect(second.contacts).toEqual([])
    expect(validatePartnerForm(first)).toBe('Name is required')
  })

  it('maps optional form values without changing the request contract', () => {
    const form = createEmptyPartnerForm()
    form.name = 'Acme'
    form.paymentDueDays = ' 30 '

    expect(partnerFormToRequest(form)).toMatchObject({
      name: 'Acme',
      contacts: [],
      additionTypes: [],
      paymentDueDays: 30,
      customerId: undefined,
      approveStatus: undefined,
      approveBy: undefined,
    })
  })

  it('normalizes nullable detail values for controlled inputs', () => {
    const detail = {
      id: 1,
      name: 'Acme',
      customerId: 'P-1',
      additionTypes: [],
      contacts: [{ person: 'Alice', email: null }],
      taxNumber: '',
      paymentDueDays: 15,
      createdBy: 'admin',
      createdAt: '2026-07-30T00:00:00.000Z',
      updatedBy: 'admin',
      updatedAt: '2026-07-30T00:00:00.000Z',
    } satisfies BookingPartnerDetail

    const form = partnerDetailToForm(detail)

    expect(form.paymentDueDays).toBe('15')
    expect(form.contacts[0]).toEqual({
      person: 'Alice',
      firstName: '',
      lastName: '',
      email: null,
      phone: '',
      title: '',
      dateOfBirth: '',
    })
  })
})
