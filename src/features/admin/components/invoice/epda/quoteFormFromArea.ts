export type QuoteFormVariant = 'HCM' | 'QN'

/** EPDA template follows port area — no manual HCM/QN selection. */
export function quoteFormFromArea(area: string | null | undefined): QuoteFormVariant {
  return area === '2' ? 'QN' : 'HCM'
}

export function quoteFormFromStored(value: string | null | undefined): QuoteFormVariant {
  return (value || '').toUpperCase() === 'QN' ? 'QN' : 'HCM'
}
