import { describe, expect, it } from 'vitest'
import {
  formatDocumentNumberDuplicateMessage,
  getDocumentNumber,
} from './documentNumberDuplicate'
import type { DocumentNumberCheck } from './transportDocument.types'

describe('document number duplicate helpers', () => {
  it.each([
    ['booking', { bookingNumber: ' BK-1 ' }, 'BK-1'],
    ['bl', { fblNumber: ' HBL-1 ' }, 'HBL-1'],
    ['an', { anNumber: ' AN-1 ' }, 'AN-1'],
    ['do', { doNumber: ' DO-1 ' }, 'DO-1'],
  ] as const)('reads the primary number for %s', (type, payload, expected) => {
    expect(getDocumentNumber(type, payload)).toBe(expected)
  })

  it('warns explicitly when a Booking No. already exists', () => {
    const check: DocumentNumberCheck = {
      documentType: 'booking',
      number: 'BK-1',
      duplicate: true,
      matches: [
        {
          id: 1,
          documentType: 'booking',
          bookingId: 1,
          bookingNumber: 'BK-1',
          number: 'BK-1',
          createdAt: '2026-08-18T00:00:00.000Z',
        },
      ],
    }

    expect(formatDocumentNumberDuplicateMessage(check)).toBe(
      'Booking No. BK-1 already exists.'
    )
  })

  it('shows the document type and owning Booking No. for one match', () => {
    const check: DocumentNumberCheck = {
      documentType: 'bl',
      number: 'HBL-1',
      duplicate: true,
      matches: [
        {
          id: 8,
          documentType: 'bl',
          bookingId: 15,
          bookingNumber: 'BK-2026-015',
          number: 'HBL-1',
          createdAt: '2026-08-18T00:00:00.000Z',
        },
      ],
    }

    expect(formatDocumentNumberDuplicateMessage(check)).toBe(
      'Number HBL-1 is already used in 1 BL with Booking No. BK-2026-015.'
    )
  })
})
