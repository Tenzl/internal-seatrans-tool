import * as XLSX from 'xlsx'

export type HeaderAliasMap = Record<string, string[]>

export interface ExcelImportSchema {
  requiredHeaders: string[]
  optionalHeaders?: string[]
  headerAliases?: HeaderAliasMap
}

export interface ExcelImportValidationResult {
  isValid: boolean
  missingHeaders: string[]
  unknownHeaders: string[]
}

export interface ParsedExcelResult {
  headers: string[]
  rows: Array<Record<string, string>>
}

const XLSX_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
])

const CSV_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/octet-stream',
  '',
])

export const normalizeHeader = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

export const isXlsxFile = (file: File): boolean => {
  const lowerName = file.name.toLowerCase()
  if (!lowerName.endsWith('.xlsx')) {
    return false
  }

  // Some browsers may provide an empty MIME type.
  return !file.type || XLSX_MIME_TYPES.has(file.type)
}

export const isCsvFile = (file: File): boolean => {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    return false
  }
  return !file.type || CSV_MIME_TYPES.has(file.type)
}

/** Accept either an .xlsx workbook or a .csv file. */
export const isSupportedImportFile = (file: File): boolean =>
  isXlsxFile(file) || isCsvFile(file)

const buildHeaderLookup = (schema: ExcelImportSchema): Map<string, string> => {
  const lookup = new Map<string, string>()
  const canonicalHeaders = [...schema.requiredHeaders, ...(schema.optionalHeaders ?? [])]

  canonicalHeaders.forEach((header) => {
    const normalized = normalizeHeader(header)
    lookup.set(normalized, normalized)
  })

  Object.entries(schema.headerAliases ?? {}).forEach(([canonicalHeader, aliases]) => {
    const normalizedCanonical = normalizeHeader(canonicalHeader)
    lookup.set(normalizedCanonical, normalizedCanonical)

    aliases.forEach((alias) => {
      lookup.set(normalizeHeader(alias), normalizedCanonical)
    })
  })

  return lookup
}

const resolveCanonicalHeader = (header: string, lookup: Map<string, string>): string => {
  const normalized = normalizeHeader(header)
  return lookup.get(normalized) ?? normalized
}

export const validateTemplateHeaders = (
  headers: string[],
  schema: ExcelImportSchema,
): ExcelImportValidationResult => {
  const lookup = buildHeaderLookup(schema)

  const normalizedActual = headers.map(normalizeHeader)
  const canonicalActual = normalizedActual.map((header) => resolveCanonicalHeader(header, lookup))
  const required = schema.requiredHeaders.map(normalizeHeader)
  const optional = (schema.optionalHeaders ?? []).map(normalizeHeader)

  const allowed = new Set([...required, ...optional])

  const missingHeaders = required.filter((header) => !canonicalActual.includes(header))
  const unknownHeaders = normalizedActual.filter((header, index) => !allowed.has(canonicalActual[index]))

  return {
    isValid: missingHeaders.length === 0,
    missingHeaders,
    unknownHeaders: [...new Set(unknownHeaders)],
  }
}

export const canonicalizeParsedRows = (
  parsed: ParsedExcelResult,
  schema: ExcelImportSchema,
): ParsedExcelResult => {
  const lookup = buildHeaderLookup(schema)

  const canonicalHeaders = parsed.headers.map((header) => resolveCanonicalHeader(header, lookup))
  const rows = parsed.rows.map((row) => {
    const mapped: Record<string, string> = {}

    Object.entries(row).forEach(([key, value]) => {
      const canonicalKey = resolveCanonicalHeader(key, lookup)
      if (!mapped[canonicalKey]) {
        mapped[canonicalKey] = value
      }
    })

    return mapped
  })

  return {
    headers: canonicalHeaders,
    rows,
  }
}

export const parseExcelFile = async (file: File): Promise<ParsedExcelResult> => {
  if (!isSupportedImportFile(file)) {
    throw new Error('Only .xlsx or .csv files are supported')
  }

  const arrayBuffer = await file.arrayBuffer()
  // SheetJS auto-detects the format, so the same path reads .xlsx and .csv.
  const workbook = XLSX.read(arrayBuffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    return { headers: [], rows: [] }
  }

  const sheet = workbook.Sheets[firstSheetName]
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    raw: false,
    blankrows: false,
    defval: '',
  })

  if (matrix.length === 0) {
    return { headers: [], rows: [] }
  }

  const firstRow: (string | number | boolean | null)[] = matrix[0] ?? []
  const headers = firstRow.map((cell: string | number | boolean | null) => String(cell ?? '').trim())
  const normalizedHeaders = headers.map(normalizeHeader)

  const rows = matrix
    .slice(1)
    .map((row: (string | number | boolean | null)[]) => {
      const mapped: Record<string, string> = {}
      normalizedHeaders.forEach((header: string, index: number) => {
        mapped[header] = String(row[index] ?? '').trim()
      })
      return mapped
    })
    .filter((row: Record<string, string>) => Object.values(row).some((value: string) => value !== ''))

  return { headers, rows }
}
