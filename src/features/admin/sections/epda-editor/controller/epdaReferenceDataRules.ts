import type {
  CargoType,
  Commodity,
} from '@/modules/gallery/services/commodityService'
import { legacyCargoTypeToCode } from '@/modules/gallery/shippingAgencyCargoCatalog'
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
  cargoType: CargoType | '',
  selectedCargoName: string
) {
  if (!cargoType) return []
  const matching = catalog.filter(
    (item) => legacyCargoTypeToCode(item.cargoType) === cargoType
  )
  if (
    selectedCargoName &&
    !matching.some((item) => item.name === selectedCargoName)
  ) {
    return [
      {
        id: 0,
        name: selectedCargoName,
        displayName: selectedCargoName,
        serviceTypeId: 0,
        requiredImageCount: 0,
        cargoType,
      },
      ...matching,
    ]
  }
  return matching
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
