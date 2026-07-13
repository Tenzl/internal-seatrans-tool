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
  const unknownHeaders = normalizedActual.filter((_, index) => !allowed.has(canonicalActual[index]))

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

  const matrix: unknown[][] = isCsvFile(file)
    ? await parseCsvFile(file)
    : await parseXlsxFile(file)

  if (matrix.length === 0) {
    return { headers: [], rows: [] }
  }

  const firstRow = matrix[0] ?? []
  const headers = firstRow.map((cell, index) => {
    const header = stringifyImportCell(cell)
    return index === 0 ? header.replace(/^\uFEFF/, '') : header
  })
  const normalizedHeaders = headers.map(normalizeHeader)

  const rows = matrix
    .slice(1)
    .map((row) => {
      const mapped: Record<string, string> = {}
      normalizedHeaders.forEach((header, index) => {
        mapped[header] = stringifyImportCell(row[index])
      })
      return mapped
    })
    .filter((row) => Object.values(row).some((value) => value !== ''))

  return { headers, rows }
}

const stringifyImportCell = (value: unknown): string => {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim()
  }
  return ''
}

const parseCsvFile = async (file: File): Promise<unknown[][]> => {
  const Papa = (await import('papaparse')).default
  const result = Papa.parse<unknown[]>(await file.text(), {
    skipEmptyLines: 'greedy',
  })

  if (result.errors.length > 0) {
    throw new Error(`Invalid CSV at row ${result.errors[0].row ?? 1}: ${result.errors[0].message}`)
  }

  return result.data
}

const parseXlsxFile = async (file: File): Promise<unknown[][]> => {
  const readXlsxFile = (await import('read-excel-file/browser')).default
  const sheets = await readXlsxFile(file)
  return sheets[0]?.data ?? []
}
