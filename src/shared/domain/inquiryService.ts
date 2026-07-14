export const INQUIRY_SERVICE_SLUGS = [
  'shipping-agency',
  'chartering',
  'freight-forwarding',
  'total-logistic',
] as const

export type InquiryServiceSlug = (typeof INQUIRY_SERVICE_SLUGS)[number]

const SERVICE_SLUG_ALIASES: Record<string, InquiryServiceSlug> = {
  'shipping-agency': 'shipping-agency',
  'shipping agency': 'shipping-agency',
  chartering: 'chartering',
  'chartering-ship-broking': 'chartering',
  'chartering-broking': 'chartering',
  'freight-forwarding': 'freight-forwarding',
  'freight forwarding': 'freight-forwarding',
  'total-logistic': 'total-logistic',
  'total-logistics': 'total-logistic',
  logistics: 'total-logistic',
}

export function toInquiryServiceSlug(value?: string | null): InquiryServiceSlug | undefined {
  if (!value?.trim()) return undefined
  return SERVICE_SLUG_ALIASES[value.trim().toLowerCase()]
}
