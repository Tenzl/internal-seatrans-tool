/**
 * Single source of truth for the parameters that drive the EPDA create form.
 * Both the editor workflow (EpdaEditorScreen / CreateInvoiceVariantForm) and the EPDA
 * Parameter overview screen import from here so the screen always reflects what
 * the form actually uses.
 */
import {
  defaultParameterValues,
  resolveGrtTier,
  type GrtTier,
} from '@/modules/inquiries/components/common/quoteParameters'
import {
  PORT_AREA_OPTIONS,
  getPortAreaLabel,
  getPortAreaShortLabel,
  type PortAreaCode,
} from '@/shared/domain/portArea'

export { QUARANTINE_CARGO_OPTIONS } from '@/modules/inquiries/constants/epdaOptions'

export type { GrtTier }
export { defaultParameterValues }

/** Port areas. The EPDA template variant follows the area (no manual HCM/QN pick). */
export const AREA_OPTIONS = PORT_AREA_OPTIONS
export type AreaOption = PortAreaCode

export function getAreaShortLabel(value: AreaOption): string {
  return getPortAreaShortLabel(value)
}

export function getAreaLabel(value: AreaOption): string {
  return getPortAreaLabel(value)
}

/** Area → dedicated worksheet variant (see quoteFormFromArea). */
export const AREA_TO_VARIANT: Record<AreaOption, 'HCM' | 'QN' | 'HN'> = {
  '1': 'HN',
  '2': 'QN',
  '3': 'HCM',
}

export const SHIP_TYPE_OPTIONS = [
  { value: 'BULK_SHIP', label: 'Bulk-ship' },
  { value: 'TANKER_SHIP', label: 'Tanker ship' },
] as const

/** Shipowner nationality — Vietnamese shipowners pay +8% VAT on selected tariff fees. */
export const SHIPOWNER_NATIONALITY_OPTIONS = [
  { value: 'OVERSEAS', label: 'OVERSEAS SHIPOWNER' },
  { value: 'VIETNAMESE', label: 'VIETNAMESE SHIPOWNER' },
] as const
export type ShipownerNationalityOption =
  (typeof SHIPOWNER_NATIONALITY_OPTIONS)[number]['value']

export const DEFAULT_SHIPOWNER_NATIONALITY: ShipownerNationalityOption =
  'OVERSEAS'

/** Optional AA “other expenses” selectable in EPDA section 2 (Port dues). */
export const OTHER_EXPENSE_OPTIONS = [
  { value: 'SHORECRANE_HIRE', label: 'Shorecrane-hire' },
] as const
export type OtherExpenseOption = (typeof OTHER_EXPENSE_OPTIONS)[number]['value']

export const FRT_TAX_TYPE_OPTIONS = [
  { value: 'Import', label: 'Import - No freight tax' },
  { value: 'Export - Pls Advise', label: 'Export - Pls Advise' },
  {
    value: 'Export - Freight rate declaration',
    label: 'Export - Freight rate declaration',
  },
] as const

export const AGENCY_FEE_MODE_OPTIONS = [
  { value: 'TARRIF_AGENCY', label: 'TARRIF AGENCY' },
  { value: 'AGENCY_IN_LUMPSUM', label: 'AGENCY IN LUMPSUM' },
] as const

/** Tug assistance: 1 trip (in|out) or 2 trips (in & out). Default 2 keeps legacy ×2 behaviour. */
export const TUG_ASSISTANCE_TRIP_OPTIONS = [
  { value: '1', trips: 1 },
  { value: '2', trips: 2 },
] as const
export type TugAssistanceTripsOption =
  (typeof TUG_ASSISTANCE_TRIP_OPTIONS)[number]['value']
export const DEFAULT_TUG_ASSISTANCE_TRIPS: TugAssistanceTripsOption = '2'

/** Default port-stay hours used to seed the form. */
export const DEFAULT_BERTH_HOURS = '96'
export const DEFAULT_ANCHORAGE_HOURS = '24'
export const DEFAULT_PILOTAGE_THIRD_MILES = '47' // HCM buoy position (total miles); leg 3 = 47 − 30
export const DEFAULT_QN_PILOTAGE_MILES = '5' // QN template

/** Tariff agency fee tiers by GRT (USD). `maxGrt: null` = no upper bound. */
export const AGENCY_FEE_BY_GRT: GrtTier[] =
  defaultParameterValues('HCM').agencyFeeTiers

/** Resolve the agency fee for a GRT against a tier list (defaults to the built-in tiers). */
export function getAgencyFeeByGrt(
  grt: number,
  tiers?: GrtTier[]
): { amount: number; label: string } {
  const list = tiers && tiers.length ? tiers : AGENCY_FEE_BY_GRT
  return (
    resolveGrtTier(grt, list) ?? {
      amount: list[list.length - 1].amount,
      label: list[list.length - 1].label,
    }
  )
}
