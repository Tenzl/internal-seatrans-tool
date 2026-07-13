import type { CargoTypeCatalogItem, Commodity } from '@/modules/gallery/services/commodityService'

export const CARGO_NAME_OTHER = 'OTHER'

/**
 * Shipping-agency cargo types are a FIXED set of three — they never change, so
 * they live in code as an enum rather than the editable cargo-type catalog.
 * Cargo *names* still come from the commodities table, keyed by these codes.
 */
export const SHIPPING_AGENCY_CARGO_TYPES: CargoTypeCatalogItem[] = [
  { code: 'IN_BAG_PACK', displayLabel: 'Bag/Pack', serviceTypeType: 'SHIPPING_AGENCY' },
  { code: 'IN_EQUIPMENT', displayLabel: 'Equipment', serviceTypeType: 'SHIPPING_AGENCY' },
  { code: 'IN_BULK', displayLabel: 'Bulk', serviceTypeType: 'SHIPPING_AGENCY' },
]

export type InquiryCargoFields = {
  cargoType?: string | null
  cargoName?: string | null
  cargoNameOther?: string | null
}

const normalizeKey = (value: string) =>
  value.trim().toUpperCase().replace(/[\s_-]+/g, '_')

export function isTallyFeeEligibleCargoType(cargoType?: string | null): boolean {
  if (!cargoType?.trim()) return false
  const key = normalizeKey(cargoType)
  // Bag/Pack and Equipment incur a tally fee; Bulk does not.
  return key === 'IN_BAG_PACK' || key === 'IN_EQUIPMENT' || key.includes('IN_BAG')
}

export function legacyCargoTypeToCode(stored?: string | null): string {
  if (!stored?.trim()) return ''
  const key = normalizeKey(stored)
  if (key === 'IN_BULK' || key === 'INBULK' || key === 'BULK') return 'IN_BULK'
  if (key === 'IN_EQUIPMENT' || key === 'INEQUIPMENT' || key === 'EQUIPMENT') {
    return 'IN_EQUIPMENT'
  }
  if (
    key === 'IN_BAGS' ||
    key === 'IN_BAG_PACK' ||
    key === 'INBAGS' ||
    key === 'INBAGPACK' ||
    key === 'BAG_PACK' ||
    key === 'BAGPACK'
  ) {
    return 'IN_BAG_PACK'
  }
  return key
}

const LEGACY_CARGO_NAME_ALIASES: Record<string, string[]> = {
  WOOD_PELLETS: ['WOOD_PELLET', 'WOODPELLET'],
  WOOD_CHIPS: ['WOODCHIP', 'WOODCHIPS'],
  TAPIOCA_CHIPS: ['TAPIOCACHIPS'],
  EQUIPMENT: ['IN_EQUIPMENT'],
}

function legacyCargoNameToCode(
  catalog: Commodity[],
  cargoTypeCode: string,
  cargoName?: string | null,
  cargoNameOther?: string | null,
): string {
  const rawLabel = (cargoNameOther?.trim() || cargoName?.trim() || '').trim()
  if (!rawLabel) return ''

  const pool = cargoTypeCode
    ? catalog.filter((item) => (item.cargoType || 'IN_BULK').toUpperCase() === cargoTypeCode)
    : catalog

  const rawKey = normalizeKey(rawLabel)

  for (const item of pool) {
    const nameKey = normalizeKey(item.name)
    if (nameKey === rawKey) return item.name
    const aliases = LEGACY_CARGO_NAME_ALIASES[nameKey] ?? []
    if (aliases.some((alias) => normalizeKey(alias) === rawKey)) return item.name
    if (normalizeKey(item.displayName) === rawKey) return item.name
  }

  return rawLabel
}

/** Map stored inquiry cargo → EPDA form values (canonical pass-through; legacy coercion only). */
export function readInquiryCargoForEpda(
  raw: InquiryCargoFields,
  catalog: Commodity[],
): { cargoType: string; cargoName: string } {
  const catalogTypes = new Set(
    catalog.map((item) => (item.cargoType || 'IN_BULK').toUpperCase()),
  )

  let cargoType = ''
  if (raw.cargoType?.trim()) {
    const key = raw.cargoType.trim().toUpperCase().replace(/\s+/g, '_')
    cargoType = catalogTypes.has(key) ? key : legacyCargoTypeToCode(raw.cargoType)
  }

  if (normalizeKey(raw.cargoName ?? '') === CARGO_NAME_OTHER) {
    const other = raw.cargoNameOther?.trim()
    return { cargoType, cargoName: other || CARGO_NAME_OTHER }
  }

  const name = raw.cargoName?.trim()
  if (!name) return { cargoType, cargoName: '' }

  const inCatalog = catalog.some(
    (item) =>
      item.name === name &&
      (!cargoType || (item.cargoType || 'IN_BULK').toUpperCase() === cargoType),
  )
  const cargoName = inCatalog ? name : legacyCargoNameToCode(catalog, cargoType, name, raw.cargoNameOther)

  return { cargoType, cargoName }
}
