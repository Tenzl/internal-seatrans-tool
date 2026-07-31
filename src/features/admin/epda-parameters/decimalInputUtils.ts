import { parseFiniteNumber } from '@/shared/utils/parseNumber'

export const formatDecimalValue = (value: number) =>
  Number.isFinite(value) ? String(value) : ''

export const parseDecimalText = (raw: string): number | null => {
  const trimmed = raw.trim()
  if (
    trimmed === '' ||
    trimmed === '-' ||
    trimmed === '.' ||
    trimmed === '-.'
  ) {
    return 0
  }
  return parseFiniteNumber(trimmed)
}
