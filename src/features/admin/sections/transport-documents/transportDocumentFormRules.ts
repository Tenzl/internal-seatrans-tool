import type {
  AnContainer,
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

/** Legacy cargo table rows. AN/BL/DO all use containers now. */
export function getTransportDocumentCargoRows(
  type: TransportDocumentType,
  forms: TransportDocumentPayloadMap
): CargoRow[] | null {
  switch (type) {
    case 'an':
    case 'booking':
    case 'bl':
    case 'do':
      return null
  }
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
