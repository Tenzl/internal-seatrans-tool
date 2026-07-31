import type {
  CargoRow,
  TransportDocumentPayloadMap,
  TransportDocumentType,
} from './transportDocument.types'

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

export function getTransportDocumentCargoRows(
  type: TransportDocumentType,
  forms: TransportDocumentPayloadMap
): CargoRow[] | null {
  switch (type) {
    case 'an':
      return forms.an.cargoRows
    case 'do':
      return forms.do.cargoRows
    case 'booking':
      return null
  }
}
