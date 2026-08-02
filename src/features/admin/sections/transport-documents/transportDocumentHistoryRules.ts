import type {
  CargoRow,
  TransportDocumentActionPermissions,
  TransportDocumentRecord,
  TransportDocumentType,
} from './transportDocument.types'
import {
  getTransportDocumentDefinition,
  TRANSPORT_DOCUMENT_FORM_SECTIONS,
  type TransportDocumentFieldSpec,
} from './transportDocumentFormConfig'

export interface HistoryDocumentField {
  label: string
  value: string
}

export interface HistoryDocumentSection {
  title: string
  fields?: HistoryDocumentField[]
  cargoRows?: CargoRow[]
}

const EDITOR_PATH_BY_TYPE: Record<TransportDocumentType, string> = {
  an: '/booking/documents/arrival-notice',
  booking: '/booking/documents/booking-confirmation',
  do: '/booking/documents/delivery-order',
  bl: '/booking/documents/bill-of-lading',
}

export function buildHistoryDocumentFileName(
  record: TransportDocumentRecord
): string {
  const label = getTransportDocumentDefinition(record.documentType).shortLabel
  const reference = (record.referenceNumber ?? '')
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '-')
  const safeLabel = label.replace(/[^a-z0-9]+/gi, '-')
  return `${safeLabel}${reference ? `-${reference}` : `-${record.id}`}.pdf`
}

export function getHistoryDocumentSections(
  record: TransportDocumentRecord
): HistoryDocumentSection[] {
  const payload = record.payload as unknown as Record<string, unknown>
  const sections: HistoryDocumentSection[] = TRANSPORT_DOCUMENT_FORM_SECTIONS[
    record.documentType
  ].map((section) => ({
    title: section.title,
    fields: section.fields.map((field) => ({
      label: field.label,
      value: toDisplayValue(payload[field.key], field),
    })),
  }))

  if (record.documentType !== 'booking' && record.documentType !== 'bl') {
    const cargoRows = Array.isArray(payload.cargoRows)
      ? (payload.cargoRows as CargoRow[])
      : []
    sections.push({ title: 'Cargo rows', cargoRows })
  }

  return sections
}

export function getTransportDocumentEditorPath(
  documentType: TransportDocumentType
): string {
  return EDITOR_PATH_BY_TYPE[documentType]
}

/** View Details params — COMPLETED opens with auto PDF preview like EPDA. */
export function getTransportDocumentDetailParams(
  record: TransportDocumentRecord
): Record<string, string> {
  const params: Record<string, string> = {
    recordId: String(record.id),
  }
  if (record.status === 'COMPLETED') {
    params.preview = '1'
  }
  return params
}

export function buildTransportDocumentDetailUrl(
  record: TransportDocumentRecord
): string {
  const path = getTransportDocumentEditorPath(record.documentType)
  const params = new URLSearchParams(getTransportDocumentDetailParams(record))
  return `${path}?${params.toString()}`
}

export function getTransportDocumentRowCapabilities(
  record: TransportDocumentRecord,
  permissions: TransportDocumentActionPermissions
) {
  const isLocked = Boolean(record.lockedAt)
  return {
    canViewDetails: true,
    canLock: permissions.canLock && !isLocked,
    canUnlock: permissions.canUnlock && isLocked,
    showLocked: isLocked && !permissions.canUnlock,
    canArchive: permissions.canArchive && !record.deletedAt,
    canDelete: permissions.canHardDelete,
  }
}

function toDisplayValue(
  value: unknown,
  field?: TransportDocumentFieldSpec
): string {
  if (value == null || value === '') return '—'
  const raw = String(value)
  const optionLabel = field?.options?.find((option) => option.value === raw)
    ?.label
  return optionLabel ?? raw
}
