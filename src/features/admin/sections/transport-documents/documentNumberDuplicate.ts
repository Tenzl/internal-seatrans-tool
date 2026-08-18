import type {
  DocumentNumberCheck,
  TransportDocumentType,
} from './transportDocument.types'

const NUMBER_FIELD_BY_TYPE: Record<TransportDocumentType, string> = {
  booking: 'bookingNumber',
  bl: 'fblNumber',
  an: 'anNumber',
  do: 'doNumber',
}

const NUMBER_LABEL_BY_TYPE: Record<TransportDocumentType, string> = {
  booking: 'Booking No.',
  bl: 'HBL/FBL No.',
  an: 'Arrival Notice No.',
  do: 'Delivery Order No.',
}

const DOCUMENT_LABEL_BY_TYPE: Record<TransportDocumentType, string> = {
  booking: 'Booking',
  bl: 'BL',
  an: 'Arrival Notice',
  do: 'Delivery Order',
}

export function getDocumentNumber(
  type: TransportDocumentType,
  payload: Record<string, unknown>
): string {
  return String(payload[NUMBER_FIELD_BY_TYPE[type]] ?? '').trim()
}

export function getDocumentNumberLabel(type: TransportDocumentType): string {
  return NUMBER_LABEL_BY_TYPE[type]
}

export function formatDocumentNumberDuplicateMessage(
  check: DocumentNumberCheck
): string {
  if (
    check.documentType === 'booking' &&
    check.matches.length > 0 &&
    check.matches.every((match) => match.documentType === 'booking')
  ) {
    return `Booking No. ${check.number} already exists.`
  }

  if (check.matches.length === 1) {
    const match = check.matches[0]
    return `Number ${check.number} is already used in 1 ${DOCUMENT_LABEL_BY_TYPE[match.documentType]} with Booking No. ${match.bookingNumber || 'unavailable'}.`
  }

  const details = check.matches
    .map(
      (match) =>
        `${DOCUMENT_LABEL_BY_TYPE[match.documentType]} with Booking No. ${match.bookingNumber || 'unavailable'}`
    )
    .join('; ')
  return `Number ${check.number} is already used in ${check.matches.length} documents: ${details}.`
}
