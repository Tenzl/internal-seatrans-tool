import type { EpdaParameterValues } from '@/modules/inquiries/components/common/quoteParameters'

export type EpdaAreaCode = '1' | '2' | '3'
export type EpdaQuoteForm = 'HCM' | 'HN' | 'QN'

export interface EpdaPortIdentity {
  areaCode: EpdaAreaCode | ''
  portId: number | null
  portOfCall: string
  quoteForm: EpdaQuoteForm
}

export interface EpdaFormFields {
  formCreatedDate: string
  toShipowner: string
  shipownerNationality: string
  mv: string
  dwt: string
  grt: string
  loa: string
  eta: string
  cargoQty: string
  cargoType: string
  cargoName: string
  shipType: string
  frtTaxType: string
  oceanFrtRateUsdPerMt: string
  garbageUsdRate: string
  garbageCbmAmount: string
  purposeOfCalling: string
  dischargeLoadingLocation: string
  transportLs: string
  boatHireQuarantineAmount: string
  quarantineCargoMode: string
  boatHireAmount: string
  agencyFeeMode: string
  agencyDiscountPercent: string
  agencyLumpsumAmount: string
  tallyFeeAmount: string
  tugAssistanceAmount: string
  otherExpenseType: string
  shorecraneHireUsdPerMt: string
  berthHours: string
  anchorageHours: string
  qnPilotageMiles: string
  pilotageThirdMiles: string
}

export type EpdaFormField = keyof EpdaFormFields

export type TariffStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface EpdaTariffState {
  status: TariffStatus
  requestId: number
  values: EpdaParameterValues | null
  error: string | null
}

export interface EpdaCreateState {
  identity: EpdaPortIdentity
  fields: EpdaFormFields
  dirtyFields: Partial<Record<EpdaFormField, true>>
  tariff: EpdaTariffState
}

export const TARIFF_SEEDED_FIELDS = [
  'berthHours',
  'anchorageHours',
  'pilotageThirdMiles',
  'qnPilotageMiles',
  'garbageUsdRate',
  'garbageCbmAmount',
] as const satisfies readonly EpdaFormField[]

export type TariffSeededField = (typeof TARIFF_SEEDED_FIELDS)[number]
