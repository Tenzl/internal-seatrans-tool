import type { QuoteData as HcmQuoteData } from '@/modules/inquiries/components/common/Quote-hcm'
import type { QuoteData as QnQuoteData } from '@/modules/inquiries/components/common/Quote-qn'
import type { EpdaParameterValues } from '@/modules/inquiries/components/common/quoteParameters'
import {
  DEFAULT_GARBAGE_CBM_AMOUNT,
  resolveGarbageUsdRate,
} from '@/features/admin/components/invoice/garbageFeeDefaults'
import type { CargoTypeCatalogItem, Commodity } from '@/modules/gallery/services/commodityService'

type InvoiceQuoteData = HcmQuoteData & QnQuoteData

interface QuarantineCargoOptionConfig {
  value: string
  trips: number
}

export interface BuildInvoiceQuoteDataParams {
  quoteForm: 'HCM' | 'QN' | 'HN'
  formCreatedDate: string
  toShipowner: string
  mv: string
  dwt: string
  grt: string
  loa: string
  eta: string
  cargoQty: string
  cargoName: string
  cargoType: string
  cargoTypeOptions: CargoTypeCatalogItem[]
  filteredCargoNames: Commodity[]
  shipType: string
  port: string
  frtTaxType: string
  shouldIncludeOceanFrtRate: boolean
  oceanFrtRateUsdPerMt: string
  garbageUsdRate: string
  garbageCbmAmount: string
  purposeOfCalling: string
  dischargeLoadingLocation: string
  transportLs: string
  boatHireQuarantineAmount: string
  quarantineCargoMode: string
  quarantineCargoOptions: readonly QuarantineCargoOptionConfig[]
  boatHireAmount: string
  agencyFeeMode: string
  agencyDiscountPercent: string
  agencyLumpsumAmount: string
  isTallyFeeEligible: boolean
  tallyFeeAmount: string
  /** LOA is above the highest tug band → tug charge is entered manually. */
  isLoaOverTugMax: boolean
  tugAssistanceAmount: string
  berthHours: string
  buoyDueHours: string
  anchorageHours: string
  qnPilotageMiles: string
  pilotageThirdMiles: string
  /** Resolved EPDA parameter set (area + port override) driving the quote calc. */
  params?: EpdaParameterValues
}

const toNumberOrUndefined = (value: string) => (value ? Number(value) : undefined)

function getCargoTypeLabel(value: string, options: CargoTypeCatalogItem[]): string {
  return options.find((option) => option.code === value)?.displayLabel ?? value
}

export function buildInvoiceQuoteData(params: BuildInvoiceQuoteDataParams): InvoiceQuoteData {
  const selectedCargo = params.filteredCargoNames.find((item) => item.name === params.cargoName)
  const cargoDisplayName = (selectedCargo?.displayName || params.cargoName || '').trim()
  const usesQnPilotageField = params.quoteForm === 'QN' || params.quoteForm === 'HN'

  return {
    to_shipowner: params.toShipowner,
    date: params.formCreatedDate,
    ref: undefined,
    mv: params.mv,
    dwt: params.dwt,
    grt: params.grt,
    loa: params.loa,
    eta: params.eta || 'TBN',
    cargo_qty_mt: params.cargoQty,
    cargo_name_upper: cargoDisplayName.toUpperCase(),
    cargo_type: params.cargoType ? getCargoTypeLabel(params.cargoType, params.cargoTypeOptions) : '',
    ship_type: params.shipType,
    port_upper: params.port.toUpperCase(),
    loading_term: params.frtTaxType,
    ocean_frt_rate_usd_per_mt:
      params.shouldIncludeOceanFrtRate && params.oceanFrtRateUsdPerMt
        ? Number(params.oceanFrtRateUsdPerMt)
        : undefined,
    garbage_usd_rate: resolveGarbageUsdRate(params.quoteForm, params.garbageUsdRate),
    garbage_cbm_amount:
      toNumberOrUndefined(params.garbageCbmAmount) ?? Number(DEFAULT_GARBAGE_CBM_AMOUNT),
    purpose_of_calling: params.purposeOfCalling,
    at_berth: params.dischargeLoadingLocation === 'Berth' ? 'X' : undefined,
    at_anchorage: params.dischargeLoadingLocation === 'Anchorage' ? 'X' : undefined,
    transport_ls: toNumberOrUndefined(params.transportLs),
    transport_quarantine: toNumberOrUndefined(params.boatHireQuarantineAmount),
    quarantine_cargo_trips:
      params.quarantineCargoOptions.find((option) => option.value === params.quarantineCargoMode)?.trips ?? 1,
    boat_hire_entry: toNumberOrUndefined(params.boatHireAmount),
    agency_fee_mode: params.agencyFeeMode,
    agency_discount_percent: toNumberOrUndefined(params.agencyDiscountPercent),
    agency_lumpsum_amount: toNumberOrUndefined(params.agencyLumpsumAmount),
    tally_fee: params.isTallyFeeEligible && params.tallyFeeAmount ? Number(params.tallyFeeAmount) : undefined,
    tug_assistance:
      params.isLoaOverTugMax && params.tugAssistanceAmount ? Number(params.tugAssistanceAmount) : undefined,
    total_a: undefined,
    total_b: undefined,
    grand_total: undefined,
    bank_name: undefined,
    bank_address: undefined,
    beneficiary: undefined,
    usd_account: undefined,
    swift: undefined,
    AA_ROWS: [],
    BB_ROWS: [],
    berth_hours: Number(params.berthHours),
    buoy_due_hours: Number(params.buoyDueHours),
    anchorage_hours: Number(params.anchorageHours),
    pilotage_miles: usesQnPilotageField ? Number(params.qnPilotageMiles || '5') : undefined,
    pilotage_third_miles: params.quoteForm === 'HCM' ? Number(params.pilotageThirdMiles) : undefined,
    params: params.params,
  }
}
