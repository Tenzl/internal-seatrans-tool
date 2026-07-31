import type { Province } from '@/modules/logistics/services/provinceService'
import type { parseGoogleMapsUrl } from '@/shared/utils/parseGoogleMapsUrl'

export interface Office {
  id: number
  provinceId?: number | null
  name: string
  city: string
  region: string
  address: string
  mapUrl?: string | null
  latitude?: string | number | null
  longitude?: string | number | null
  manager: {
    name: string
    title: string
    mobile: string
    email: string
  }
  coordinates?: {
    lat?: string | number | null
    lng?: string | number | null
  }
  isHeadquarter: boolean
  isActive: boolean
}

export interface OfficeFormState {
  provinceId: string
  name: string
  address: string
  mapUrl: string
  managerName: string
  managerTitle: string
  managerMobile: string
  managerEmail: string
  isHeadquarter: boolean
}

export interface OfficeUpsertRequest {
  provinceId: number
  name: string
  address: string
  mapUrl: string
  managerName: string
  managerTitle: string
  managerMobile: string
  managerEmail: string
  isHeadquarter: boolean
  isActive: true
}

export type ParsedGoogleMap = ReturnType<typeof parseGoogleMapsUrl>

export const createEmptyOfficeForm = (): OfficeFormState => ({
  provinceId: '',
  name: '',
  address: '',
  mapUrl: '',
  managerName: '',
  managerTitle: '',
  managerMobile: '',
  managerEmail: '',
  isHeadquarter: false,
})

const normalizeLocationName = (value?: string | null): string =>
  (value || '').toLowerCase().trim()

export function officeToForm(
  office: Office,
  provinces: Province[]
): OfficeFormState {
  // Older office rows have no provinceId, so retain the legacy city/region fallback.
  const provinceId =
    office.provinceId ??
    provinces.find((province) => {
      const provinceName = normalizeLocationName(province.name)
      return (
        provinceName === normalizeLocationName(office.city) ||
        provinceName === normalizeLocationName(office.region)
      )
    })?.id

  return {
    provinceId: provinceId ? String(provinceId) : '',
    name: office.name,
    address: office.address,
    mapUrl: office.mapUrl || '',
    managerName: office.manager?.name || '',
    managerTitle: office.manager?.title || '',
    managerMobile: office.manager?.mobile || '',
    managerEmail: office.manager?.email || '',
    isHeadquarter: office.isHeadquarter,
  }
}

export function validateOfficeForm(
  form: OfficeFormState,
  parsedMap: ParsedGoogleMap
): string | null {
  if (!form.provinceId || !form.name || !form.address) {
    return 'Please fill in required fields (Province, Name, Address)'
  }
  if (!form.mapUrl.trim()) return 'Please paste a Google Maps URL.'
  return parsedMap.ok ? null : parsedMap.message
}

export function officeFormToRequest(
  form: OfficeFormState
): OfficeUpsertRequest {
  return {
    provinceId: Number.parseInt(form.provinceId, 10),
    name: form.name,
    address: form.address,
    mapUrl: form.mapUrl.trim(),
    managerName: form.managerName,
    managerTitle: form.managerTitle,
    managerMobile: form.managerMobile,
    managerEmail: form.managerEmail,
    isHeadquarter: form.isHeadquarter,
    isActive: true,
  }
}
