import { describe, expect, it } from 'vitest'
import { parseDecimalText } from './decimalInputUtils'

describe('parseDecimalText', () => {
  it('accepts decimal values', () => {
    expect(parseDecimalText('0.0034')).toBe(0.0034)
  })

  it('keeps intermediate decimal input editable', () => {
    expect(parseDecimalText('0.')).toBe(0)
    expect(parseDecimalText('.')).toBe(0)
  })

  it('rejects non-numeric text', () => {
    expect(parseDecimalText('54 USD')).toBeNull()
  })
})
