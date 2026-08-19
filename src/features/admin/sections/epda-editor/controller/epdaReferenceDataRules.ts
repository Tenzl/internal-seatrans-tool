import type {
  CargoType,
  Commodity,
  CommodityType,
} from '@/modules/gallery/services/commodityService'
import {
  legacyCargoTypeToCode,
  type EpdaCargoTypeOption,
} from '@/modules/gallery/shippingAgencyCargoCatalog'
import type { Port as LogisticsPort } from '@/modules/logistics/services/portService'

export function findShippingAgencyServiceTypeId(
  serviceTypes: Array<{ id?: number; name?: string | null }>
) {
  return serviceTypes.find((service) => {
    const normalized = (service.name || '')
      .toUpperCase()
      .replace(/[\s-]+/g, '_')
    return normalized === 'SHIPPING_AGENCY'
  })?.id
}

export function buildPortOptions(ports: LogisticsPort[]) {
  const sorted = ports
    .filter((port) => port.portOfCall?.trim())
    .sort((left, right) =>
      (left.portOfCall || '').localeCompare(right.portOfCall || '')
    )
  const seen = new Set<string>()
  return sorted.filter((port) => {
    const value = port.portOfCall as string
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

export function buildCargoNameOptions(
  catalog: Commodity[],
  selectedCargoName: string
) {
  if (
    selectedCargoName &&
    !catalog.some((item) => item.name === selectedCargoName)
  ) {
    return [
      {
        id: 0,
        name: selectedCargoName,
        displayName: selectedCargoName,
        serviceTypeId: 0,
        requiredImageCount: 0,
        cargoType: '',
      },
      ...catalog,
    ]
  }
  return catalog
}

export function buildCargoTypeOptions(
  catalog: CommodityType[],
  selectedCargoType: CargoType | '',
  selectedCommodityTypeId: number | null
): EpdaCargoTypeOption[] {
  const options = catalog.map((item) => ({
    id: item.id,
    value: String(item.id),
    label: item.name,
    nameSnapshot: item.name,
  }))
  if (selectedCommodityTypeId) {
    if (options.some((item) => item.id === selectedCommodityTypeId)) {
      return options
    }
    const snapshot = selectedCargoType.trim()
    if (!snapshot) return options
    return [
      {
        id: selectedCommodityTypeId,
        value: String(selectedCommodityTypeId),
        label: snapshot,
        nameSnapshot: snapshot,
      },
      ...options,
    ]
  }

  const legacyCode = legacyCargoTypeToCode(selectedCargoType)
  if (legacyCode) {
    const snapshot = selectedCargoType.trim() || legacyCode
    return [
      {
        id: null,
        value: `legacy:${legacyCode}`,
        label: snapshot,
        nameSnapshot: snapshot,
        legacyCode,
      },
      ...options,
    ]
  }
  return options
}

export function resolveEpdaTypeSnapshot(
  catalog: CommodityType[],
  commodityTypeId: number | null,
  storedSnapshot: string
) {
  if (!commodityTypeId) return storedSnapshot
  return (
    catalog.find((item) => item.id === commodityTypeId)?.name ?? storedSnapshot
  )
}

export function resolveEpdaCatalogIds(
  commodityTypeId: number | null,
  commodities: Commodity[],
  cargoName: string
) {
  const selectedCommodity = commodities.find(
    (item) => item.name === cargoName || item.displayName === cargoName
  )
  return {
    commodityTypeId:
      commodityTypeId && commodityTypeId > 0 ? commodityTypeId : undefined,
    commodityId:
      selectedCommodity && selectedCommodity.id > 0
        ? selectedCommodity.id
        : undefined,
  }
}

export function resolveEpdaCargoTypeSelection(
  options: EpdaCargoTypeOption[],
  selectionValue: string
) {
  const selected = options.find((option) => option.value === selectionValue)
  if (!selected) return null
  return {
    commodityTypeId: selected.id,
    cargoType: selected.nameSnapshot,
    tallyEligibilityKey: selected.legacyCode ?? selected.nameSnapshot,
  }
}

export function resolveSelectedPortId({
  selectedPortId,
  portName,
  ports,
}: {
  selectedPortId: number | null
  portName: string
  ports: LogisticsPort[]
}) {
  if (selectedPortId) return selectedPortId
  const target = portName.trim().toLowerCase()
  if (!target) return undefined
  return ports.find((port) => {
    const call = port.portOfCall?.trim().toLowerCase() ?? ''
    const name = port.name?.trim().toLowerCase() ?? ''
    return call === target || name === target
  })?.id
}
