export const MAX_NUMBER_INPUT_DECIMALS = 3

const GROUPING_SEPARATOR_PATTERN = /\B(?=(\d{3})+(?!\d))/g
const LEADING_ZERO_PATTERN = /^0+(?=\d)/
const UNSIGNED_DECIMAL_PATTERN = /^\d*(?:\.\d*)?$/

const NUMBER_FORMATTERS = Array.from(
  { length: MAX_NUMBER_INPUT_DECIMALS + 1 },
  (_, maximumFractionDigits) =>
    new Intl.NumberFormat('en-US', {
      useGrouping: true,
      minimumFractionDigits: 0,
      maximumFractionDigits,
    })
)

export type NumberInputDecimalScale = 0 | 1 | 2 | 3

export type ParsedNumberInputDraft = {
  canonical: string
  formatted: string
  value: number | null
}

type ParseNumberInputOptions = {
  decimalScale?: NumberInputDecimalScale
  min?: number
  max?: number
}

export function parseNumberInputDraft(
  raw: string,
  {
    decimalScale = MAX_NUMBER_INPUT_DECIMALS,
    min = 0,
    max,
  }: ParseNumberInputOptions = {}
): ParsedNumberInputDraft | null {
  const ungrouped = raw.replaceAll(',', '')
  if (ungrouped === '') {
    return { canonical: '', formatted: '', value: null }
  }
  if (!UNSIGNED_DECIMAL_PATTERN.test(ungrouped)) return null

  const hasDecimalPoint = ungrouped.includes('.')
  const [rawInteger = '', fraction = ''] = ungrouped.split('.')
  if (decimalScale === 0 && hasDecimalPoint) return null
  if (fraction.length > decimalScale) return null

  const integer = (rawInteger || '0').replace(LEADING_ZERO_PATTERN, '')
  const canonical = `${integer}${hasDecimalPoint ? `.${fraction}` : ''}`
  const value = Number(canonical)
  if (!Number.isFinite(value) || value < min || (max != null && value > max)) {
    return null
  }

  return {
    canonical,
    formatted: `${integer.replace(GROUPING_SEPARATOR_PATTERN, ',')}${
      hasDecimalPoint ? `.${fraction}` : ''
    }`,
    value,
  }
}

export function formatNumberInputValue(
  value: number | string | null | undefined,
  decimalScale: NumberInputDecimalScale = MAX_NUMBER_INPUT_DECIMALS
): string {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'string') {
    const editable = parseNumberInputDraft(value, { decimalScale })
    if (editable) return editable.formatted
    const numeric = Number(value.replaceAll(',', ''))
    return Number.isFinite(numeric) && numeric >= 0
      ? NUMBER_FORMATTERS[decimalScale].format(numeric)
      : ''
  }
  if (!Number.isFinite(value) || value < 0) return ''
  return NUMBER_FORMATTERS[decimalScale].format(value)
}
