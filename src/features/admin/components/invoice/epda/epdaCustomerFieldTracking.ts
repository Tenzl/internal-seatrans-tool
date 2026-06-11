import type { BuildInvoiceQuoteDataParams } from '@/features/admin/components/invoice/buildInvoiceQuoteData'
import type { ShippingAgencyAdminInquiry } from '@/features/admin/components/invoice/epda/epdaApiMappers'

/** Fields originally submitted by the customer (portal), tracked for staff edits. */
export const EPDA_CUSTOMER_TRACKED_FIELDS = [
  'toShipowner',
  'mv',
  'dwt',
  'grt',
  'loa',
  'eta',
  'cargoQty',
  'cargoType',
  'cargoName',
  'port',
  'dischargeLoadingLocation',
  'frtTaxType',
  'purposeOfCalling',
] as const

export type EpdaCustomerTrackedField = (typeof EPDA_CUSTOMER_TRACKED_FIELDS)[number]

export type EpdaCustomerBaseline = Record<EpdaCustomerTrackedField, string>

export type EpdaCustomerFieldChange = {
  field: EpdaCustomerTrackedField
  label: string
  previousValue: string
  currentValue: string
}

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

const normalize = (value: string | null | undefined): string =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')

/**
 * Numeric fields (DWT/GRT/LOA/quantity) compare by value, not text, so backend
 * serialization like "12000.00" never falsely differs from a user-typed "12000".
 */
const normalizeNum = (value: string | number | null | undefined): string => {
  const s = normalize(value == null ? '' : String(value))
  if (s === '') return ''
  const n = Number(s)
  return Number.isFinite(n) ? String(n) : s
}

export function shouldTrackCustomerFields(createdSource?: string | null): boolean {
  return createdSource === 'CUSTOMER_PORTAL' || !createdSource
}

export function buildCustomerBaselineFromSnapshot(
  snapshot: Record<string, string>,
): EpdaCustomerBaseline {
  return {
    toShipowner: normalize(snapshot.toShipowner),
    mv: normalize(snapshot.mv),
    dwt: normalizeNum(snapshot.dwt),
    grt: normalizeNum(snapshot.grt),
    loa: normalizeNum(snapshot.loa),
    eta: normalize(snapshot.eta),
    cargoQty: normalizeNum(snapshot.cargoQty),
    cargoType: normalize(snapshot.cargoType),
    cargoName: normalize(snapshot.cargoName),
    port: normalize(snapshot.port),
    dischargeLoadingLocation: normalize(snapshot.dischargeLoadingLocation),
    frtTaxType: normalize(snapshot.frtTaxType),
    purposeOfCalling: normalize(snapshot.purposeOfCalling),
  }
}

export function buildCustomerBaselineFromInquiry(
  inquiry: ShippingAgencyAdminInquiry,
): EpdaCustomerBaseline {
  if (inquiry.customerSubmittedSnapshot) {
    return buildCustomerBaselineFromSnapshot(inquiry.customerSubmittedSnapshot)
  }

  return {
    toShipowner: normalize(inquiry.toName),
    mv: normalize(inquiry.mv),
    dwt: normalizeNum(inquiry.dwt),
    grt: normalizeNum(inquiry.grt),
    loa: normalizeNum(inquiry.loa),
    eta: normalize(inquiry.eta),
    cargoQty: normalizeNum(inquiry.cargoQuantity),
    cargoType: normalize(inquiry.cargoType),
    cargoName: normalize(inquiry.cargoName ?? inquiry.cargoNameOther),
    port: normalize(inquiry.portOfCall),
    dischargeLoadingLocation: normalize(inquiry.dischargeLoadingLocation),
    frtTaxType: normalize(inquiry.frtTaxType),
    purposeOfCalling: normalize(inquiry.purposeOfCalling),
  }
}

export function buildCustomerBaselineFromForm(input: {
  toShipowner: string
  mv: string
  dwt: string
  grt: string
  loa: string
  eta: string
  cargoQty: string
  cargoType: string
  cargoName: string
  port: string
  dischargeLoadingLocation: string
  frtTaxType: string
  purposeOfCalling: string
}): EpdaCustomerBaseline {
  return {
    toShipowner: normalize(input.toShipowner),
    mv: normalize(input.mv),
    dwt: normalizeNum(input.dwt),
    grt: normalizeNum(input.grt),
    loa: normalizeNum(input.loa),
    eta: normalize(input.eta),
    cargoQty: normalizeNum(input.cargoQty),
    cargoType: normalize(input.cargoType),
    cargoName: normalize(input.cargoName),
    port: normalize(input.port),
    dischargeLoadingLocation: normalize(input.dischargeLoadingLocation),
    frtTaxType: normalize(input.frtTaxType),
    purposeOfCalling: normalize(input.purposeOfCalling),
  }
}

export function buildCustomerBaselineFromQuoteInput(
  input: Pick<
    BuildInvoiceQuoteDataParams,
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
  >,
): EpdaCustomerBaseline {
  return buildCustomerBaselineFromForm({
    toShipowner: input.toShipowner,
    mv: input.mv,
    dwt: input.dwt,
    grt: input.grt,
    loa: input.loa,
    eta: input.eta,
    cargoQty: input.cargoQty,
    cargoType: input.cargoType,
    cargoName: input.cargoName,
    port: input.port,
    dischargeLoadingLocation: input.dischargeLoadingLocation,
    frtTaxType: input.frtTaxType,
    purposeOfCalling: input.purposeOfCalling,
  })
}

export function diffCustomerFields(
  baseline: EpdaCustomerBaseline,
  current: EpdaCustomerBaseline,
): EpdaCustomerFieldChange[] {
  return EPDA_CUSTOMER_TRACKED_FIELDS.flatMap((field) => {
    const previousValue = baseline[field]
    const currentValue = current[field]
    if (previousValue === currentValue) return []
    return [
      {
        field,
        label: FIELD_LABELS[field],
        previousValue: previousValue || '—',
        currentValue: currentValue || '—',
      },
    ]
  })
}

export function getModifiedCustomerFieldSet(changes: EpdaCustomerFieldChange[]): Set<EpdaCustomerTrackedField> {
  return new Set(changes.map((change) => change.field))
}

export const EPDA_CUSTOMER_MODIFIED_FIELD_CLASS =
  'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500/25 dark:border-emerald-600 dark:bg-emerald-950/30'

export function getCustomerModifiedFieldClass(
  field: EpdaCustomerTrackedField,
  modifiedFields: Set<EpdaCustomerTrackedField>,
): string {
  return modifiedFields.has(field) ? EPDA_CUSTOMER_MODIFIED_FIELD_CLASS : ''
}

export function mergeEpdaFieldClasses(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}

export function applyCustomerBaselineToForm(
  baseline: EpdaCustomerBaseline,
  setters: {
    setToShipowner: (v: string) => void
    setMv: (v: string) => void
    setDwt: (v: string) => void
    setGrt: (v: string) => void
    setLoa: (v: string) => void
    setEta: (v: string) => void
    setCargoQty: (v: string) => void
    setCargoType: (v: string) => void
    setCargoName: (v: string) => void
    setPort: (v: string) => void
    setDischargeLoadingLocation: (v: string) => void
    setFrtTaxType: (v: string) => void
    setPurposeOfCalling: (v: string) => void
  },
) {
  setters.setToShipowner(baseline.toShipowner)
  setters.setMv(baseline.mv)
  setters.setDwt(baseline.dwt)
  setters.setGrt(baseline.grt)
  setters.setLoa(baseline.loa)
  setters.setEta(baseline.eta)
  setters.setCargoQty(baseline.cargoQty)
  setters.setCargoType(baseline.cargoType)
  setters.setCargoName(baseline.cargoName)
  setters.setPort(baseline.port)
  setters.setDischargeLoadingLocation(baseline.dischargeLoadingLocation)
  setters.setFrtTaxType(baseline.frtTaxType)
  setters.setPurposeOfCalling(baseline.purposeOfCalling)
}

export function mapCustomerChangesForApi(changes: EpdaCustomerFieldChange[]) {
  return changes.map((change) => ({
    field: change.field,
    previousValue: change.previousValue,
    newValue: change.currentValue,
  }))
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

export function formatFieldChangeAction(action: InquiryFieldChangeLogEntry['action']): string {
  return ACTION_LABELS[action] ?? action
}

export function formatFieldChangeLabel(fieldName: string): string {
  const key = fieldName as EpdaCustomerTrackedField
  return FIELD_LABELS[key] ?? fieldName
}
