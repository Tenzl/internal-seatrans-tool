export const formatInvoiceDate = (dateInput?: string | Date | null): string => {
  if (!dateInput) return ''
  
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (Number.isNaN(date.getTime())) return typeof dateInput === 'string' ? dateInput : ''

  const day = date.getDate()
  const month = date.toLocaleString('en-US', { month: 'long' })
  const year = date.getFullYear()

  // Determine ordinal suffix (st, nd, rd, th)
  let suffix = 'th'
  if (day % 10 === 1 && day !== 11) suffix = 'st'
  else if (day % 10 === 2 && day !== 12) suffix = 'nd'
  else if (day % 10 === 3 && day !== 13) suffix = 'rd'

  return `${day}${suffix} ${month}, ${year}`
}

export const formatCheckMark = (value?: unknown): string => {
  if (typeof value === 'boolean') return value ? 'x' : ''
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  
  if (['yes', 'y', 'true', '1', 'x'].includes(normalized)) return 'x'
  return ''
}

export const formatCargoDescription = (name?: string, type?: string): string => {
  const normalize = (value?: string) =>
    (value || '')
      .trim()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .toUpperCase()

  const n = normalize(name)
  if (n) return n

  return normalize(type)
}

const normalizeCargoText = (value: unknown): string => {
  if (value === undefined || value === null) return ''
  return String(value)
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase()
}

const normalizeCargoTypeDisplay = (value: unknown): string => {
  const raw = normalizeCargoText(value)
  if (!raw) return ''

  if (raw.includes('BAG') || raw.includes('PACK')) return 'IN BAGS/PACKS'
  if (raw.includes('BULK')) return 'IN BULK'

  return raw
}

export const formatCargoNameWithType = (name: unknown, type: unknown): string => {
  const cargoName = normalizeCargoText(name)
  const cargoType = normalizeCargoTypeDisplay(type)

  if (!cargoName) return cargoType
  if (!cargoType) return cargoName
  if (cargoName.endsWith(cargoType)) return cargoName

  return `${cargoName} ${cargoType}`
}

const NUMERIC_TEXT_PATTERN = /^-?\d+(?:\.\d+)?$/

const formatNumericText = (value: string): string => {
  const raw = value.trim()
  if (!raw) return value

  const normalized = raw.replace(/,/g, '')
  if (!NUMERIC_TEXT_PATTERN.test(normalized)) return value

  const numeric = Number(normalized)
  if (!Number.isFinite(numeric)) return value

  const fractionDigits = normalized.includes('.') ? normalized.split('.')[1].length : 0

  return numeric.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

const normalizeInvoiceNumericValue = (value: unknown): unknown => {
  if (value === null || value === undefined) return value

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return value
    return value.toLocaleString('en-US')
  }

  if (typeof value === 'string') {
    return formatNumericText(value)
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeInvoiceNumericValue(item))
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, item]) => {
      acc[key] = normalizeInvoiceNumericValue(item)
      return acc
    }, {})
  }

  return value
}

export const normalizeInvoiceNumericFields = <T>(input: T): T => {
  return normalizeInvoiceNumericValue(input) as T
}
