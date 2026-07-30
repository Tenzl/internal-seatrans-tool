import { describe, expect, it } from 'vitest'
import {
  defaultParameterValues,
  mergeParameterValues,
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
