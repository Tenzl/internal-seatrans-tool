export const PURPOSE_OF_CALLING_OPTIONS = [
  { value: 'NHAP_XUAT', label: 'Import - Export' },
  { value: 'NHAP_CHUYEN_CANG', label: 'Import - Transshipment' },
  { value: 'CHUYEN_CANG_XUAT', label: 'Transshipment - Export' },
  { value: 'CHUYEN_CANG_CHUYEN_CANG', label: 'Transshipment - Transshipment' },
  { value: 'MUC_DICH_KHAC', label: 'Other purpose' },
] as const


/** Customer inquiry form — simplified import/export choice (values unchanged for API). */
export const PUBLIC_FRT_TAX_TYPE_OPTIONS = [
  { value: 'Import', label: 'Import - No freight tax' },
  { value: 'Export', label: 'Export' },
] as const

const normalizePurposeKey = (value: string) => value.trim().toUpperCase().replace(/[\s-]+/g, '_')

export function formatPurposeOfCalling(value: string | null | undefined): string {
  if (!value?.trim()) return ''
  const normalized = normalizePurposeKey(value)
  const match = PURPOSE_OF_CALLING_OPTIONS.find((option) => option.value === normalized)
  return match?.label ?? value
}

export function formatPublicFrtTaxType(value: string | null | undefined): string {
  if (!value?.trim()) return ''
  const trimmed = value.trim()
  const match = PUBLIC_FRT_TAX_TYPE_OPTIONS.find(
    (option) => option.value.toLowerCase() === trimmed.toLowerCase(),
  )
  return match?.label ?? value
}
