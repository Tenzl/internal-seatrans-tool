import type { Commodity } from '@/modules/gallery/services/commodityService'
import { describe, expect, it } from 'vitest'
import {
  buildCommodityRequest,
  countCommoditiesByCargoType,
  deriveCommodityName,
  filterCommoditiesByCargoType,
  FIXED_CARGO_TYPE_OPTIONS,
  getCommodityDeleteError,
  parseRequiredImageCount,
  sanitizeCommodities,
} from './commodityManagementModel'

const commodity = (id: number, cargoType: string): Commodity => ({
  id,
  name: `CARGO_${id}`,
  displayName: `Cargo ${id}`,
  serviceTypeId: 1,
  requiredImageCount: 18,
  cargoType,
  isActive: true,
})

describe('commodity management model', () => {
  it('exposes exactly the three shipping-agency cargo types', () => {
    expect(FIXED_CARGO_TYPE_OPTIONS.map((option) => option.value)).toEqual([
      'IN_BAG_PACK',
      'IN_EQUIPMENT',
      'IN_BULK',
    ])
  })

  it('keeps legacy junk outside fixed tabs and counts', () => {
    const rows = [
      commodity(1, 'IN_BULK'),
      commodity(2, 'IN_BULK'),
      commodity(3, 'BREAK_BULK'),
    ]

    expect(filterCommoditiesByCargoType(rows, 'IN_BULK')).toHaveLength(2)
    expect(countCommoditiesByCargoType(rows)).toMatchObject({
      IN_BAG_PACK: 0,
      IN_EQUIPMENT: 0,
      IN_BULK: 2,
    })
  })

  it('normalizes the stored code while preserving the trimmed display name', () => {
    expect(deriveCommodityName('  Wood   Chips ')).toBe('WOOD_CHIPS')
    expect(
      buildCommodityRequest({
        displayName: '  Wood   Chips ',
        requiredImageCount: 12,
        serviceTypeId: 7,
        cargoType: 'IN_BULK',
      })
    ).toEqual({
      name: 'WOOD_CHIPS',
      displayName: 'Wood   Chips',
      requiredImageCount: 12,
      serviceTypeId: 7,
      cargoType: 'IN_BULK',
    })
  })

  it('preserves the form fallback for an empty required-count input', () => {
    expect(parseRequiredImageCount('')).toBe(18)
    expect(parseRequiredImageCount('5')).toBe(5)
    expect(sanitizeCommodities([commodity(1, 'IN_BULK'), null])).toHaveLength(1)
  })

  it('explains foreign-key delete failures', () => {
    expect(getCommodityDeleteError(new Error('foreign key constraint'))).toBe(
      'Cannot delete this cargo type because images are using it. Remove those images first.'
    )
    expect(getCommodityDeleteError(new Error('offline'))).toBe(
      'Failed to delete cargo type'
    )
  })
})
