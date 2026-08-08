import {
  createEpdaParameterLabelFns,
  type EpdaParameterLabelFns,
  type EpdaTranslateFn,
} from '@/features/admin/epda-parameters/epdaParameterLabels'
import {
  normalizeParameterValues,
  type CargoAgencyRate,
  type EpdaParameterValues,
  type GrtTier,
  type LoaTier,
} from '@/modules/inquiries/components/common/quoteParameters'
import { messages } from '@/shared/i18n/messages'

export type EpdaParameterDiffRow = {
  path: string
  label: string
  current: string
  latest: string
}

const NESTED_GROUPS = ['hours', 'garbage', 'quarantine', 'coeff'] as const

const GRT_TIER_GROUPS = [
  'agencyFeeTiers',
  'moorUnmoorBerthTiers',
  'moorUnmoorBuoyTiers',
] as const

function englishT(key: string): string {
  return (messages.en as Record<string, string>)[key] ?? key
}

function resolveLabels(
  labelsOrT?: EpdaParameterLabelFns | EpdaTranslateFn
): EpdaParameterLabelFns {
  if (!labelsOrT) return createEpdaParameterLabelFns(englishT)
  if (typeof labelsOrT === 'function') {
    return createEpdaParameterLabelFns(labelsOrT)
  }
  return labelsOrT
}

function formatScalar(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(value)
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return String(value)
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function formatAmount(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : String(value)
  }
  return String(value)
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson)
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortJson(entry)])
  )
}

export function epdaParameterValuesEqual(
  left: EpdaParameterValues,
  right: EpdaParameterValues
): boolean {
  return (
    JSON.stringify(sortJson(normalizeParameterValues(left))) ===
    JSON.stringify(sortJson(normalizeParameterValues(right)))
  )
}

function grtIdentity(tier: GrtTier): string {
  return `${tier.label}|${tier.maxGrt === null ? 'null' : String(tier.maxGrt)}`
}

function loaIdentity(tier: LoaTier): string {
  return `${tier.label}|${String(tier.minLoa)}`
}

type TierPair<T> = {
  pathIndex: number
  current?: T
  latest?: T
}

/**
 * Match rows by identity first, then by index among leftovers.
 * Unmatched sides become added/removed bands.
 */
function pairByIdentityElseIndex<T>(
  current: T[],
  latest: T[],
  identity: (row: T) => string
): TierPair<T>[] {
  const usedLatest = new Set<number>()
  const pairs: TierPair<T>[] = []
  const unmatchedCurrent: number[] = []

  current.forEach((row, ci) => {
    const id = identity(row)
    const li = latest.findIndex(
      (candidate, index) =>
        !usedLatest.has(index) && identity(candidate) === id
    )
    if (li >= 0) {
      usedLatest.add(li)
      pairs.push({ pathIndex: ci, current: row, latest: latest[li] })
    } else {
      unmatchedCurrent.push(ci)
    }
  })

  // Index fallback: pair remaining current rows with unused latest at same index,
  // then by leftover order.
  for (const ci of unmatchedCurrent) {
    if (!usedLatest.has(ci) && ci < latest.length) {
      usedLatest.add(ci)
      pairs.push({ pathIndex: ci, current: current[ci], latest: latest[ci] })
      continue
    }
    const fallback = latest.findIndex((_, index) => !usedLatest.has(index))
    if (fallback >= 0) {
      usedLatest.add(fallback)
      pairs.push({
        pathIndex: ci,
        current: current[ci],
        latest: latest[fallback],
      })
    } else {
      pairs.push({ pathIndex: ci, current: current[ci], latest: undefined })
    }
  }

  latest.forEach((row, li) => {
    if (usedLatest.has(li)) return
    pairs.push({ pathIndex: li, current: undefined, latest: row })
  })

  return pairs
}

function diffGrtTierAmounts(
  group: (typeof GRT_TIER_GROUPS)[number],
  current: GrtTier[],
  latest: GrtTier[],
  labels: EpdaParameterLabelFns,
  rows: EpdaParameterDiffRow[]
) {
  const pairs = pairByIdentityElseIndex(current, latest, grtIdentity)
  for (const pair of pairs) {
    const bandLabel = pair.current?.label ?? pair.latest?.label ?? `#${pair.pathIndex + 1}`
    const leftAmt = pair.current?.amount
    const rightAmt = pair.latest?.amount
    if (leftAmt === rightAmt) continue
    rows.push({
      path: `${group}[${pair.pathIndex}].amount`,
      label: `${labels.sectionLabel(group)} · ${bandLabel}`,
      current: pair.current ? formatAmount(leftAmt) : '—',
      latest: pair.latest ? formatAmount(rightAmt) : '—',
    })
  }
}

function diffLoaTierAmounts(
  current: LoaTier[],
  latest: LoaTier[],
  labels: EpdaParameterLabelFns,
  rows: EpdaParameterDiffRow[]
) {
  const group = 'tugTiers'
  const pairs = pairByIdentityElseIndex(current, latest, loaIdentity)
  for (const pair of pairs) {
    const bandLabel = pair.current?.label ?? pair.latest?.label ?? `#${pair.pathIndex + 1}`
    const leftAmt = pair.current?.amount
    const rightAmt = pair.latest?.amount
    if (leftAmt === rightAmt) continue
    rows.push({
      path: `${group}[${pair.pathIndex}].amount`,
      label: `${labels.sectionLabel(group)} · ${bandLabel}`,
      current: pair.current ? formatAmount(leftAmt) : '—',
      latest: pair.latest ? formatAmount(rightAmt) : '—',
    })
  }
}

function cargoIdentity(row: CargoAgencyRate): string {
  return row.code
}

function diffCargoAgencyRates(
  current: CargoAgencyRate[],
  latest: CargoAgencyRate[],
  labels: EpdaParameterLabelFns,
  rows: EpdaParameterDiffRow[]
) {
  const group = 'cargoAgencyRates'
  const pairs = pairByIdentityElseIndex(current, latest, cargoIdentity)
  for (const pair of pairs) {
    const display =
      pair.current?.label ||
      pair.latest?.label ||
      pair.current?.code ||
      pair.latest?.code ||
      `#${pair.pathIndex + 1}`
    const leftRate = pair.current?.rate
    const rightRate = pair.latest?.rate
    if (leftRate === rightRate) continue
    rows.push({
      path: `${group}[${pair.pathIndex}].rate`,
      label: display,
      current: pair.current ? formatAmount(leftRate) : '—',
      latest: pair.latest ? formatAmount(rightRate) : '—',
    })
  }
}

/**
 * Flatten nested EpdaParameterValues into human-readable changed rows.
 * Scalars become `group.key`; tier/rate arrays emit one amount/rate row per change.
 */
export function diffEpdaParameterValues(
  current: EpdaParameterValues,
  latest: EpdaParameterValues,
  labelsOrT?: EpdaParameterLabelFns | EpdaTranslateFn
): EpdaParameterDiffRow[] {
  const labels = resolveLabels(labelsOrT)
  const left = normalizeParameterValues(current)
  const right = normalizeParameterValues(latest)
  const rows: EpdaParameterDiffRow[] = []

  for (const grp of NESTED_GROUPS) {
    const bg = left[grp] as Record<string, unknown>
    const ag = right[grp] as Record<string, unknown>
    const keys = new Set([...Object.keys(bg), ...Object.keys(ag)])
    for (const key of [...keys].sort((a, b) => a.localeCompare(b))) {
      const fromVal = bg[key]
      const toVal = ag[key]
      const fromText = formatScalar(fromVal)
      const toText = formatScalar(toVal)
      if (fromText === toText) continue
      rows.push({
        path: `${grp}.${key}`,
        label: labels.fieldLabel(grp, key),
        current: fromText,
        latest: toText,
      })
    }
  }

  for (const group of GRT_TIER_GROUPS) {
    diffGrtTierAmounts(group, left[group], right[group], labels, rows)
  }
  diffLoaTierAmounts(left.tugTiers, right.tugTiers, labels, rows)
  diffCargoAgencyRates(
    left.cargoAgencyRates,
    right.cargoAgencyRates,
    labels,
    rows
  )

  return rows
}

export { extractWorkingParams } from '@/modules/inquiries/components/common/quoteParameters'
