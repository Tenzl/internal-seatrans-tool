import {
  CARGO_VOLUME_TYPES,
  formatCargoVolumes,
  formatVolumeForBlPdf,
  type CargoVolumes,
  isCargoVolumeType,
} from './cargoVolumeModel'
import type { AnContainer, CargoRow } from './transportDocument.types'

export const AN_CONTAINER_MAX_ROWS = 20

export const AN_CONTAINER_TYPE_OPTIONS = [
  { value: '', label: '—' },
  ...CARGO_VOLUME_TYPES.map((type) => ({ value: type, label: type })),
] as const

/** Package-type dropdown values for AN/BL container rows (fixed casing/order). */
export const AN_CONTAINER_PACKAGE_TYPES = [
  'CRT',
  'PKGS',
  'CAS',
  'BAL',
  'CTNS',
  'BAG(S)',
  'BALE(S)',
  'BOX(S)',
  'BULK(S)',
  'BUNDLE(S)',
  'CARTON(S)',
  'CASE(S)',
  'COIL(S)',
  'CRATE(S)',
  'CYLINDER(S)',
  'DRUM(S)',
  'JUMBO BAG(S)',
  'LINE DETENTION',
  'PACKAGE(S)',
  'PACKING CARTON(S)',
  'PALLET(S)',
  'PIECES',
  'WOODEN BOX(S)',
  'WOODEN CRATES',
  'WOODEN CASE(S)',
  'ROLL(S)',
  'SET(S)',
  'UNIT(S)',
  'STEEL DRUMS',
  'CLEATED PLYWOOD BOXES',
  'FIBREBOARD BOXES',
  'CARDBOARD BOXES',
  'DOZEN',
  'PAIR',
  'PAIL',
  'CASKS',
  'KEGS',
  'SLAB(S)',
  'SACK',
  'SKIDS',
  'BARRELS',
  'BLISTER',
  'CAN',
  'CUP',
  'CAPSULE',
  'FOIL',
  'PACKET',
  'TABLET',
  'TANK',
  'TOTE',
  'BOTTLE',
  'FLOWPACK',
  'JAR',
  'TRAY',
  'CAGE',
  'ROLL CAGE',
  'SLIT BOX',
  'PRESSURIZED CONTAINER',
  'BA',
  'BE',
  'BG',
  'BK',
  'BASKET(S)',
  'BL',
  'BN',
  'BR',
  'BX',
  'CA',
  'CG',
  'CK',
  'CL',
  'CN',
  'CO',
  'CP',
  'CR',
  'CS',
  'CT',
  'CX',
  'CY',
  'DR',
  'KG',
  'LG',
  'LZ',
  'MST',
  'MT',
  'NE',
  'NT',
  'PA',
  'PC',
  'PE',
  'PG',
  'PI',
  'PK',
  'PL',
  'PP',
  'PLTS',
  'PS',
  'PU',
  'RL',
  'TY',
  'ZZ',
] as const

export type AnContainerPackageType = (typeof AN_CONTAINER_PACKAGE_TYPES)[number]

const AN_CONTAINER_PACKAGE_TYPE_SET = new Set<string>(AN_CONTAINER_PACKAGE_TYPES)

export function isAnContainerPackageType(
  value: string
): value is AnContainerPackageType {
  return AN_CONTAINER_PACKAGE_TYPE_SET.has(value)
}

export const AN_CONTAINER_PACKAGE_TYPE_OPTIONS = [
  { value: '', label: '—' },
  ...AN_CONTAINER_PACKAGE_TYPES.map((type) => ({ value: type, label: type })),
] as const

export function emptyAnContainer(): AnContainer {
  return {
    type: '',
    containerNo: '',
    sealNo: '',
    grossWeight: '',
    measurement: '',
    tare: '',
    packageType: '',
    noOfPkgs: '',
    note: '',
    method: '',
  }
}

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Normalize one container row; unknown types become empty type. */
export function normalizeAnContainer(raw: unknown): AnContainer {
  const row =
    typeof raw === 'object' && raw !== null
      ? (raw as Record<string, unknown>)
      : {}
  const typeRaw = asTrimmedString(row.type)
  return {
    type: isCargoVolumeType(typeRaw) ? typeRaw : '',
    containerNo: asTrimmedString(row.containerNo),
    sealNo: asTrimmedString(row.sealNo),
    grossWeight: asTrimmedString(row.grossWeight),
    measurement: asTrimmedString(row.measurement),
    tare: asTrimmedString(row.tare),
    packageType: asTrimmedString(row.packageType),
    noOfPkgs: asTrimmedString(row.noOfPkgs),
    note: asTrimmedString(row.note),
    method: asTrimmedString(row.method),
  }
}

/** Migrate legacy CargoRow → AnContainer (best-effort field split). */
export function legacyCargoRowToAnContainer(row: CargoRow): AnContainer {
  const sealParts = row.containerSealNumber
    .split(/\s*\/\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
  return {
    ...emptyAnContainer(),
    containerNo: sealParts[0] ?? '',
    sealNo: sealParts.slice(1).join(' / '),
    grossWeight: row.grossWeight,
    measurement: row.measurement,
    noOfPkgs: row.quantity,
    note: row.descriptionOfGoods,
  }
}

/**
 * Prefer `containers`; else migrate legacy `cargoRows`.
 * Does not cap length — callers validate max rows via schema/DTO.
 */
export function normalizeAnContainers(payload: {
  containers?: unknown
  cargoRows?: unknown
}): AnContainer[] {
  if (Array.isArray(payload.containers)) {
    return payload.containers.map(normalizeAnContainer)
  }
  if (Array.isArray(payload.cargoRows)) {
    return payload.cargoRows.map((row) =>
      legacyCargoRowToAnContainer({
        containerSealNumber: asTrimmedString(
          (row as CargoRow).containerSealNumber
        ),
        quantity: asTrimmedString((row as CargoRow).quantity),
        descriptionOfGoods: asTrimmedString(
          (row as CargoRow).descriptionOfGoods
        ),
        grossWeight: asTrimmedString((row as CargoRow).grossWeight),
        measurement: asTrimmedString((row as CargoRow).measurement),
      })
    )
  }
  return []
}

/**
 * Map AN containers into legacy DO/PDF cargo row shape (one row per container).
 * Shipment `descriptionOfGoods` goes on the first row’s description cell.
 * Per-container `note` is not mapped into the description column.
 */
export function anContainersToCargoRows(
  containers: AnContainer[],
  descriptionOfGoods = ''
): CargoRow[] {
  const shipmentDescription = descriptionOfGoods.trim()
  return containers.map((container, index) => ({
    containerSealNumber: [container.containerNo, container.sealNo]
      .filter(Boolean)
      .join(' / '),
    quantity: [container.noOfPkgs, container.packageType]
      .filter(Boolean)
      .join(' '),
    descriptionOfGoods: [
      container.type,
      container.tare ? `Tare: ${container.tare}` : '',
      index === 0 ? shipmentDescription : '',
      container.method ? `Method: ${container.method}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    grossWeight: withCargoUnit(container.grossWeight, 'KGS'),
    measurement: withCargoUnit(container.measurement, 'CBM'),
  }))
}

function withCargoUnit(value: string, unit: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const unitRe = new RegExp(`\\b${unit}\\b`, 'i')
  if (unitRe.test(trimmed)) {
    return trimmed.replace(unitRe, unit)
  }
  return `${trimmed} ${unit}`
}

/**
 * Flatten containers into BL blank-form GW / measurement columns.
 * Description stays the shipment-level free-text field (not derived from notes).
 * `volumeStc` is the PDF description-column first line (compact counts + STC).
 */
export function anContainersToBlCargoTextFields(
  containers: AnContainer[],
  descriptionOfGoods = ''
): {
  descriptionOfGoods: string
  grossWeight: string
  measurement: string
  volumeStc: string
} {
  const cargoRows = anContainersToCargoRows(containers, descriptionOfGoods)
  const join = (key: 'grossWeight' | 'measurement') =>
    cargoRows
      .map((row) => row[key].trim())
      .filter(Boolean)
      .join('\n')
  const explicit = descriptionOfGoods.trim()
  return {
    descriptionOfGoods:
      explicit ||
      cargoRows
        .map((row) => row.descriptionOfGoods.trim())
        .filter(Boolean)
        .join('\n'),
    grossWeight: join('grossWeight'),
    measurement: join('measurement'),
    volumeStc: formatVolumeForBlPdf(anContainersToCargoVolumes(containers)),
  }
}

/**
 * Best-effort shipment description when legacy payloads only stored goods
 * text on container `note` (or legacy cargoRows → note).
 */
export function resolveDescriptionOfGoods(payload: {
  descriptionOfGoods?: unknown
  containers?: AnContainer[]
}): string {
  if (typeof payload.descriptionOfGoods === 'string') {
    const trimmed = payload.descriptionOfGoods.trim()
    if (trimmed) return trimmed
  }
  const fromNote = (payload.containers ?? [])
    .map((row) => row.note.trim())
    .find(Boolean)
  return fromNote ?? ''
}

/**
 * Best-effort reverse of BL free-text cargo → container rows for legacy
 * payloads that never had `containers`. Keeps one row so multi-line
 * description/GW/measurement from a prior flatten stay intact.
 */
export function legacyBlCargoTextToContainers(payload: {
  descriptionOfGoods?: unknown
  grossWeight?: unknown
  measurement?: unknown
  numberAndKindOfPackages?: unknown
}): AnContainer[] {
  const description =
    typeof payload.descriptionOfGoods === 'string'
      ? payload.descriptionOfGoods.trim()
      : ''
  const grossWeight =
    typeof payload.grossWeight === 'string' ? payload.grossWeight.trim() : ''
  const measurement =
    typeof payload.measurement === 'string' ? payload.measurement.trim() : ''
  const packages =
    typeof payload.numberAndKindOfPackages === 'string'
      ? payload.numberAndKindOfPackages.trim()
      : ''
  if (!description && !grossWeight && !measurement && !packages) return []

  const pkgParts = packages.split(/\s+/).filter(Boolean)
  return [
    {
      ...emptyAnContainer(),
      note: description,
      grossWeight,
      measurement,
      noOfPkgs: pkgParts[0] ?? '',
      packageType: pkgParts.slice(1).join(' '),
    },
  ]
}

/**
 * Seed empty container slots from booking volume counts (no invented numbers).
 * Caps at AN_CONTAINER_MAX_ROWS.
 */
export function seedAnContainersFromVolumes(
  volumes: CargoVolumes
): AnContainer[] {
  const rows: AnContainer[] = []
  for (const type of CARGO_VOLUME_TYPES) {
    const qty = volumes[type] ?? 0
    for (let i = 0; i < qty; i += 1) {
      if (rows.length >= AN_CONTAINER_MAX_ROWS) return rows
      rows.push({ ...emptyAnContainer(), type })
    }
  }
  return rows
}

const UNIT_SUFFIX_PATTERN = /\b(?:KGS?|CBM|MT|LBS?)\b/gi
const LEADING_NUMBER_PATTERN = /^(-?\d+(?:\.\d+)?)/

/**
 * Parse a container numeric cell that may include commas, unit suffixes
 * (KGS/CBM), or trailing text (e.g. `930 CARTONS`).
 */
export function parseAnNumericField(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').replace(UNIT_SUFFIX_PATTERN, '').trim()
  if (!cleaned) return null
  const match = cleaned.match(LEADING_NUMBER_PATTERN)
  if (!match) return null
  const n = Number(match[1])
  return Number.isFinite(n) ? n : null
}

/** Canonical ungrouped string for NumberInput when the stored value has units/text. */
export function anNumericInputValue(raw: string): string {
  const n = parseAnNumericField(raw)
  return n == null ? '' : String(n)
}

export type AnContainerSummary = {
  shipmentBadges: string[]
  totalGrossWeight: number
  totalMeasurement: number
  totalNoOfPkgs: number
  packageTypes: string
  totalVgm: number
}

/** Count container types into a CargoVolumes map (Total Shipment style). */
export function anContainersToCargoVolumes(
  containers: AnContainer[]
): CargoVolumes {
  const volumes: CargoVolumes = {}
  for (const row of containers) {
    const type = row.type.trim()
    if (!isCargoVolumeType(type)) continue
    volumes[type] = (volumes[type] ?? 0) + 1
  }
  return volumes
}

/**
 * PDF / payload Volume text from typed container rows
 * (e.g. `1 x 20'DC` / multiline). Empty when no types set.
 */
export function anContainersToVolumeText(containers: AnContainer[]): string {
  return formatCargoVolumes(anContainersToCargoVolumes(containers))
}

/** Aggregate shipment counts and numeric totals for the AN containers summary panel. */
export function summarizeAnContainers(
  rows: AnContainer[]
): AnContainerSummary {
  const typeCounts = anContainersToCargoVolumes(rows)
  let totalGrossWeight = 0
  let totalMeasurement = 0
  let totalNoOfPkgs = 0
  const packageTypes: string[] = []
  const seenPackageTypes = new Set<string>()

  for (const row of rows) {
    totalGrossWeight += parseAnNumericField(row.grossWeight) ?? 0
    totalMeasurement += parseAnNumericField(row.measurement) ?? 0
    totalNoOfPkgs += parseAnNumericField(row.noOfPkgs) ?? 0
    const packageType = row.packageType.trim()
    if (packageType && !seenPackageTypes.has(packageType)) {
      seenPackageTypes.add(packageType)
      packageTypes.push(packageType)
    }
  }

  return {
    shipmentBadges: CARGO_VOLUME_TYPES.filter(
      (type) => (typeCounts[type] ?? 0) > 0
    ).map((type) => `${type} x ${typeCounts[type]}`),
    totalGrossWeight,
    totalMeasurement,
    totalNoOfPkgs,
    packageTypes: packageTypes.join(', '),
    totalVgm: 0,
  }
}
