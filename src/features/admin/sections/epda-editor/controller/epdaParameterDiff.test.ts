import { describe, expect, it } from 'vitest'
import { createEpdaParameterLabelFns } from '@/features/admin/epda-parameters/epdaParameterLabels'
import { defaultParameterValues } from '@/modules/inquiries/components/common/quoteParameters'
import { messages } from '@/shared/i18n/messages'
import {
  diffEpdaParameterValues,
  epdaParameterValuesEqual,
  extractWorkingParams,
} from './epdaParameterDiff'

const labels = createEpdaParameterLabelFns(
  (key) => (messages.en as Record<string, string>)[key] ?? key
)

describe('epdaParameterDiff', () => {
  it('reports scalar coeff and hours diffs with labels', () => {
    const current = defaultParameterValues('HCM')
    const latest = {
      ...current,
      hours: { ...current.hours, berthHours: 120 },
      coeff: { ...current.coeff, clearanceFee: 75 },
    }

    const rows = diffEpdaParameterValues(current, latest, labels)
    expect(rows).toEqual(
      expect.arrayContaining([
        {
          path: 'hours.berthHours',
          label: labels.fieldLabel('hours', 'berthHours'),
          current: '96',
          latest: '120',
        },
        {
          path: 'coeff.clearanceFee',
          label: labels.fieldLabel('coeff', 'clearanceFee'),
          current: '50',
          latest: '75',
        },
      ])
    )
  })

  it('reports agency tier amount diffs as amount-only rows', () => {
    const current = defaultParameterValues('HCM')
    const first = current.agencyFeeTiers[0]
    const latest = {
      ...current,
      agencyFeeTiers: current.agencyFeeTiers.map((tier, index) =>
        index === 0 ? { ...tier, amount: 999 } : tier
      ),
    }

    const rows = diffEpdaParameterValues(current, latest, labels)
    const agencyRows = rows.filter((row) =>
      row.path.startsWith('agencyFeeTiers')
    )

    expect(agencyRows).toHaveLength(1)
    expect(agencyRows[0]).toEqual({
      path: 'agencyFeeTiers[0].amount',
      label: `${labels.sectionLabel('agencyFeeTiers')} · ${first.label}`,
      current: String(first.amount),
      latest: '999',
    })
    expect(agencyRows[0].current).not.toContain('{')
    expect(agencyRows[0].latest).not.toContain('{')
  })

  it('skips unchanged tiers', () => {
    const current = defaultParameterValues('HCM')
    const latest = {
      ...current,
      hours: { ...current.hours, berthHours: 120 },
    }

    const rows = diffEpdaParameterValues(current, latest, labels)
    expect(rows.every((row) => !row.path.startsWith('agencyFeeTiers'))).toBe(
      true
    )
    expect(rows.every((row) => !row.path.startsWith('moorUnmoor'))).toBe(true)
    expect(rows.every((row) => !row.path.startsWith('tugTiers'))).toBe(true)
  })

  it('treats normalized equal values as equal', () => {
    const base = defaultParameterValues('QN')
    expect(epdaParameterValuesEqual(base, { ...base })).toBe(true)
    expect(
      epdaParameterValuesEqual(base, {
        ...base,
        hours: { ...base.hours, berthHours: 120 },
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
