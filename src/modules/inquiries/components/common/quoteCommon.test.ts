import { describe, expect, it } from 'vitest'
import { resolveQuoteTotals } from './quoteCommon'

describe('resolveQuoteTotals', () => {
  it('renders an exact zero grand total instead of treating it as missing', () => {
    expect(resolveQuoteTotals('0.00', '0.00')).toEqual({
      totalA: '0.00',
      totalB: '0.00',
      grandTotal: '0.00',
    })
  })
})
