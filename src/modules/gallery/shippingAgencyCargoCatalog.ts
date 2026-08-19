import type { Commodity } from '@/modules/gallery/services/commodityService'

export const CARGO_NAME_OTHER = 'OTHER'

export type EpdaCargoTypeOption = {
  id: number | null
  value: string
  label: string
  nameSnapshot: string
  /** Read-only compatibility key for an unmatched legacy snapshot. */
  legacyCode?: string
}

export type InquiryCargoFields = {
  commodityTypeId?: number | null
  cargoType?: string | null
  cargoName?: string | null
  cargoNameOther?: string | null
}

const normalizeKey = (value?: string | null) =>
  (value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')

export function isTallyFeeEligibleCargoType(
  cargoType?: string | null
): boolean {
  if (!cargoType?.trim()) return false
  const key = normalizeKey(cargoType)
  // Bag/Pack and Equipment incur a tally fee; Bulk does not.
  return (
    key === 'BAG_PACK' ||
    key === 'EQUIPMENT' ||
    key === 'IN_BAG_PACK' ||
    key === 'IN_EQUIPMENT' ||
    key.includes('IN_BAG')
  )
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
  cargoName?: string | null,
  cargoNameOther?: string | null
): string {
  const rawLabel = (cargoNameOther?.trim() || cargoName?.trim() || '').trim()
  if (!rawLabel) return ''

  const rawKey = normalizeKey(rawLabel)

  for (const item of catalog) {
    const nameKey = normalizeKey(item.name)
    if (nameKey === rawKey) return item.name
    const aliases = LEGACY_CARGO_NAME_ALIASES[nameKey] ?? []
    if (aliases.some((alias) => normalizeKey(alias) === rawKey))
      return item.name
    if (normalizeKey(item.displayName) === rawKey) return item.name
  }

  return rawLabel
}

/** Map stored inquiry cargo → EPDA form values (canonical pass-through; legacy coercion only). */
export function readInquiryCargoForEpda(
  raw: InquiryCargoFields,
  catalog: Commodity[]
): { commodityTypeId: number | null; cargoType: string; cargoName: string } {
  const commodityTypeId =
    typeof raw.commodityTypeId === 'number' && raw.commodityTypeId > 0
      ? raw.commodityTypeId
      : null
  const cargoType = raw.cargoType?.trim() ?? ''

  if (normalizeKey(raw.cargoName ?? '') === CARGO_NAME_OTHER) {
    const other = raw.cargoNameOther?.trim()
    return { commodityTypeId, cargoType, cargoName: other || CARGO_NAME_OTHER }
  }

  const name = raw.cargoName?.trim()
  if (!name) return { commodityTypeId, cargoType, cargoName: '' }

  const inCatalog = catalog.some(
    (item) => item.name === name || item.displayName === name
  )
  const cargoName = inCatalog
    ? name
    : legacyCargoNameToCode(catalog, name, raw.cargoNameOther)

  return { commodityTypeId, cargoType, cargoName }
}
