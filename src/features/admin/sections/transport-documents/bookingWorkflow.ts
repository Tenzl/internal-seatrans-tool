import type {
  BookingFlow,
  BookingWorkflow,
  TransportDocumentRecord,
  TransportDocumentType,
} from './transportDocument.types'

const EDITOR_PATH_BY_TYPE: Record<TransportDocumentType, string> = {
  booking: '/booking/documents/booking-confirmation',
  an: '/booking/documents/arrival-notice',
  bl: '/booking/documents/bill-of-lading',
  do: '/booking/documents/delivery-order',
}

export const BOOKING_WORKFLOW_STEPS: Record<
  BookingFlow,
  readonly TransportDocumentType[]
> = {
  EXPORT: ['booking', 'an', 'bl'],
  IMPORT: ['booking', 'an', 'do'],
}

export function getBookingWorkflowSteps(flow: BookingFlow) {
  return BOOKING_WORKFLOW_STEPS[flow]
}

export function buildCreateBookingUrl(flow: BookingFlow): string {
  return `${EDITOR_PATH_BY_TYPE.booking}?flow=${flow}`
}

export function buildBookingWorkflowUrl(
  flow: BookingFlow,
  bookingId: number,
  type: TransportDocumentType,
  record?: TransportDocumentRecord
): string {
  const params = new URLSearchParams({
    flow,
    bookingId: String(bookingId),
  })
  if (record) params.set('recordId', String(record.id))
  return `${EDITOR_PATH_BY_TYPE[type]}?${params.toString()}`
}

export function getWorkflowRecord(
  workflow: BookingWorkflow | null,
  type: TransportDocumentType
): TransportDocumentRecord | undefined {
  return workflow?.documents[type]
}

export function recordBelongsToBooking(
  record: TransportDocumentRecord,
  bookingId: number
): boolean {
  const recordBookingId =
    record.documentType === 'booking' ? record.id : record.bookingId
  return recordBookingId === bookingId
}
