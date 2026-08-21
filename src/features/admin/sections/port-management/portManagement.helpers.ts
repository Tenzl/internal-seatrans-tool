import type {
  Port,
  SavePortPayload,
} from '@/modules/logistics/services/portService'
import type { Province } from '@/modules/logistics/services/provinceService'
import { getPortAreaShortLabel, isPortAreaCode } from '@/shared/domain/portArea'
import {
  EMPTY_PORT_FORM,
  NO_SELECTION,
  type PortFormState,
  type PortTableRow,
} from './portManagement.types'

export const buildPortOfCall = (name: string): string =>
  name.trim().toUpperCase()

export function getAreaLabel(value?: number | string | null): string {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    value === NO_SELECTION
  ) {
    return 'UNKNOWN'
  }
  const area = String(value)
  return isPortAreaCode(area) ? getPortAreaShortLabel(area) : 'UNKNOWN'
}

export function createPortForm(searchName = ''): PortFormState {
  const name = searchName.trim()
  return {
    ...EMPTY_PORT_FORM,
    name,
    portOfCall: name ? buildPortOfCall(name) : '',
  }
}

export function editPortForm(port: Port, provinces: Province[]): PortFormState {
  const province =
    port.provinceId == null
      ? undefined
      : provinces.find((candidate) => candidate.id === port.provinceId)

  return {
    name: port.name ?? '',
    subName1: port.subName1 ?? '',
    subName2: port.subName2 ?? '',
    portOfCall: port.portOfCall ?? '',
    code: port.code ?? '',
    zoneCode: port.zoneCode ?? '',
    countryCode: port.countryCode ?? '',
    latitude: port.latitude != null ? String(port.latitude) : '',
    longitude: port.longitude != null ? String(port.longitude) : '',
    area:
      port.provinceArea != null
        ? String(port.provinceArea)
        : province?.area != null
          ? String(province.area)
          : NO_SELECTION,
    provinceId: port.provinceId ?? null,
    type: port.type ?? 'PORT',
    inCharge: port.inCharge ?? false,
  }
}

function parseOptionalNumber(
  rawValue: string,
  fieldLabel: string
): number | undefined {
  const trimmed = rawValue.trim()
  if (!trimmed) return undefined

  const value = Number(trimmed)
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldLabel} must be a valid number`)
  }
  return value
}

export function buildSavePortPayload(
  form: PortFormState,
  isEditing: boolean
): SavePortPayload {
  const name = form.name.trim()
  if (!name) {
    throw new Error('Port name cannot be empty')
  }

  if (form.inCharge) {
    if (!isPortAreaCode(form.area)) {
      throw new Error('Area is required when In charge is checked')
    }
    if (form.provinceId == null) {
      throw new Error('Province is required when In charge is checked')
    }
  }

  const payload: SavePortPayload = {
    name,
    provinceId: form.provinceId ?? null,
    type: form.type,
    inCharge: form.inCharge,
  }

  const subName1 = form.subName1.trim()
  const subName2 = form.subName2.trim()
  if (subName1 || isEditing) payload.subName1 = subName1
  if (subName2 || isEditing) payload.subName2 = subName2

  const portOfCall = form.portOfCall.trim()
  // Editing must send an empty value so an existing port-of-call can be cleared.
  if (portOfCall || isEditing) payload.portOfCall = portOfCall

  const code = form.code.trim()
  if (code) payload.code = code

  const zoneCode = form.zoneCode.trim()
  if (zoneCode) payload.zoneCode = zoneCode

  const countryCode = form.countryCode.trim()
  if (countryCode) payload.countryCode = countryCode

  // The backend DTO currently validates coordinates as numeric strings.
  const latitude = parseOptionalNumber(form.latitude, 'Latitude')
  if (latitude !== undefined) payload.latitude = String(latitude)

  const longitude = parseOptionalNumber(form.longitude, 'Longitude')
  if (longitude !== undefined) payload.longitude = String(longitude)

  return payload
}

export function getProvinceOptionsForEdit(
  provinces: Province[],
  area: string,
  selectedProvinceId: number | null
): Province[] {
  return provinces.filter(
    (province) =>
      String(province.area ?? '') === area || province.id === selectedProvinceId
  )
}

export function buildPortTableRows(
  ports: Port[],
  provinces: Province[]
): PortTableRow[] {
  const provinceMap = new Map(
    provinces.map((province) => [province.id, province])
  )

  return ports
    .map((port) => {
      const province =
        port.provinceId == null ? undefined : provinceMap.get(port.provinceId)
      return {
        ...port,
        area: getAreaLabel(port.provinceArea ?? province?.area ?? null),
        provinceName:
          port.provinceName ??
          province?.displayName ??
          province?.name ??
          'UNKNOWN',
      }
    })
    .sort((first, second) => {
      const firstUnknown =
        first.area === 'UNKNOWN' || first.provinceName === 'UNKNOWN'
      const secondUnknown =
        second.area === 'UNKNOWN' || second.provinceName === 'UNKNOWN'
      if (firstUnknown !== secondUnknown) return firstUnknown ? 1 : -1

      const firstIsVietnam = first.countryCode?.trim().toUpperCase() === 'VN'
      const secondIsVietnam = second.countryCode?.trim().toUpperCase() === 'VN'
      if (firstIsVietnam !== secondIsVietnam) return firstIsVietnam ? -1 : 1

      return first.name.localeCompare(second.name)
    })
}

export function buildPortTableTitle({
  search,
  searchFieldLabel,
  shownCount,
  totalCount,
}: {
  search: string
  searchFieldLabel: string
  shownCount: number
  totalCount: number
}): string {
  const totalLabel = `${totalCount} entr${totalCount === 1 ? 'y' : 'ies'}`
  const hasHiddenResults = totalCount > shownCount

  if (search.trim()) {
    const matches = `${totalCount} match${totalCount === 1 ? '' : 'es'}`
    return hasHiddenResults
      ? `${searchFieldLabel} — ${matches} (showing ${shownCount}, refine search)`
      : `${searchFieldLabel} — ${matches}`
  }

  return hasHiddenResults
    ? `${totalLabel} — search to find one (showing ${shownCount})`
    : totalLabel
}
