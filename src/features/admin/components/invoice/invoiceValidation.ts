export type RequiredFieldKey =
  | 'toShipowner'
  | 'mv'
  | 'dischargeLoadingLocation'
  | 'dwt'
  | 'grt'
  | 'loa'
  | 'cargoQty'
  | 'cargoType'
  | 'cargoName'
  | 'purposeOfCalling'
  | 'frtTaxType'

export interface RequiredField {
  key: RequiredFieldKey
  label: string
  value: string | null | undefined
}

export interface CreateInvoiceRequiredValues {
  toShipowner: string
  mv: string
  dischargeLoadingLocation: string
  dwt: string
  grt: string
  loa: string
  cargoQty: string
  cargoType: string
  cargoName: string
  purposeOfCalling: string
  frtTaxType: string
}

export interface RequiredFieldOptions {
  requireFrtTaxType?: boolean
  /** Cargo types flagged hasCargoName=false don't require a Cargo Name. */
  requireCargoName?: boolean
}

const REQUIRED_FIELD_CONFIG: Array<{ key: RequiredFieldKey; label: string }> = [
  { key: 'toShipowner', label: 'To (Ship Owner/Company)' },
  { key: 'mv', label: 'M/V (Vessel Name)' },
  { key: 'dischargeLoadingLocation', label: 'Discharge/Loading at' },
  { key: 'dwt', label: 'DWT (tons)' },
  { key: 'grt', label: 'GRT (tons)' },
  { key: 'loa', label: 'LOA (meters)' },
  { key: 'cargoQty', label: 'Quantity (tons)' },
  { key: 'cargoType', label: 'Cargo Type' },
  { key: 'cargoName', label: 'Cargo Name' },
  { key: 'purposeOfCalling', label: 'Purpose of calling' },
  { key: 'frtTaxType', label: 'Freight tax declaration' },
]

export function buildRequiredFields(values: CreateInvoiceRequiredValues, options?: RequiredFieldOptions): RequiredField[] {
  const requireFrtTaxType = options?.requireFrtTaxType ?? true
  const requireCargoName = options?.requireCargoName ?? true

  return REQUIRED_FIELD_CONFIG
    .filter((field) => (field.key === 'frtTaxType' ? requireFrtTaxType : true))
    .filter((field) => (field.key === 'cargoName' ? requireCargoName : true))
    .map((field) => ({
    key: field.key,
    label: field.label,
    value: values[field.key],
    }))
}

export function getMissingRequiredFields(fields: RequiredField[]): RequiredField[] {
  return fields.filter((field) => String(field.value ?? '').trim() === '')
}

export function getRequiredFieldState(value: string | null | undefined, showError: boolean) {
  const hasValue = String(value ?? '').trim() !== ''
  return {
    labelClass: !showError || hasValue ? 'text-foreground' : 'text-red-600',
    fieldClass: !showError || hasValue ? '' : 'border-red-500 focus-visible:ring-red-500',
  }
}
