import type {
  Port,
  PortSearchFieldId,
} from '@/modules/logistics/services/portService'

export const NO_SELECTION = '__NONE__'

export const PORT_SEARCH_FIELDS: ReadonlyArray<{
  id: PortSearchFieldId
  label: string
}> = [
  { id: 'area', label: 'Area' },
  { id: 'provinceName', label: 'Province' },
  { id: 'name', label: 'Port Name' },
  { id: 'portOfCall', label: 'Port of Call' },
  { id: 'code', label: 'Code' },
  { id: 'zoneCode', label: 'Zone' },
  { id: 'countryCode', label: 'Country' },
]

export interface PortTableRow extends Port {
  area: string
  provinceName: string
}

export interface PortFormState {
  name: string
  portOfCall: string
  code: string
  zoneCode: string
  countryCode: string
  latitude: string
  longitude: string
  area: string
  provinceId: number | null
}

export const EMPTY_PORT_FORM: PortFormState = {
  name: '',
  portOfCall: '',
  code: '',
  zoneCode: 'AS-SIN',
  countryCode: 'VN',
  latitude: '',
  longitude: '',
  area: NO_SELECTION,
  provinceId: null,
}
