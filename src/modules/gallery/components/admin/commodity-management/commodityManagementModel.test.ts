import type { Commodity } from '@/modules/gallery/services/commodityService'
import { describe, expect, it } from 'vitest'
import {
  buildGroupedCommodityInput,
  COMMODITY_SERVICE_TABS,
  commodityDisplayLabel,
  deriveCommodityName,
  getCommodityDeleteError,
  getGroupDeleteError,
  inferCargoTypeFromGroupName,
  parseRequiredImageCount,
  sanitizeGroups,
  validateAddCommoditiesForm,
  validateCreateGroupForm,
} from './commodityManagementModel'
import { ApiError } from '@/shared/utils/apiClient'

const commodity = (id: number, overrides?: Partial<Commodity>): Commodity => ({
  id,
  name: `CARGO_${id}`,
  displayName: `Cargo ${id}`,
  serviceTypeId: 1,
  requiredImageCount: 18,
  cargoType: 'IN_BULK',
  groupId: 1,
  groupName: 'Foodstuffs',
  ...overrides,
})

describe('commodity management model', () => {
  it('exposes only Shipping Agency and Freight Forwarding tabs', () => {
    expect(COMMODITY_SERVICE_TABS.map((tab) => tab.slug)).toEqual([
      'shipping-agency',
      'freight-forwarding',
    ])
  })

  it('requires at least one commodity when creating a group', () => {
    expect(
      validateCreateGroupForm({ groupName: 'Foodstuffs', commodityNames: [] })
    ).toMatch(/at least one commodity/i)
    expect(
      validateCreateGroupForm({
        groupName: 'Foodstuffs',
        commodityNames: ['', '  '],
      })
    ).toMatch(/at least one commodity/i)
    expect(
      validateCreateGroupForm({
        groupName: 'Foodstuffs',
        commodityNames: ['Rice'],
      })
    ).toBeNull()
  })

  it('formats booking / AN display as commodity IN group', () => {
    expect(commodityDisplayLabel(commodity(1, { displayName: 'Rice' }))).toBe(
      'Rice IN Foodstuffs'
    )
    expect(
      commodityDisplayLabel(
        commodity(2, {
          displayName: 'Rice',
          displayLabel: 'Rice IN Foodstuffs',
        })
      )
    ).toBe('Rice IN Foodstuffs')
  })

  it('infers shipping-agency cargo types from backfilled group names', () => {
    expect(inferCargoTypeFromGroupName('IN BULK')).toBe('IN_BULK')
    expect(inferCargoTypeFromGroupName('IN BAG PACK')).toBe('IN_BAG_PACK')
    expect(inferCargoTypeFromGroupName('Foodstuffs')).toBe('IN_BULK')
  })

  it('builds grouped commodity create payloads', () => {
    expect(deriveCommodityName('  Wood   Chips ')).toBe('WOOD_CHIPS')
    expect(buildGroupedCommodityInput('  Wood   Chips ', { cargoType: 'IN_BULK' })).toEqual({
      name: 'WOOD_CHIPS',
      displayName: 'Wood   Chips',
      requiredImageCount: 18,
      cargoType: 'IN_BULK',
    })
    expect(parseRequiredImageCount('')).toBe(18)
    expect(sanitizeGroups([null, { id: 1, serviceTypeId: 1, serviceSlug: 'shipping-agency', name: 'Bulk', commodities: [] }])).toHaveLength(1)
  })

  it('rejects empty add-commodities forms', () => {
    expect(validateAddCommoditiesForm(['', ' '])).toMatch(/at least one/i)
    expect(validateAddCommoditiesForm(['Rice', 'Beans'])).toBeNull()
  })

  it('surfaces API delete failures and maps 409 / FK errors', () => {
    expect(
      getCommodityDeleteError(
        new ApiError('Commodity is currently in use / đang được sử dụng', {
          status: 409,
        })
      )
    ).toBe('Commodity is currently in use / đang được sử dụng')
    expect(getCommodityDeleteError(new Error('foreign key constraint'))).toBe(
      'Commodity is currently in use / đang được sử dụng'
    )
    expect(getGroupDeleteError(new ApiError('group busy', { status: 409 }))).toBe(
      'group busy'
    )
    expect(getCommodityDeleteError({})).toBe('Failed to delete commodity')
  })
})
