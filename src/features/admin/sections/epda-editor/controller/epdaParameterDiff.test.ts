import { describe, expect, it } from 'vitest'
import { defaultParameterValues } from '@/modules/inquiries/components/common/quoteParameters'
import {
  diffEpdaParameterValues,
  epdaParameterValuesEqual,
  extractWorkingParams,
} from './epdaParameterDiff'

describe('epdaParameterDiff', () => {
  it('reports scalar coeff and hours diffs', () => {
    const current = defaultParameterValues('HCM')
    const latest = {
      ...current,
      hours: { ...current.hours, berthHours: 120 },
      coeff: { ...current.coeff, clearanceFee: 75 },
    }

    const rows = diffEpdaParameterValues(current, latest)
    expect(rows).toEqual(
      expect.arrayContaining([
        {
          path: 'hours.berthHours',
          current: '96',
          latest: '120',
        },
        {
          path: 'coeff.clearanceFee',
          current: '50',
          latest: '75',
        },
      ])
    )
  })

  it('reports tier amount diffs', () => {
    const current = defaultParameterValues('HCM')
    const latest = {
      ...current,
      agencyFeeTiers: current.agencyFeeTiers.map((tier, index) =>
        index === 0 ? { ...tier, amount: 999 } : tier
      ),
    }

    const rows = diffEpdaParameterValues(current, latest)
    expect(rows.some((row) => row.path.startsWith('agencyFeeTiers'))).toBe(
      true
    )
  })

  it('treats normalized equal values as equal', () => {
    const base = defaultParameterValues('QN')
    expect(epdaParameterValuesEqual(base, { ...base })).toBe(true)
    expect(
      epdaParameterValuesEqual(base, {
        ...base,
        hours: { ...base.hours, qnPilotageMiles: 9 },
      })
    ).toBe(false)
  })

  it('extracts valid working params and rejects malformed blobs', () => {
    const params = defaultParameterValues('HCM')
    expect(extractWorkingParams(params)?.hours.berthHours).toBe(96)
    expect(extractWorkingParams({ hours: { berthHours: 1 } })).toBeNull()
    expect(extractWorkingParams(null)).toBeNull()
  })
})
