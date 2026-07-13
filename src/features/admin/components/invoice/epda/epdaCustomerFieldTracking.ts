/** Fields originally submitted by the customer (portal), tracked for staff edits. */
export type EpdaCustomerTrackedField =
  | 'toShipowner'
  | 'mv'
  | 'dwt'
  | 'grt'
  | 'loa'
  | 'eta'
  | 'cargoQty'
  | 'cargoType'
  | 'cargoName'
  | 'port'
  | 'dischargeLoadingLocation'
  | 'frtTaxType'
  | 'purposeOfCalling'

const FIELD_LABELS: Record<EpdaCustomerTrackedField, string> = {
  toShipowner: 'To (Ship Owner/Company)',
  mv: 'M/V (Vessel Name)',
  dwt: 'DWT',
  grt: 'GRT',
  loa: 'LOA',
  eta: 'ETA',
  cargoQty: 'Cargo quantity',
  cargoType: 'Cargo type',
  cargoName: 'Cargo name',
  port: 'Port of call',
  dischargeLoadingLocation: 'Discharge / loading location',
  frtTaxType: 'Freight tax type',
  purposeOfCalling: 'Purpose of calling',
}

export function mergeEpdaFieldClasses(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(' ')
}

export type InquiryFieldChangeLogEntry = {
  id: number
  inquiryId: number
  action: 'EPDA_SAVE_DRAFT' | 'EPDA_ISSUE'
  fieldName: string
  previousValue: string | null
  newValue: string | null
  createdAt: string
  changedBy: {
    id: number
    fullName: string | null
    email: string | null
  }
}

const ACTION_LABELS: Record<InquiryFieldChangeLogEntry['action'], string> = {
  EPDA_SAVE_DRAFT: 'Save draft',
  EPDA_ISSUE: 'Issue to customer',
}

export function formatFieldChangeAction(
  action: InquiryFieldChangeLogEntry['action'],
): string {
  return ACTION_LABELS[action] ?? action
}

export function formatFieldChangeLabel(fieldName: string): string {
  const key = fieldName as EpdaCustomerTrackedField
  return FIELD_LABELS[key] ?? fieldName
}
