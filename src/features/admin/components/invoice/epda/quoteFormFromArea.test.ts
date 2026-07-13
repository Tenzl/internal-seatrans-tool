import { describe, expect, it } from 'vitest'
import { EPDA_VARIANT_CONFIG, getEpdaVariantConfig } from './quoteFormFromArea'

describe('EPDA variant strategy', () => {
  it('keeps area, worksheet layout, pilotage formula and numbering policy explicit', () => {
    expect(EPDA_VARIANT_CONFIG).toEqual({
      HN: expect.objectContaining({ area: '1', chargeLayout: 'HCM', pilotageMode: 'SINGLE_RATE', reindexRows: true }),
      QN: expect.objectContaining({ area: '2', chargeLayout: 'QN', pilotageMode: 'SINGLE_RATE', reindexRows: false }),
      HCM: expect.objectContaining({ area: '3', chargeLayout: 'HCM', pilotageMode: 'THREE_LEG', reindexRows: true }),
    })
    expect(getEpdaVariantConfig('HN').defaultPilotageMiles).toBe(5)
    expect(getEpdaVariantConfig('HCM').defaultPilotageMiles).toBe(47)
  })
})
