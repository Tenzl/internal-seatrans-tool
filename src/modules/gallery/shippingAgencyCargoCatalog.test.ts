import { describe, expect, it } from 'vitest'
import type { Commodity } from './services/commodityService'
import {
  isTallyFeeEligibleCargoType,
  readInquiryCargoForEpda,
} from './shippingAgencyCargoCatalog'

describe('readInquiryCargoForEpda', () => {
  it('preserves the authoritative Type id and the stored Type-name snapshot', () => {
    expect(
      readInquiryCargoForEpda(
        {
          commodityTypeId: 11,
          cargoType: 'IN_BULK',
          cargoName: 'Coal',
        },
        [{ id: 21, name: 'Coal', displayName: 'Coal' }] as Commodity[]
      )
    ).toEqual({
      commodityTypeId: 11,
      cargoType: 'IN_BULK',
      cargoName: 'Coal',
    })
  })

  it('keeps an unmatched legacy snapshot without inventing a Type id', () => {
    expect(
      readInquiryCargoForEpda(
        {
          cargoType: 'Legacy project',
          cargoName: 'OTHER',
          cargoNameOther: 'Ore',
        },
        []
      )
    ).toEqual({
      commodityTypeId: null,
      cargoType: 'Legacy project',
      cargoName: 'Ore',
    })
  })

  it('keeps Bag/Pack tally eligibility after Type values become names', () => {
    expect(isTallyFeeEligibleCargoType('Bag/Pack')).toBe(true)
  })
})
