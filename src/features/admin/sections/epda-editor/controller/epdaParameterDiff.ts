import {
  normalizeParameterValues,
  type EpdaParameterValues,
} from '@/modules/inquiries/components/common/quoteParameters'

export type EpdaParameterDiffRow = {
  path: string
  current: string
  latest: string
}

function formatDiffValue(value: unknown): string {
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

/**
 * Flatten nested EpdaParameterValues into rows for the Apply/Skip dialog.
 * Scalars become `group.key`; arrays/objects become a single path with JSON.
 */
export function diffEpdaParameterValues(
  current: EpdaParameterValues,
  latest: EpdaParameterValues
): EpdaParameterDiffRow[] {
  const left = normalizeParameterValues(current)
  const right = normalizeParameterValues(latest)
  const rows: EpdaParameterDiffRow[] = []

  const walk = (path: string, a: unknown, b: unknown) => {
    if (
      a !== null &&
      b !== null &&
      typeof a === 'object' &&
      typeof b === 'object' &&
      !Array.isArray(a) &&
      !Array.isArray(b)
    ) {
      const keys = new Set([
        ...Object.keys(a as object),
        ...Object.keys(b as object),
      ])
      for (const key of [...keys].sort((x, y) => x.localeCompare(y))) {
        walk(
          path ? `${path}.${key}` : key,
          (a as Record<string, unknown>)[key],
          (b as Record<string, unknown>)[key]
        )
      }
      return
    }

    const leftText = formatDiffValue(a)
    const rightText = formatDiffValue(b)
    if (leftText === rightText) return
    rows.push({ path, current: leftText, latest: rightText })
  }

  walk('', left, right)
  return rows
}

export { extractWorkingParams } from '@/modules/inquiries/components/common/quoteParameters'
