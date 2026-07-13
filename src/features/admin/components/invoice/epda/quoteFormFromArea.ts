import type { QuoteVariant } from '@/modules/inquiries/components/common/quoteParameters'

export type QuoteFormVariant = QuoteVariant

export interface EpdaVariantConfig {
  area: '1' | '2' | '3'
  quoteForm: QuoteFormVariant
  chargeLayout: 'HCM' | 'QN'
  pilotageMode: 'THREE_LEG' | 'SINGLE_RATE'
  defaultPilotageMiles: number
  reindexRows: boolean
  departmentLabel: string
}

export const EPDA_VARIANT_CONFIG: Record<QuoteFormVariant, EpdaVariantConfig> = {
  HN: {
    area: '1', quoteForm: 'HN', chargeLayout: 'HCM', pilotageMode: 'SINGLE_RATE',
    defaultPilotageMiles: 5, reindexRows: true, departmentLabel: 'SEATRANS - SHIPPING AGENCY',
  },
  QN: {
    area: '2', quoteForm: 'QN', chargeLayout: 'QN', pilotageMode: 'SINGLE_RATE',
    defaultPilotageMiles: 5, reindexRows: false, departmentLabel: 'SEATRANS - AGENCY DEPARTMENT',
  },
  HCM: {
    area: '3', quoteForm: 'HCM', chargeLayout: 'HCM', pilotageMode: 'THREE_LEG',
    defaultPilotageMiles: 47, reindexRows: true, departmentLabel: 'SEATRANS - SHIPPING AGENCY',
  },
}

export function getEpdaVariantConfig(variant: QuoteFormVariant): EpdaVariantConfig {
  return EPDA_VARIANT_CONFIG[variant]
}

/** Area → dedicated EPDA worksheet variant. */
export function quoteFormFromArea(area: string | null | undefined): QuoteFormVariant {
  const key = area == null || area === '' ? '' : String(area).trim()
  return Object.values(EPDA_VARIANT_CONFIG).find((config) => config.area === key)?.quoteForm ?? 'HCM'
}

export function quoteFormFromStored(value: string | null | undefined): QuoteFormVariant {
  const v = (value || '').trim().toUpperCase()
  if (v === 'QN') return 'QN'
  if (v === 'HN') return 'HN'
  return 'HCM'
}

/** HCM + HN share moor/garbage/berth-buoy layout (vs QN). */
export function isHcmWorksheet(variant: QuoteFormVariant): boolean {
  return getEpdaVariantConfig(variant).chargeLayout === 'HCM'
}

/** QN + HN share single-rate pilotage (vs HCM 3-leg). */
export function usesQnPilotage(variant: QuoteFormVariant): boolean {
  return getEpdaVariantConfig(variant).pilotageMode === 'SINGLE_RATE'
}
