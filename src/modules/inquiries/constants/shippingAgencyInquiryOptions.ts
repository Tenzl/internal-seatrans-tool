export const PURPOSE_OF_CALLING_OPTIONS = [
  { value: 'NHAP_XUAT', label: 'Nhập - Xuất' },
  { value: 'NHAP_CHUYEN_CANG', label: 'Nhập - Chuyển cảng' },
  { value: 'CHUYEN_CANG_XUAT', label: 'Chuyển cảng - Xuất' },
  { value: 'CHUYEN_CANG_CHUYEN_CANG', label: 'Chuyển cảng - Chuyển cảng' },
  { value: 'MUC_DICH_KHAC', label: 'Mục đích khác' },
] as const

export type PurposeOfCallingValue = (typeof PURPOSE_OF_CALLING_OPTIONS)[number]['value']

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
