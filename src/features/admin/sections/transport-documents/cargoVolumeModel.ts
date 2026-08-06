/** Screenshot / form order for Booking Confirmation cargo volume steppers. */
export const CARGO_VOLUME_TYPES = [
  "45'RF",
  "20'DC",
  "40'DC",
  "20'RF",
  "40'RF",
  "20'FR",
  "40'FR",
  "40'HC",
  "45'HC",
  "40'HQ",
] as const

export type CargoVolumeType = (typeof CARGO_VOLUME_TYPES)[number]

/** Sparse map: only types with quantity > 0. */
export type CargoVolumes = Partial<Record<CargoVolumeType, number>>

const TYPE_SET = new Set<string>(CARGO_VOLUME_TYPES)

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function isCargoVolumeType(value: string): value is CargoVolumeType {
  return TYPE_SET.has(value)
}

/** Drop zeros / unknowns; coerce to non-negative integers. */
export function compactCargoVolumes(
  input: Record<string, unknown> | CargoVolumes | null | undefined
): CargoVolumes {
  if (!input || typeof input !== 'object') return {}
  const next: CargoVolumes = {}
  for (const type of CARGO_VOLUME_TYPES) {
    const raw = input[type]
    const qty =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string' && raw.trim() !== ''
          ? Number(raw)
          : NaN
    if (Number.isFinite(qty) && qty > 0) {
      next[type] = Math.floor(qty)
    }
  }
  return next
}

/** UI grid state: every known type present (zeros allowed). */
export function expandCargoVolumes(
  volumes: CargoVolumes | null | undefined
): Record<CargoVolumeType, number> {
  const compact = compactCargoVolumes(volumes)
  return Object.fromEntries(
    CARGO_VOLUME_TYPES.map((type) => [type, compact[type] ?? 0])
  ) as Record<CargoVolumeType, number>
}

/** PDF / prefill tone: one line per type, e.g. `3 x 20'DC`. */
export function formatCargoVolumes(volumes: CargoVolumes): string {
  return CARGO_VOLUME_TYPES.filter((type) => (volumes[type] ?? 0) > 0)
    .map((type) => `${volumes[type]} x ${type}`)
    .join('\n')
}

/** BL description-column first line suffix (official sample style). */
export const BL_VOLUME_STC_SUFFIX = ' CONTAINER(S) S.T.C'

/**
 * Bill of Lading PDF volume line: compact counts without quotes/spaces,
 * plus STC suffix — e.g. `1x20DC CONTAINER(S) S.T.C`.
 */
export function formatVolumeForBlPdf(volumes: CargoVolumes): string {
  const parts = CARGO_VOLUME_TYPES.filter(
    (type) => (volumes[type] ?? 0) > 0
  ).map((type) => `${volumes[type]}x${type.replace(/'/g, '')}`)
  if (parts.length === 0) return ''
  return `${parts.join(' ')}${BL_VOLUME_STC_SUFFIX}`
}

/**
 * Parse common legacy free-text patterns into a sparse map.
 * Unrecognized text returns {} (caller keeps the original string for PDF).
 */
export function parseCargoVolumeString(raw: string | null | undefined): CargoVolumes {
  const text = (raw ?? '').trim()
  if (!text) return {}

  const found: CargoVolumes = {}
  for (const type of CARGO_VOLUME_TYPES) {
    const pattern = new RegExp(
      `(\\d+)\\s*[xX×]\\s*${escapeRegExp(type)}`,
      'gi'
    )
    let match: RegExpExecArray | null
    let total = 0
    let matched = false
    while ((match = pattern.exec(text)) !== null) {
      matched = true
      total += Number(match[1])
    }
    if (matched && total > 0) {
      found[type] = (found[type] ?? 0) + total
    }
  }
  return compactCargoVolumes(found)
}

/**
 * Resolve structured volumes + display string from a saved booking payload.
 * Prefer cargoVolumes; else try parsing volume; else keep legacy volume as-is.
 */
export function normalizeBookingCargoVolumes(payload: {
  cargoVolumes?: CargoVolumes | Record<string, unknown> | null
  volume?: string | null
}): { cargoVolumes: CargoVolumes; volume: string } {
  const fromStructured = compactCargoVolumes(payload.cargoVolumes)
  if (Object.keys(fromStructured).length > 0) {
    return {
      cargoVolumes: fromStructured,
      volume: formatCargoVolumes(fromStructured),
    }
  }

  const fromLegacy = parseCargoVolumeString(payload.volume)
  if (Object.keys(fromLegacy).length > 0) {
    return {
      cargoVolumes: fromLegacy,
      volume: formatCargoVolumes(fromLegacy),
    }
  }

  return {
    cargoVolumes: {},
    volume: (payload.volume ?? '').trim(),
  }
}
