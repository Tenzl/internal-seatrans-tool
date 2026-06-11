import type { PortOption } from '@/modules/logistics/services/portService'
import type { PartnerOption } from '@/features/admin/services/partnerManagementService'

/** Typeahead: no request until user types; max rows per search */
export const BOOKING_SEARCH = {
  limit: 10,
  minChars: 1,
} as const

/** React Query cache policy for booking shipping screen */
export const BOOKING_SHIPPING_CACHE = {
  /** Shipping record per partner — reuse when re-selecting same partner */
  shippingStaleMs: 30 * 60 * 1000,
  /** Partner/port search results — same query string = no refetch */
  optionsStaleMs: 30 * 60 * 1000,
  /** Port labels resolved by id */
  portLabelsStaleMs: 24 * 60 * 60 * 1000,
  gcMs: 60 * 60 * 1000,
} as const

export function mergePortLabels(
  target: Map<number, string>,
  ports?: PortOption[] | null,
): Map<number, string> {
  ports?.forEach((port) => {
    target.set(port.id, port.name)
  })
  return target
}

export function rememberPartnerOption(
  target: Map<number, PartnerOption>,
  partner: PartnerOption,
): void {
  target.set(partner.id, partner)
}

export function stablePortIdsKey(portIds: number[]): string {
  if (portIds.length === 0) return ''
  return [...portIds].sort((a, b) => a - b).join(',')
}
