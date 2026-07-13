/**
 * Parse any user/API value into a finite number.
 * Handles comma separators and partial decimal input from form fields.
 */
export function parseFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim()
    if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') return null
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : null
  }
  if (value === null || value === undefined) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/** Like parseFiniteNumber but returns `undefined` for empty/invalid (API payloads). */
export function parseFiniteNumberOrUndefined(value: unknown): number | undefined {
  const n = parseFiniteNumber(value)
  return n === null ? undefined : n
}
