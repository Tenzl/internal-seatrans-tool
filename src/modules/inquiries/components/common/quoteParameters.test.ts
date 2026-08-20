import { describe, expect, it } from 'vitest'
import {
  defaultParameterValues,
  mergeParameterValues,
  resolveCargoAgencyRate,
  resolveGrtTier,
  resolveLoaTier,
  sanitizePartialParameterValues,
} from './quoteParameters'

describe('mergeParameterValues numeric safety', () => {
  it('keeps the baseline decimal when a partial override contains null', () => {
    const base = defaultParameterValues('QN')

    const result = mergeParameterValues(base, {
      coeff: {
        tonnagePerGrt: null as unknown as number,
      },
    })

    expect(result.coeff.tonnagePerGrt).toBe(base.coeff.tonnagePerGrt)
  })

  it('keeps displayed finite numbers while removing unrelated stale fields', () => {
    expect(
      sanitizePartialParameterValues({
        hours: { berthHours: Number.NaN },
        garbage: {
          atBuoyUsd: 54,
          cbmAmount: 1,
        } as unknown as { atBuoyUsd: number },
      })
    ).toEqual({
      garbage: { atBuoyUsd: 54 },
    })
  })
})

describe('resolveCargoAgencyRate ID contract', () => {
  it('resolves by commodityTypeId and remains stable after a Type rename', () => {
    const params = defaultParameterValues('HCM')
    params.cargoAgencyRates = [
      { commodityTypeId: 11, typeNameSnapshot: 'Old bulk name', rate: 0.08 },
    ]

    expect(resolveCargoAgencyRate(11, 'Renamed bulk', params)).toBe(0.08)
  })

  it('does not infer or fall back by name/code when an authoritative id exists', () => {
    const params = defaultParameterValues('HCM')
    params.cargoAgencyRates = [
      { commodityTypeId: 12, typeNameSnapshot: 'Bulk cargo', rate: 0.08 },
      { code: 'IN_BULK', label: 'Legacy bulk', rate: 0.05 },
    ]

    expect(resolveCargoAgencyRate(11, 'IN_BULK', params)).toBe(0)
  })

  it('uses code only as a read fallback for a legacy inquiry without an id', () => {
    const params = defaultParameterValues('HCM')
    params.cargoAgencyRates = [
      { code: 'IN_BULK', label: 'Legacy bulk', rate: 0.05 },
    ]

    expect(resolveCargoAgencyRate(null, 'IN_BULK', params)).toBe(0.05)
    expect(resolveCargoAgencyRate(null, 'Custom type', params)).toBe(0)
    expect(resolveCargoAgencyRate(null, '', params)).toBeUndefined()
  })
})

describe('EPDA tariff tier boundaries', () => {
  it('selects the first GRT ceiling inclusively even when rows are unsorted', () => {
    const tiers = [
      { label: 'Above 5,000', maxGrt: null, amount: 700 },
      { label: 'Up to 1,000', maxGrt: 1_000, amount: 300 },
      { label: '1,001 - 5,000', maxGrt: 5_000, amount: 500 },
    ]

    expect(resolveGrtTier(1_000, tiers)).toMatchObject({ amount: 300 })
    expect(resolveGrtTier(1_001, tiers)).toMatchObject({ amount: 500 })
    expect(resolveGrtTier(5_001, tiers)).toMatchObject({ amount: 700 })
  })

  it('selects the highest matching LOA lower bound regardless of row order', () => {
    const tiers = [
      { label: '150m+', minLoa: 150, amount: 900 },
      { label: '0m+', minLoa: 0, amount: 300 },
      { label: '100m+', minLoa: 100, amount: 600 },
    ]

    expect(resolveLoaTier(149.999, tiers)).toMatchObject({ amount: 600 })
    expect(resolveLoaTier(150, tiers)).toMatchObject({ amount: 900 })
  })
})
