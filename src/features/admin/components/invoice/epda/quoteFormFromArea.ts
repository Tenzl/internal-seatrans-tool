import type { QuoteVariant } from '@/modules/inquiries/components/common/quoteParameters'

export type QuoteFormVariant = QuoteVariant

/** Area → dedicated EPDA worksheet variant. */
export function quoteFormFromArea(area: string | null | undefined): QuoteFormVariant {
  const key = area == null || area === '' ? '' : String(area).trim()
  if (key === '1') return 'HN'
  if (key === '2') return 'QN'
  return 'HCM'
}

export function quoteFormFromStored(value: string | null | undefined): QuoteFormVariant {
  const v = (value || '').trim().toUpperCase()
  if (v === 'QN') return 'QN'
  if (v === 'HN') return 'HN'
  return 'HCM'
}

/** HCM + HN share moor/garbage/berth-buoy layout (vs QN). */
export function isHcmWorksheet(variant: QuoteFormVariant): boolean {
  return variant === 'HCM' || variant === 'HN'
}

/** QN + HN share single-rate pilotage (vs HCM 3-leg). */
export function usesQnPilotage(variant: QuoteFormVariant): boolean {
  return variant === 'QN' || variant === 'HN'
}
