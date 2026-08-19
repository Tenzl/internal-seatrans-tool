import type { CommodityType } from '@/modules/gallery/services/commodityService'
import { describe, expect, it } from 'vitest'
import {
  buildCanonicalCargoAgencyRates,
  canonicalizeCargoAgencyRates,
} from './cargoAgencyRateRules'

describe('buildCanonicalCargoAgencyRates', () => {
  it('writes only ID-based rates and strips legacy code rows', () => {
    const result = buildCanonicalCargoAgencyRates(
      [
        { id: 11, serviceTypeId: 1, name: 'Bulk cargo' },
        { id: 12, serviceTypeId: 1, name: 'Bag/Pack' },
      ] as CommodityType[],
      [
        { code: 'IN_BULK', label: 'Legacy bulk', rate: 0.05 },
        {
          commodityTypeId: 12,
          typeNameSnapshot: 'Old bag name',
          label: 'Bag tariff',
          rate: 0.06,
        },
      ],
      11,
      0.08
    )

    expect(result).toEqual([
      {
        commodityTypeId: 11,
        typeNameSnapshot: 'Bulk cargo',
        label: 'Bulk cargo',
        rate: 0.08,
      },
      {
        commodityTypeId: 12,
        typeNameSnapshot: 'Old bag name',
        label: 'Bag tariff',
        rate: 0.06,
      },
    ])
    expect(JSON.stringify(result)).not.toContain('"code"')
  })

  it('strips legacy code rows even when an unrelated parameter save occurs', () => {
    const result = canonicalizeCargoAgencyRates(
      [{ id: 11, serviceTypeId: 1, name: 'Bulk cargo' }] as CommodityType[],
      [{ code: 'IN_BULK', label: 'Legacy bulk', rate: 0.05 }]
    )

    expect(result).toEqual([
      {
        commodityTypeId: 11,
        typeNameSnapshot: 'Bulk cargo',
        label: 'Bulk cargo',
        rate: 0,
      },
    ])
    expect(JSON.stringify(result)).not.toContain('"code"')
  })
})
