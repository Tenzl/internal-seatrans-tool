export const EPDA_SECTIONS = [
  { id: 'epda-general', label: 'General information' },
  { id: 'epda-dues', label: 'Port dues and charges' },
  { id: 'epda-agency', label: 'Agency fees' },
] as const

/** Optional leading section "00" shown only for customer-originated inquiries. */
export const EPDA_CUSTOMER_SECTION = {
  id: 'epda-customer',
  label: 'Customer information',
} as const

export type EpdaSectionId =
  | (typeof EPDA_SECTIONS)[number]['id']
  | typeof EPDA_CUSTOMER_SECTION.id

/** Display number for the rail/section badge: customer is 00; others are 1-based. */
export function epdaSectionNumber(id: EpdaSectionId): string {
  if (id === EPDA_CUSTOMER_SECTION.id) return '00'
  const index = EPDA_SECTIONS.findIndex((section) => section.id === id)
  return index >= 0 ? String(index + 1).padStart(2, '0') : ''
}

const FIELD_GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'

export function epdaFieldGridClass(_columns?: 3 | 4): string {
  return FIELD_GRID
}
