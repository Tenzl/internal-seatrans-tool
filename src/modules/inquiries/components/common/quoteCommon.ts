import { legacyCargoTypeToCode } from '@/modules/gallery/shippingAgencyCargoCatalog'
import { parseFiniteNumber } from '@/shared/utils/parseNumber'
import type { EpdaParameterValues } from './quoteParameters'

export interface QuoteRow {
  no?: string | number
  item?: string
  details?: string
  add?: string
  remark?: string
  amount?: string | number
  mergeItemDetails?: boolean
}

export interface QuoteData {
  to_shipowner?: string
  shipowner_nationality?: string
  date?: string
  ref?: string
  mv?: string
  dwt?: string
  grt?: string
  loa?: string
  eta?: string
  cargo_qty_mt?: string
  cargo_name_upper?: string
  cargo_type?: string
  ship_type?: string
  purpose_of_calling?: string
  port_upper?: string
  loading_term?: string
  ocean_frt_rate_usd_per_mt?: string | number
  garbage_usd_rate?: string | number
  at_anchorage?: string
  at_berth?: string
  total_a?: string
  total_b?: string
  grand_total?: string
  bank_name?: string
  bank_address?: string
  beneficiary?: string
  usd_account?: string
  swift?: string
  berth_hours?: string | number
  buoy_due_hours?: string | number
  anchorage_hours?: string | number
  transport_quarantine?: string | number
  quarantine_cargo_trips?: string | number
  transport_ls?: string | number
  boat_hire_entry?: string | number
  agency_fee_mode?: string
  agency_discount_percent?: string | number
  agency_lumpsum_amount?: string | number
  tally_fee?: string | number
  tug_assistance?: string | number
  /** 1 = single trip (in|out); 2 = in & out (×2). Default treated as 2. */
  tug_assistance_trips?: string | number
  shorecrane_hire_usd_per_mt?: string | number
  pilotage_miles?: string | number
  pilotage_third_miles?: string | number
  params?: EpdaParameterValues
  AA_ROWS?: QuoteRow[]
  BB_ROWS?: QuoteRow[]
}

export const escapeHtml = (value: unknown) => {
  const raw = value === undefined || value === null || value === '' ? '' : String(value)
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const toNumber = parseFiniteNumber

export const formatAmount = (value: unknown) => {
  const num = toNumber(value)
  if (num === null) return escapeHtml(value)
  const rounded = Math.ceil(num * 100) / 100
  return rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export const formatCbm = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export const formatLoaDisplay = (value: unknown) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/[a-zA-Z]$/.test(raw)) return raw.toUpperCase()
  return `${raw}M`
}

const hasText = (value: unknown) => {
  if (value === undefined || value === null) return false
  return String(value).trim() !== ''
}

export const shouldIncludeFeeRow = (row: QuoteRow) => {
  const amountNumeric = toNumber(row.amount)
  return amountNumeric === null || amountNumeric > 0
}

export const isMeaningfulQuoteRow = (row: QuoteRow) =>
  [row.item, row.details, row.add, row.remark, row.amount].some(hasText)

export const normalizeCustomRows = (rows: QuoteRow[], reindex = false) => {
  const visible = rows
    .filter(isMeaningfulQuoteRow)
    .filter(shouldIncludeFeeRow)
  return reindex ? visible.map((row, index) => ({ ...row, no: index + 1 })) : visible
}

export const reindexNumberedRows = (rows: QuoteRow[]) => {
  let currentNo = 1
  return rows.map((row) => row.no === '' ? row : { ...row, no: currentNo++ })
}

const normalizeCode = (value: unknown) =>
  String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_')

export const normalizePurpose = normalizeCode
export const normalizeFrtTaxType = normalizeCode
export const normalizeAgencyFeeMode = normalizeCode
export const normalizeCargoType = normalizeCode

export const isExportPlsAdviseMode = (frtTaxType?: string) =>
  normalizeFrtTaxType(frtTaxType) === 'EXPORT_PLS_ADVISE'

export const isExportTotalAmountMode = (frtTaxType?: string) => {
  const normalized = normalizeFrtTaxType(frtTaxType)
  return normalized === 'EXPORT' || normalized === 'EXPORT_FREIGHT_RATE_DECLARATION'
}

export const shouldShowOceanFrtTax = (purposeOfCalling?: string, frtTaxType?: string) => {
  if (normalizeFrtTaxType(frtTaxType) === 'IMPORT') return false
  const purpose = normalizePurpose(purposeOfCalling)
  return purpose === 'NHAP_XUAT' || purpose === 'CHUYEN_CANG_XUAT' ||
    isExportTotalAmountMode(frtTaxType) || isExportPlsAdviseMode(frtTaxType)
}

export const isTallyFeeEligibleCargo = (cargoType?: string) => {
  const code = legacyCargoTypeToCode(cargoType)
  return code === 'IN_BAG_PACK' || code === 'IN_EQUIPMENT'
}

export const isTankerShip = (value?: string) => normalizeCode(value) === 'TANKER_SHIP'

export const getShipQuarantineTrips = (purposeOfCalling?: string) => {
  const purpose = normalizePurpose(purposeOfCalling)
  if (purpose === 'NHAP_XUAT') return 2
  if (purpose === 'NHAP_CHUYEN_CANG' || purpose === 'CHUYEN_CANG_XUAT') return 1
  return 0
}

export function resolveQuoteTotals(
  totalA: unknown,
  totalB: unknown,
  grandTotal?: string,
) {
  const totalANum = toNumber(totalA)
  const totalBNum = toNumber(totalB)
  const grandNumeric = totalANum !== null && totalBNum !== null
    ? totalANum + totalBNum
    : totalANum ?? totalBNum
  return {
    totalA: escapeHtml(totalA),
    totalB: escapeHtml(totalB),
    grandTotal: grandTotal || (grandNumeric ? formatAmount(grandNumeric) : undefined),
  }
}

export function applyQuoteReplacements(
  template: string,
  replacements: Record<string, string>,
) {
  return template.replace(/{{\s*([A-Za-z0-9_]+)\s*}}/g, (_match, key: string) =>
    replacements[key] === undefined ? '—' : replacements[key],
  )
}
