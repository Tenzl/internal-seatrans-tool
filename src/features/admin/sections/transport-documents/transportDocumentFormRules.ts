import type {
  AnContainer,
  BillOfLadingPayload,
  TransportDocumentPayloadMap,
  TransportDocumentType,
} from './transportDocument.types'

export type BillOfLadingFormVariant = BillOfLadingPayload['blFormVariant']

/**
 * Selecting a BL form resets the editable originals field to that form's
 * operational default. The field remains a normal text input afterwards, so
 * staff can still override the generated value.
 */
export function applyBillOfLadingFormVariantChange(
  blFormVariant: BillOfLadingFormVariant
): Pick<BillOfLadingPayload, 'blFormVariant' | 'numberOfOriginals'> {
  return {
    blFormVariant,
    numberOfOriginals:
      blFormVariant === 'surrendered' ? 'ZERO/0' : 'THREE/3',
  }
}

export function getTransportDocumentReference(
  type: TransportDocumentType,
  forms: TransportDocumentPayloadMap
) {
  switch (type) {
    case 'an':
      return forms.an.anNumber
    case 'booking':
      return forms.booking.bookingNumber
    case 'do':
      return forms.do.doNumber
    case 'bl':
      return forms.bl.fblNumber
  }
}

export function buildTransportDocumentFileName(
  type: TransportDocumentType,
  forms: TransportDocumentPayloadMap,
  shortLabel: string
) {
  const safeReference = getTransportDocumentReference(type, forms)
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '-')
  const safeLabel = shortLabel.replace(/[^a-z0-9]+/gi, '-')

  return `${safeLabel}${safeReference ? `-${safeReference}` : ''}.pdf`
}

export function getTransportDocumentContainers(
  type: TransportDocumentType,
  forms: TransportDocumentPayloadMap
): AnContainer[] | null {
  switch (type) {
    case 'an':
      return forms.an.containers
    case 'bl':
      return forms.bl.containers
    case 'do':
      return forms.do.containers
    case 'booking':
      return null
  }
}
