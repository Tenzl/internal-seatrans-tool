import { describe, expect, it } from 'vitest'
import {
  isTransportDocumentFieldRequired,
  REQUIRED_CONTAINER_FIELDS,
  REQUIRED_DOCUMENT_FIELDS,
} from './transportDocumentRequirements'

describe('transport document requirements', () => {
  it('defines minimum operational fields for every document in both workflows', () => {
    expect(REQUIRED_DOCUMENT_FIELDS.booking).toEqual(
      expect.arrayContaining([
        'bookingNumber',
        'portOfLoading',
        'portOfDischarge',
        'cargoVolumes',
      ])
    )
    expect(REQUIRED_DOCUMENT_FIELDS.bl).toContain('containers')
    expect(REQUIRED_DOCUMENT_FIELDS.an).toContain('containers')
    expect(REQUIRED_DOCUMENT_FIELDS.do).toContain('containers')
  })

  it('marks operational fields without making presentation-only notes required', () => {
    expect(isTransportDocumentFieldRequired('booking', 'bookingNumber')).toBe(
      true
    )
    expect(isTransportDocumentFieldRequired('booking', 'specialRemark')).toBe(
      false
    )
    expect(REQUIRED_CONTAINER_FIELDS.has('packageType')).toBe(true)
    expect(REQUIRED_CONTAINER_FIELDS.has('note')).toBe(false)
    expect(REQUIRED_CONTAINER_FIELDS.has('method')).toBe(false)
  })
})
