import {
  formatCommodityInGroupLabel,
  type Commodity,
  type CommodityAdminServiceSlug,
  type CommodityGroup,
  type CreateGroupedCommodityInput,
} from '@/modules/gallery/services/commodityService'
import { getErrorStatus } from '@/shared/utils/apiClient'

export interface CommodityServiceTab {
  slug: CommodityAdminServiceSlug
  label: string
}

/** Admin commodities page only exposes these two service scopes. */
export const COMMODITY_SERVICE_TABS: CommodityServiceTab[] = [
  { slug: 'shipping-agency', label: 'Shipping Agency' },
  { slug: 'freight-forwarding', label: 'Freight Forwarding' },
]

export const DEFAULT_SERVICE_SLUG: CommodityAdminServiceSlug = 'shipping-agency'
export const DEFAULT_REQUIRED_IMAGE_COUNT = 18

export interface CommodityEditData {
  displayName: string
  requiredImageCount: number
}

export const EMPTY_COMMODITY_EDIT: CommodityEditData = {
  displayName: '',
  requiredImageCount: DEFAULT_REQUIRED_IMAGE_COUNT,
}

export function sanitizeGroups(
  data: (CommodityGroup | null | undefined)[] | null | undefined
): CommodityGroup[] {
  return Array.isArray(data)
    ? data.filter((item): item is CommodityGroup => Boolean(item))
    : []
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

/**
 * Map a group label back to the fixed shipping-agency cargo-type codes when
 * possible (backfill names like "IN BULK"). Otherwise default IN_BULK so
 * freight-forwarding groups still satisfy BE cargo-type validation.
 */
export function inferCargoTypeFromGroupName(groupName: string): string {
  const key = groupName.trim().toUpperCase().replace(/[\s-]+/g, '_')
  if (key === 'IN_BULK' || key === 'BULK') return 'IN_BULK'
  if (key === 'IN_EQUIPMENT' || key === 'EQUIPMENT') return 'IN_EQUIPMENT'
  if (
    key === 'IN_BAG_PACK' ||
    key === 'IN_BAGS' ||
    key === 'BAG_PACK' ||
    key === 'BAGPACK'
  ) {
    return 'IN_BAG_PACK'
  }
  return 'IN_BULK'
}

export function buildGroupedCommodityInput(
  displayName: string,
  options?: { requiredImageCount?: number; cargoType?: string }
): CreateGroupedCommodityInput {
  const trimmed = displayName.trim()
  return {
    name: deriveCommodityName(trimmed),
    displayName: trimmed,
    requiredImageCount:
      options?.requiredImageCount ?? DEFAULT_REQUIRED_IMAGE_COUNT,
    cargoType: options?.cargoType ?? 'IN_BULK',
  }
}

export function commodityDisplayLabel(commodity: Commodity): string {
  if (commodity.displayLabel?.trim()) return commodity.displayLabel.trim()
  return formatCommodityInGroupLabel(
    commodity.displayName || commodity.name,
    commodity.groupName ?? ''
  )
}

export function validateCreateGroupForm(input: {
  groupName: string
  commodityNames: string[]
}): string | null {
  if (!input.groupName.trim()) return 'Group name is required'
  const names = input.commodityNames.map((name) => name.trim()).filter(Boolean)
  if (names.length === 0) {
    return 'Create group requires at least one commodity'
  }
  const seen = new Set<string>()
  for (const name of names) {
    const key = deriveCommodityName(name)
    if (seen.has(key)) {
      return `Duplicate commodity "${name}" in create request`
    }
    seen.add(key)
  }
  return null
}

export function validateAddCommoditiesForm(commodityNames: string[]): string | null {
  const names = commodityNames.map((name) => name.trim()).filter(Boolean)
  if (names.length === 0) return 'Add at least one commodity'
  const seen = new Set<string>()
  for (const name of names) {
    const key = deriveCommodityName(name)
    if (seen.has(key)) {
      return `Duplicate commodity "${name}"`
    }
    seen.add(key)
  }
  return null
}

export function getCommodityDeleteError(error: unknown) {
  if (!(error instanceof Error)) return 'Failed to delete commodity'
  const status = getErrorStatus(error)
  const message = error.message.trim()
  if (
    status === 409 ||
    /in use|đang được sử dụng|constraint|foreign key|23503/i.test(message)
  ) {
    if (/in use|đang được sử dụng/i.test(message)) return message
    return 'Commodity is currently in use / đang được sử dụng'
  }
  if (!message || message === 'Request failed') {
    return 'Failed to delete commodity'
  }
  return message
}

export function getGroupDeleteError(error: unknown) {
  if (!(error instanceof Error)) return 'Failed to delete commodity group'
  const status = getErrorStatus(error)
  const message = error.message.trim()
  if (
    status === 409 ||
    /in use|đang được sử dụng|constraint|foreign key|23503/i.test(message)
  ) {
    if (message && message !== 'Request failed') return message
    return 'Commodity group cannot be deleted because one or more commodities are in use / nhóm đang được sử dụng'
  }
  if (!message || message === 'Request failed') {
    return 'Failed to delete commodity group'
  }
  return message
}

export function getMutationError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback
  const message = error.message.trim()
  if (!message || message === 'Request failed') return fallback
  return message
}
