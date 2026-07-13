import type { BuildInvoiceQuoteDataParams } from '@/features/admin/components/invoice/buildInvoiceQuoteData'
import {
  DEFAULT_GARBAGE_CBM_AMOUNT,
  getDefaultGarbageUsdRate,
  resolveGarbageUsdRate,
} from '@/features/admin/components/invoice/garbageFeeDefaults'
import { quoteFormFromStored, usesQnPilotage } from '@/features/admin/components/invoice/epda/quoteFormFromArea'
import { parseFiniteNumber, parseFiniteNumberOrUndefined } from '@/shared/utils/parseNumber'

/** Admin inquiry row from GET /admin/inquiries/shipping-agency/:id */
export type ShippingAgencyAdminInquiry = {
  id: number
  userId?: number
  fullName?: string | null
  email?: string | null
  phone?: string | null
  company?: string | null
  notes?: string | null
  status?: string
  submittedAt?: string
  createdSource?: string | null
  toName?: string | null
  mv?: string | null
  eta?: string | null
  dwt?: string | number | null
  grt?: string | number | null
  loa?: string | number | null
  cargoType?: string | null
  cargoName?: string | null
  cargoNameOther?: string | null
  cargoQuantity?: string | number | null
  portId?: number | null
  portOfCall?: string | null
  dischargeLoadingLocation?: string | null
  frtTaxType?: string | null
  purposeOfCalling?: string | null
  boatHireAmount?: string | number | null
  tallyFeeAmount?: string | number | null
  tugAssistanceAmount?: string | number | null
  shorecraneHireUsdPerMt?: string | number | null
  transportLs?: string | null
  transportQuarantine?: string | null
  quoteForm?: string | null
  berthHours?: string | number | null
  anchorageHours?: string | number | null
  pilotage3rdMiles?: string | number | null
  epdaDocumentDate?: string | null
  shipType?: string | null
  shipownerNationality?: string | null
  oceanFrtRateUsdPerMt?: string | number | null
  garbageCbmAmount?: string | number | null
  garbageUsdRate?: string | number | null
  quarantineCargoMode?: string | null
  agencyFeeMode?: string | null
  agencyDiscountPercent?: string | number | null
  agencyLumpsumAmount?: string | number | null
  epdaSnapshot?: Record<string, unknown> | null
  /** ISO timestamp — when set, EPDA edits are locked and quote uses snapshot params. */
  epdaLockedAt?: string | null
  customerSubmittedSnapshot?: Record<string, string> | null
}

export type EpdaApiPayload = Record<string, unknown>

const toNum = (value: string | number | null | undefined): number | undefined =>
  parseFiniteNumberOrUndefined(value)

const toStr = (value: string | number | null | undefined): string | undefined => {
  if (value === null || value === undefined) return undefined
  const s = String(value).trim()
  return s.length > 0 ? s : undefined
}

/**
 * Numeric value as a clean form string: integers stay integer, decimals keep only
 * meaningful digits. Backend numeric columns serialize as "12000.00" — we strip the
 * trailing ".00" so the form shows "12000" (and only shows decimals the user actually
 * entered, e.g. "130.5"). Non-numeric input falls back to toStr.
 */
const toNumStr = (value: string | number | null | undefined): string | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  const n = parseFiniteNumber(value)
  if (n === null) return toStr(value)
  return String(n)
}

export function mapAgencyFeeModeToApi(mode: string): string {
  if (mode === 'AGENCY_IN_LUMPSUM') return 'LUMPSUM'
  return mode
}

export function mapAgencyFeeModeFromApi(mode?: string | null): string {
  if (!mode) return 'TARRIF_AGENCY'
  if (mode === 'LUMPSUM') return 'AGENCY_IN_LUMPSUM'
  return mode
}

export function mapQuarantineModeToApi(mode: string): string {
  if (mode === 'BOTH_LEGS') return 'TWO_LEG'
  if (mode === 'OTHER') return 'THREE_LEG'
  return mode
}

export function mapQuarantineModeFromApi(mode?: string | null): string {
  if (!mode) return 'ONE_LEG'
  if (mode === 'TWO_LEG') return 'BOTH_LEGS'
  if (mode === 'THREE_LEG') return 'OTHER'
  return mode
}

export function buildEpdaPatchPayload(
  params: BuildInvoiceQuoteDataParams & {
    boatHireQuarantineAmount: string
    transportQuarantine?: string
  },
): EpdaApiPayload {
  const payload: EpdaApiPayload = {
    shipownerTo: params.toShipowner,
    vesselName: params.mv,
    dwt: toNum(params.dwt),
    grt: toNum(params.grt),
    loa: toNum(params.loa),
    eta: params.eta || undefined,
    cargoType: params.cargoType || undefined,
    cargoName: params.cargoName || undefined,
    quantityTons: toNum(params.cargoQty),
    frtTaxType: params.frtTaxType || undefined,
    purposeOfCalling: params.purposeOfCalling || undefined,
    portOfCall: params.port,
    dischargeLoadingLocation: params.dischargeLoadingLocation,
    quoteForm: params.quoteForm,
    berthHours: toNum(params.berthHours),
    anchorageHours: toNum(params.anchorageHours),
    pilotage3rdMiles: usesQnPilotage(params.quoteForm)
        ? toNum(params.qnPilotageMiles)
        : toNum(params.pilotageThirdMiles),
    epdaDocumentDate: params.formCreatedDate,
    shipType: params.shipType,
    shipownerNationality: params.shipownerNationality,
    oceanFrtRateUsdPerMt: toNum(params.oceanFrtRateUsdPerMt),
    garbageCbmAmount: toNum(params.garbageCbmAmount) ?? Number(DEFAULT_GARBAGE_CBM_AMOUNT),
    garbageUsdRate:
      toNum(params.garbageUsdRate) ??
      resolveGarbageUsdRate(params.quoteForm, params.garbageUsdRate),
    quarantineCargoMode: mapQuarantineModeToApi(params.quarantineCargoMode),
    agencyFeeMode: mapAgencyFeeModeToApi(params.agencyFeeMode),
    agencyDiscountPercent: toNum(params.agencyDiscountPercent),
    agencyLumpsumAmount: toNum(params.agencyLumpsumAmount),
    boatHireAmount: toNum(params.boatHireAmount),
    tallyFeeAmount: toNum(params.tallyFeeAmount),
    tugAssistanceAmount: params.isLoaOverTugMax ? toNum(params.tugAssistanceAmount) : undefined,
    shorecraneHireUsdPerMt:
      params.otherExpenseType === 'SHORECRANE_HIRE'
        ? (toNum(params.shorecraneHireUsdPerMt) ?? null)
        : null,
    transportLs: params.transportLs || undefined,
    transportQuarantine:
      params.transportQuarantine ?? params.boatHireQuarantineAmount ?? undefined,
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined && v !== ''),
  )
}

export function buildInternalCreatePayload(
  customerUserId: number,
  params: BuildInvoiceQuoteDataParams & {
    boatHireQuarantineAmount: string
  },
  notes?: string,
): EpdaApiPayload {
  return {
    customerUserId,
    notes,
    shipownerTo: params.toShipowner,
    vesselName: params.mv,
    dwt: toNum(params.dwt),
    grt: toNum(params.grt),
    loa: toNum(params.loa),
    eta: params.eta || undefined,
    cargoType: params.cargoType || undefined,
    cargoName: params.cargoName || undefined,
    frtTaxType: params.frtTaxType || undefined,
    purposeOfCalling: params.purposeOfCalling || undefined,
    portOfCall: params.port,
    dischargeLoadingLocation: params.dischargeLoadingLocation,
    quoteForm: params.quoteForm,
    epdaDocumentDate: params.formCreatedDate,
    shipType: params.shipType,
    shipownerNationality: params.shipownerNationality,
    berthHours: toNum(params.berthHours) ?? 96,
    anchorageHours: toNum(params.anchorageHours) ?? 24,
    pilotage3rdMiles: usesQnPilotage(params.quoteForm)
        ? toNum(params.qnPilotageMiles) ?? 5
        : toNum(params.pilotageThirdMiles) ?? 17,
    oceanFrtRateUsdPerMt: toNum(params.oceanFrtRateUsdPerMt),
    garbageCbmAmount: toNum(params.garbageCbmAmount) ?? Number(DEFAULT_GARBAGE_CBM_AMOUNT),
    garbageUsdRate:
      toNum(params.garbageUsdRate) ??
      resolveGarbageUsdRate(params.quoteForm, params.garbageUsdRate),
    quarantineCargoMode: mapQuarantineModeToApi(params.quarantineCargoMode),
    agencyFeeMode: mapAgencyFeeModeToApi(params.agencyFeeMode),
    agencyDiscountPercent: toNum(params.agencyDiscountPercent),
    agencyLumpsumAmount: toNum(params.agencyLumpsumAmount),
    tugAssistanceAmount: params.isLoaOverTugMax ? toNum(params.tugAssistanceAmount) : undefined,
    shorecraneHireUsdPerMt:
      params.otherExpenseType === 'SHORECRANE_HIRE' ? toNum(params.shorecraneHireUsdPerMt) : undefined,
  }
}

export function applyAdminInquiryToForm(
  inquiry: ShippingAgencyAdminInquiry,
  setters: {
    setFormCreatedDate: (v: string) => void
    setToShipowner: (v: string) => void
    setMv: (v: string) => void
    setDwt: (v: string) => void
    setGrt: (v: string) => void
    setLoa: (v: string) => void
    setEta: (v: string) => void
    setCargoQty: (v: string) => void
    setFrtTaxType: (v: string) => void
    setPort: (v: string) => void
    setDischargeLoadingLocation: (v: string) => void
    setPurposeOfCalling: (v: string) => void
    setBerthHours: (v: string) => void
    setAnchorageHours: (v: string) => void
    setPilotageThirdMiles: (v: string) => void
    setQnPilotageMiles: (v: string) => void
    setShipType: (v: string) => void
    setShipownerNationality: (v: string) => void
    setOceanFrtRateUsdPerMt: (v: string) => void
    setGarbageUsdRate: (v: string) => void
    setGarbageCbmAmount: (v: string) => void
    setQuarantineCargoMode: (v: string) => void
    setAgencyFeeMode: (v: string) => void
    setAgencyDiscountPercent: (v: string) => void
    setAgencyLumpsumAmount: (v: string) => void
    setBoatHireAmount: (v: string) => void
    setBoatHireQuarantineAmount: (v: string) => void
    setTallyFeeAmount: (v: string) => void
    setTugAssistanceAmount: (v: string) => void
    setOtherExpenseType: (v: string) => void
    setShorecraneHireUsdPerMt: (v: string) => void
    setTransportLs: (v: string) => void
  },
) {
  const form = quoteFormFromStored(inquiry.quoteForm)
  // EPDA "DATE" = the day the inquiry was first created (submittedAt), not an
  // editable document date. Fall back to a stored document date, then today.
  setters.setFormCreatedDate(
    toStr(inquiry.submittedAt)?.slice(0, 10) ??
      toStr(inquiry.epdaDocumentDate) ??
      new Date().toISOString().split('T')[0],
  )
  setters.setToShipowner(toStr(inquiry.toName) ?? '')
  setters.setMv(toStr(inquiry.mv) ?? '')
  setters.setDwt(toNumStr(inquiry.dwt) ?? '')
  setters.setGrt(toNumStr(inquiry.grt) ?? '')
  setters.setLoa(toNumStr(inquiry.loa) ?? '')
  setters.setEta(toStr(inquiry.eta) ?? '')
  setters.setCargoQty(toNumStr(inquiry.cargoQuantity) ?? '')
  setters.setFrtTaxType(toStr(inquiry.frtTaxType) ?? '')
  setters.setPort(toStr(inquiry.portOfCall) ?? '')
  setters.setDischargeLoadingLocation(toStr(inquiry.dischargeLoadingLocation) ?? '')
  setters.setPurposeOfCalling(toStr(inquiry.purposeOfCalling) ?? '')
  setters.setBerthHours(toNumStr(inquiry.berthHours) ?? '96')
  setters.setAnchorageHours(toNumStr(inquiry.anchorageHours) ?? '24')
  const pilotage = toNumStr(inquiry.pilotage3rdMiles) ?? (usesQnPilotage(form) ? '5' : '47')
  setters.setPilotageThirdMiles(pilotage)
  setters.setQnPilotageMiles(pilotage)
  setters.setShipType(toStr(inquiry.shipType) ?? 'BULK_SHIP')
  const nationalityFromColumn = toStr(inquiry.shipownerNationality)
  const nationalityFromSnapshot = toStr(
    (inquiry.epdaSnapshot?.shipowner_nationality as string | undefined) ?? null,
  )
  const nationality = (nationalityFromColumn ?? nationalityFromSnapshot ?? 'OVERSEAS').toUpperCase()
  setters.setShipownerNationality(nationality === 'VIETNAMESE' ? 'VIETNAMESE' : 'OVERSEAS')
  setters.setOceanFrtRateUsdPerMt(toNumStr(inquiry.oceanFrtRateUsdPerMt) ?? '')
  setters.setGarbageCbmAmount(toNumStr(inquiry.garbageCbmAmount) ?? DEFAULT_GARBAGE_CBM_AMOUNT)
  setters.setGarbageUsdRate(
    toNumStr(inquiry.garbageUsdRate) ?? getDefaultGarbageUsdRate(form),
  )
  setters.setQuarantineCargoMode(mapQuarantineModeFromApi(inquiry.quarantineCargoMode))
  setters.setAgencyFeeMode(mapAgencyFeeModeFromApi(inquiry.agencyFeeMode))
  setters.setAgencyDiscountPercent(toNumStr(inquiry.agencyDiscountPercent) ?? '')
  setters.setAgencyLumpsumAmount(toNumStr(inquiry.agencyLumpsumAmount) ?? '')
  setters.setBoatHireAmount(toNumStr(inquiry.boatHireAmount) ?? '')
  setters.setBoatHireQuarantineAmount(toNumStr(inquiry.transportQuarantine) ?? '')
  setters.setTallyFeeAmount(toNumStr(inquiry.tallyFeeAmount) ?? '')
  setters.setTugAssistanceAmount(toNumStr(inquiry.tugAssistanceAmount) ?? '')
  const shorecraneRate = toNumStr(inquiry.shorecraneHireUsdPerMt)
  const shorecraneFromSnapshot = toNumStr(
    (inquiry.epdaSnapshot?.shorecrane_hire_usd_per_mt as string | number | undefined) ?? null,
  )
  const resolvedShorecrane = shorecraneRate ?? shorecraneFromSnapshot
  if (resolvedShorecrane) {
    setters.setOtherExpenseType('SHORECRANE_HIRE')
    setters.setShorecraneHireUsdPerMt(resolvedShorecrane)
  } else {
    setters.setOtherExpenseType('')
    setters.setShorecraneHireUsdPerMt('')
  }
  setters.setTransportLs(toStr(inquiry.transportLs) ?? '')
}
