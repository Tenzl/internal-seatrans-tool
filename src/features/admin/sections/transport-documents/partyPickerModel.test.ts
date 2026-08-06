import { describe, expect, it } from 'vitest'
import type { PartnerOption } from '../partner-management/partnerManagementService'
import {
  formatPartyDocumentValue,
  formatPartyFieldValue,
  formatPartyNameValue,
  getNextPartyOptionPage,
  mergePartyOptionPages,
} from './partyPickerModel'

const option = (id: number, name = `Party ${id}`): PartnerOption => ({
  id,
  name,
  customerId: `P-${id}`,
  address: '1 Main Street, Tokyo, Japan',
  city: 'Tokyo',
  country: 'Japan',
  phone: '+81 1',
  fax: '+81 2',
})

describe('Party picker model', () => {
  it('builds the read-only document block without repeating location', () => {
    expect(formatPartyDocumentValue(option(1, 'APEX'))).toBe(
      'APEX\n1 Main Street, Tokyo, Japan\nTEL: +81 1  FAX: +81 2'
    )
  })

  it('formats name-only values for Booking Client', () => {
    expect(formatPartyNameValue(option(1, 'APEX'))).toBe('APEX')
    expect(formatPartyFieldValue(option(1, 'APEX'), 'name')).toBe('APEX')
    expect(formatPartyFieldValue(option(1, 'APEX'), 'full')).toContain('TEL:')
  })

  it('deduplicates Party rows across ten-row pages', () => {
    expect(
      mergePartyOptionPages([
        { content: [option(1), option(2)], page: 0, size: 10, hasNext: true },
        { content: [option(2), option(3)], page: 1, size: 10, hasNext: false },
      ]).map((item) => item.id)
    ).toEqual([1, 2, 3])
  })

  it('loads another page only when the endpoint says more data exists', () => {
    expect(
      getNextPartyOptionPage({ content: [], page: 2, size: 10, hasNext: true })
    ).toBe(3)
    expect(
      getNextPartyOptionPage({ content: [], page: 2, size: 10, hasNext: false })
    ).toBeUndefined()
  })
})
