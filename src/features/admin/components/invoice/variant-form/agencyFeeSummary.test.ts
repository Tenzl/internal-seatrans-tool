import { defaultParameterValues } from '@/modules/inquiries/components/common/quoteParameters'
import { describe, expect, it } from 'vitest'
import { calculateAgencyFeeSummary } from './agencyFeeSummary'

const params = {
  ...defaultParameterValues('HCM'),
  cargoAgencyRates: [{ code: 'IN_BULK', rate: 0.06, label: 'Bulk' }],
}

describe('calculateAgencyFeeSummary', () => {
  it('uses configured GRT tiers and cargo rates', () => {
    const result = calculateAgencyFeeSummary(
      {
        grt: '3000',
        cargoQty: '2500',
        cargoType: 'IN_BULK',
        discountPercent: '10',
      },
      params
    )

    expect(result.grtBand).toMatchObject({ amount: 500 })
    expect(result.cargoRate).toBe(0.06)
    expect(result.cargoBaseAmount).toBe(150)
    expect(result.payablePercent).toBe(90)
  })

  it('normalizes invalid quantities and clamps discounts', () => {
    const invalid = calculateAgencyFeeSummary(
      {
        grt: 'not-a-number',
        cargoQty: '-5',
        cargoType: '',
        discountPercent: '150',
      },
      params
    )
    const negativeDiscount = calculateAgencyFeeSummary(
      {
        grt: '',
        cargoQty: '',
        cargoType: '',
        discountPercent: '-20',
      },
      params
    )

    expect(invalid).toMatchObject({
      grtBand: { amount: 0, label: '0 - 1,000' },
      cargoQty: 0,
      cargoBaseAmount: 0,
      discountPercent: 100,
      payablePercent: 0,
    })
    expect(negativeDiscount.discountPercent).toBe(0)
    expect(negativeDiscount.payablePercent).toBe(100)
  })
})
