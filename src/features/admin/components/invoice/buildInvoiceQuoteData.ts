import type { QuoteData } from '@/modules/inquiries/components/common/quoteCommon'
import type { EpdaParameterValues } from '@/modules/inquiries/components/common/quoteParameters'
import {
  resolveGarbageUsdRate,
} from '@/features/admin/components/invoice/garbageFeeDefaults'
import type { CargoTypeCatalogItem, Commodity } from '@/modules/gallery/services/commodityService'
import { getEpdaVariantConfig } from './epda/quoteFormFromArea'

type InvoiceQuoteData = QuoteData

interface QuarantineCargoOptionConfig {
  value: string
  trips: number
}

export interface BuildInvoiceQuoteDataParams {
  quoteForm: 'HCM' | 'QN' | 'HN'
  formCreatedDate: string
  toShipowner: string
  shipownerNationality: string
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
  /** Canonical backend port identity; display text remains in `port`. */
  portId?: number | null
  port: string
  frtTaxType: string
  shouldIncludeOceanFrtRate: boolean
  oceanFrtRateUsdPerMt: string
  garbageUsdRate: string
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
  /** 1 = in|out; 2 = in & out (×2). */
  tugAssistanceTrips: string
  /** Other expense picker — currently Shorecrane-hire. */
  otherExpenseType: string
  shorecraneHireUsdPerMt: string
  berthHours: string
  buoyDueHours: string
  anchorageHours: string
  qnPilotageMiles: string
  pilotageThirdMiles: string
  /** Resolved EPDA parameter set (area + port override) driving the quote calc. */
  params?: EpdaParameterValues
}

import { parseFiniteNumberOrUndefined } from '@/shared/utils/parseNumber'

function getCargoTypeLabel(value: string, options: CargoTypeCatalogItem[]): string {
  return options.find((option) => option.code === value)?.displayLabel ?? value
}

export function buildInvoiceQuoteData(params: BuildInvoiceQuoteDataParams): InvoiceQuoteData {
  const selectedCargo = params.filteredCargoNames.find((item) => item.name === params.cargoName)
  const cargoDisplayName = (selectedCargo?.displayName || params.cargoName || '').trim()
  const variantConfig = getEpdaVariantConfig(params.quoteForm)
  const usesQnPilotageField = variantConfig.pilotageMode === 'SINGLE_RATE'

  return {
    to_shipowner: params.toShipowner,
    shipowner_nationality: params.shipownerNationality,
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
        ? parseFiniteNumberOrUndefined(params.oceanFrtRateUsdPerMt)
        : undefined,
    garbage_usd_rate: resolveGarbageUsdRate(params.quoteForm, params.garbageUsdRate),
    purpose_of_calling: params.purposeOfCalling,
    at_berth: params.dischargeLoadingLocation === 'Berth' ? 'X' : undefined,
    at_anchorage: params.dischargeLoadingLocation === 'Anchorage' ? 'X' : undefined,
    transport_ls: parseFiniteNumberOrUndefined(params.transportLs),
    transport_quarantine: parseFiniteNumberOrUndefined(params.boatHireQuarantineAmount),
    quarantine_cargo_trips:
      params.quarantineCargoOptions.find((option) => option.value === params.quarantineCargoMode)?.trips ?? 1,
    boat_hire_entry: parseFiniteNumberOrUndefined(params.boatHireAmount),
    agency_fee_mode: params.agencyFeeMode,
    agency_discount_percent: parseFiniteNumberOrUndefined(params.agencyDiscountPercent),
    agency_lumpsum_amount: parseFiniteNumberOrUndefined(params.agencyLumpsumAmount),
    tally_fee:
      params.isTallyFeeEligible
        ? parseFiniteNumberOrUndefined(params.tallyFeeAmount)
        : undefined,
    tug_assistance:
      params.isLoaOverTugMax
        ? parseFiniteNumberOrUndefined(params.tugAssistanceAmount)
        : undefined,
    tug_assistance_trips: parseFiniteNumberOrUndefined(params.tugAssistanceTrips) ?? 2,
    shorecrane_hire_usd_per_mt:
      params.otherExpenseType === 'SHORECRANE_HIRE'
        ? parseFiniteNumberOrUndefined(params.shorecraneHireUsdPerMt)
        : undefined,
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
    berth_hours: parseFiniteNumberOrUndefined(params.berthHours),
    buoy_due_hours: parseFiniteNumberOrUndefined(params.buoyDueHours),
    anchorage_hours: parseFiniteNumberOrUndefined(params.anchorageHours),
    pilotage_miles: usesQnPilotageField
      ? parseFiniteNumberOrUndefined(params.qnPilotageMiles) ?? variantConfig.defaultPilotageMiles
      : undefined,
    pilotage_third_miles: params.quoteForm === 'HCM' ? parseFiniteNumberOrUndefined(params.pilotageThirdMiles) : undefined,
    params: params.params,
  }
}
