import { describe, expect, it } from 'vitest'
import {
  defaultParameterValues,
  mergeParameterValues,
  resolveCargoAgencyRate,
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
