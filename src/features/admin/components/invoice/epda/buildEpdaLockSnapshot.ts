import { buildInvoiceQuoteData } from '@/features/admin/components/invoice/buildInvoiceQuoteData'
import {
  getDefaultGarbageUsdRate,
} from '@/features/admin/components/invoice/garbageFeeDefaults'
import {
  QUARANTINE_CARGO_OPTIONS,
} from '@/features/admin/components/invoice/epdaFormParameters'
import {
  mapAgencyFeeModeFromApi,
  mapQuarantineModeFromApi,
  type ShippingAgencyAdminInquiry,
} from '@/features/admin/components/invoice/epda/epdaApiMappers'
import {
  isHcmWorksheet,
  quoteFormFromStored,
} from '@/features/admin/components/invoice/epda/quoteFormFromArea'
import { isTallyFeeEligibleCargoType, SHIPPING_AGENCY_CARGO_TYPES } from '@/modules/gallery/shippingAgencyCargoCatalog'
import type { Commodity } from '@/modules/gallery/services/commodityService'
import type { EpdaParameterValues } from '@/modules/inquiries/components/common/quoteParameters'
import { parseFiniteNumber } from '@/shared/utils/parseNumber'

function toStr(value: string | number | null | undefined, fallback = ''): string {
  if (value === null || value === undefined) return fallback
  const s = String(value).trim()
  return s.length > 0 ? s : fallback
}

function isExportFreightRateDeclaration(frtTaxType: string): boolean {
  const normalized = frtTaxType.trim().toUpperCase().replace(/[\s-]+/g, '_')
  return normalized === 'EXPORT_FREIGHT_RATE_DECLARATION'
}

function isLoaOverTugMax(loa: string, params: EpdaParameterValues): boolean {
  const loaNum = parseFiniteNumber(loa)
  const activeMinLoas = (params.tugTiers ?? [])
    .filter((tier) => (parseFiniteNumber(tier.amount) ?? 0) > 0)
    .map((tier) => parseFiniteNumber(tier.minLoa))
    .filter((n): n is number => n !== null)
  if (loaNum === null || !activeMinLoas.length) return false
  return loaNum >= Math.max(...activeMinLoas)
}

/**
 * Build the EPDA quote snapshot used by Lock / Issue, from an admin inquiry row
 * plus live (or already-frozen) parameter values.
 */
export function buildEpdaLockSnapshotFromAdminInquiry(
  inquiry: ShippingAgencyAdminInquiry,
  params: EpdaParameterValues,
): Record<string, unknown> {
  const quoteForm = quoteFormFromStored(inquiry.quoteForm)
  const cargoType = toStr(inquiry.cargoType)
  const cargoName = toStr(inquiry.cargoName)
  const frtTaxType = toStr(inquiry.frtTaxType)
  const dischargeLoadingLocation = toStr(inquiry.dischargeLoadingLocation)
  const berthHours = toStr(inquiry.berthHours, '96')
  const loa = toStr(inquiry.loa)
  const nationalityRaw = toStr(inquiry.shipownerNationality, 'OVERSEAS').toUpperCase()
  const shipownerNationality = nationalityRaw === 'VIETNAMESE' ? 'VIETNAMESE' : 'OVERSEAS'
  const overTugMax = isLoaOverTugMax(loa, params)
  const shorecrane = toStr(inquiry.shorecraneHireUsdPerMt)

  return buildInvoiceQuoteData({
    quoteForm,
    formCreatedDate:
      toStr(inquiry.submittedAt)?.slice(0, 10) ||
      toStr(inquiry.epdaDocumentDate) ||
      new Date().toISOString().slice(0, 10),
    toShipowner: toStr(inquiry.toName),
    shipownerNationality,
    mv: toStr(inquiry.mv),
    dwt: toStr(inquiry.dwt),
    grt: toStr(inquiry.grt),
    loa,
    eta: toStr(inquiry.eta),
    cargoQty: toStr(inquiry.cargoQuantity),
    cargoName,
    cargoType,
    cargoTypeOptions: SHIPPING_AGENCY_CARGO_TYPES,
    filteredCargoNames: cargoName
      ? ([
          {
            id: 0,
            name: cargoName,
            displayName: cargoName,
            serviceTypeId: 0,
            requiredImageCount: 0,
            cargoType: cargoType as Commodity['cargoType'],
            isActive: true,
          },
        ] satisfies Commodity[])
      : [],
    shipType: toStr(inquiry.shipType, 'BULK_SHIP'),
    port: toStr(inquiry.portOfCall),
    frtTaxType,
    shouldIncludeOceanFrtRate: isExportFreightRateDeclaration(frtTaxType),
    oceanFrtRateUsdPerMt: toStr(inquiry.oceanFrtRateUsdPerMt),
    garbageUsdRate: toStr(inquiry.garbageUsdRate, String(getDefaultGarbageUsdRate(quoteForm))),
    purposeOfCalling: toStr(inquiry.purposeOfCalling),
    dischargeLoadingLocation,
    transportLs: toStr(inquiry.transportLs),
    boatHireQuarantineAmount: toStr(inquiry.transportQuarantine),
    quarantineCargoMode: mapQuarantineModeFromApi(inquiry.quarantineCargoMode),
    quarantineCargoOptions: QUARANTINE_CARGO_OPTIONS,
    boatHireAmount: toStr(inquiry.boatHireAmount),
    agencyFeeMode: mapAgencyFeeModeFromApi(inquiry.agencyFeeMode),
    agencyDiscountPercent: toStr(inquiry.agencyDiscountPercent),
    agencyLumpsumAmount: toStr(inquiry.agencyLumpsumAmount),
    isTallyFeeEligible: isTallyFeeEligibleCargoType(cargoType),
    tallyFeeAmount: toStr(inquiry.tallyFeeAmount),
    isLoaOverTugMax: overTugMax,
    tugAssistanceAmount: toStr(inquiry.tugAssistanceAmount),
    tugAssistanceTrips: Number(inquiry.tugAssistanceTrips) === 1 ? '1' : '2',
    otherExpenseType: shorecrane ? 'SHORECRANE_HIRE' : '',
    shorecraneHireUsdPerMt: shorecrane,
    berthHours,
    buoyDueHours:
      isHcmWorksheet(quoteForm) && dischargeLoadingLocation === 'Anchorage' ? berthHours : '',
    anchorageHours: toStr(inquiry.anchorageHours, '24'),
    qnPilotageMiles: toStr(inquiry.pilotage3rdMiles, quoteForm === 'QN' || quoteForm === 'HN' ? '5' : '47'),
    pilotageThirdMiles: toStr(inquiry.pilotage3rdMiles, '47'),
    params,
  }) as unknown as Record<string, unknown>
}
