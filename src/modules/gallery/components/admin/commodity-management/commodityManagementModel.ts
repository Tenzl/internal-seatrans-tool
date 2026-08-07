import type {
  CargoType,
  Commodity,
  CreateCommodityRequest,
} from '@/modules/gallery/services/commodityService'
import { SHIPPING_AGENCY_CARGO_TYPES } from '@/modules/gallery/shippingAgencyCargoCatalog'

export interface CargoTypeOption {
  id: string
  value: CargoType
  label: string
}

/** Shipping agency supports exactly these three cargo types. */
export const FIXED_CARGO_TYPE_OPTIONS: CargoTypeOption[] =
  SHIPPING_AGENCY_CARGO_TYPES.map((type) => ({
    id: type.code,
    value: type.code,
    label: type.displayLabel,
  }))

export const DEFAULT_CARGO_TYPE: CargoType = 'IN_BULK'
export const DEFAULT_REQUIRED_IMAGE_COUNT = 18

export interface CommodityEditData {
  displayName: string
  requiredImageCount: number
}

export const EMPTY_COMMODITY_EDIT: CommodityEditData = {
  displayName: '',
  requiredImageCount: DEFAULT_REQUIRED_IMAGE_COUNT,
}

export function sanitizeCommodities(
  data: (Commodity | null | undefined)[] | null | undefined
): Commodity[] {
  return Array.isArray(data)
    ? data.filter((item): item is Commodity => Boolean(item))
    : []
}

export function deriveCommodityName(displayName: string) {
  return displayName.trim().replace(/\s+/g, '_').toUpperCase()
}

export function parseRequiredImageCount(value: string) {
  return Number.parseInt(value) || DEFAULT_REQUIRED_IMAGE_COUNT
}

export function isFixedCargoType(cargoType: CargoType) {
  return FIXED_CARGO_TYPE_OPTIONS.some((option) => option.value === cargoType)
}

export function getCargoTypeLabel(cargoType: CargoType) {
  return (
    FIXED_CARGO_TYPE_OPTIONS.find((option) => option.value === cargoType)
      ?.label ?? cargoType
  )
}

export function filterCommoditiesByCargoType(
  commodities: Commodity[],
  cargoType: CargoType
) {
  // Unknown legacy cargo types stay in storage but never reappear in fixed tabs.
  return commodities.filter((commodity) => commodity.cargoType === cargoType)
}

export function countCommoditiesByCargoType(commodities: Commodity[]) {
  return FIXED_CARGO_TYPE_OPTIONS.reduce<Record<CargoType, number>>(
    (counts, option) => {
      counts[option.value] = commodities.filter(
        (commodity) => commodity.cargoType === option.value
      ).length
      return counts
    },
    {} as Record<CargoType, number>
  )
}

export function buildCommodityRequest({
  displayName,
  requiredImageCount,
  serviceTypeId,
  cargoType,
}: CommodityEditData & {
  serviceTypeId: number
  cargoType: CargoType
}): CreateCommodityRequest {
  return {
    name: deriveCommodityName(displayName),
    displayName: displayName.trim(),
    requiredImageCount,
    serviceTypeId,
    cargoType,
  }
}

export function getCommodityDeleteError(error: unknown) {
  if (!(error instanceof Error)) return 'Failed to delete commodity'
  const message = error.message.trim()
  if (!message || message === 'Request failed') {
    return 'Failed to delete commodity'
  }
  if (/constraint|foreign key|23503/i.test(message)) {
    return 'Commodity is currently in use / đang được sử dụng'
  }
  return message
}

/** Prefer the API conflict message so duplicate name clashes are clear. */
export function getCommodityMutationError(
  error: unknown,
  fallback: string
): string {
  if (!(error instanceof Error)) return fallback
  const message = error.message.trim()
  if (!message || message === 'Request failed') return fallback
  return message
}
