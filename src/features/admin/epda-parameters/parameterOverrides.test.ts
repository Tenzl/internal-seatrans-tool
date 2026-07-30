import { defaultParameterValues } from '@/modules/inquiries/components/common/quoteParameters'
import { describe, expect, it } from 'vitest'
import {
  cloneParameterValues,
  diffParameterValues,
  getOverrideSectionLabels,
} from './parameterOverrides'

describe('EPDA parameter override helpers', () => {
  it('keeps an empty override empty', () => {
    const baseline = defaultParameterValues('HCM')
    expect(diffParameterValues(baseline, cloneParameterValues(baseline))).toEqual({})
  })

  it('returns only changed nested values and arrays', () => {
    const baseline = defaultParameterValues('HCM')
    const edited = cloneParameterValues(baseline)
    edited.coeff.pilotageMinAmount += 100
    edited.tugTiers[0] = { ...edited.tugTiers[0], amount: 999 }

    expect(diffParameterValues(baseline, edited)).toEqual({
      coeff: { pilotageMinAmount: edited.coeff.pilotageMinAmount },
      tugTiers: edited.tugTiers,
    })
  })

  it('deduplicates visible override section labels', () => {
    const t = (key: string) => key
    expect(
      getOverrideSectionLabels(t, {
        coeff: { pilotageMinAmount: 700, clearanceFee: 150 },
        garbage: { atBuoyUsd: 54 },
      }),
    ).toEqual(['sec.pilotage.title', 'sec.garbage.title'])
  })
})
