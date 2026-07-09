import type { FormVariant } from './CreateInvoiceVariantForm'

export const DEFAULT_GARBAGE_CBM_AMOUNT = '1'
export const DEFAULT_GARBAGE_USD_QN = '17'
export const DEFAULT_GARBAGE_USD_HCM = '54'

export function getDefaultGarbageUsdRate(variant: FormVariant | 'HCM' | 'QN' | 'HN'): string {
  return variant === 'QN' ? DEFAULT_GARBAGE_USD_QN : DEFAULT_GARBAGE_USD_HCM
}

export function resolveGarbageUsdRate(
  variant: FormVariant | 'HCM' | 'QN' | 'HN',
  value: string | number | null | undefined,
): number {
  const parsed = value === null || value === undefined || String(value).trim() === '' ? NaN : Number(value)
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return Number(getDefaultGarbageUsdRate(variant))
}

