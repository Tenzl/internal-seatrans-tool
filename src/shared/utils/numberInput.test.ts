import { describe, expect, it } from 'vitest'
import { formatNumberInputValue, parseNumberInputDraft } from './numberInput'

describe('number input utilities', () => {
  it('groups thousands while preserving an in-progress decimal', () => {
    expect(parseNumberInputDraft('1234567.')).toEqual({
      canonical: '1234567.',
      formatted: '1,234,567.',
      value: 1_234_567,
    })
  })

  it('allows at most three decimal places', () => {
    expect(parseNumberInputDraft('1,234.567')?.value).toBe(1234.567)
    expect(parseNumberInputDraft('1,234.5678')).toBeNull()
  })

  it('rejects negative and non-numeric input', () => {
    expect(parseNumberInputDraft('-1')).toBeNull()
    expect(parseNumberInputDraft('12 KGS')).toBeNull()
  })

  it('supports integer-only and bounded fields', () => {
    expect(parseNumberInputDraft('12.5', { decimalScale: 0 })).toBeNull()
    expect(parseNumberInputDraft('101', { max: 100 })).toBeNull()
    expect(parseNumberInputDraft('0', { min: 1 })).toBeNull()
  })

  it('formats external values with grouping and up to three decimals', () => {
    expect(formatNumberInputValue(1_234_567.125)).toBe('1,234,567.125')
    expect(formatNumberInputValue('1234.50')).toBe('1,234.50')
    expect(formatNumberInputValue('0.0034')).toBe('0.003')
  })
})
