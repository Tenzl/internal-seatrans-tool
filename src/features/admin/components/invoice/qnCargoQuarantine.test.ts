import { describe, expect, it } from 'vitest'
import { resolveQnCargoQuarantineMode } from './qnCargoQuarantine'

describe('resolveQnCargoQuarantineMode', () => {
  it('disables cargo quarantine with OTHER mode', () => {
    expect(resolveQnCargoQuarantineMode(false, 'NHAP_XUAT')).toBe('OTHER')
  })

  it('uses two trips for import and export', () => {
    expect(resolveQnCargoQuarantineMode(true, 'NHAP_XUAT')).toBe('BOTH_LEGS')
  })

  it('uses one trip for a single cargo leg', () => {
    expect(resolveQnCargoQuarantineMode(true, 'NHAP_CHUYEN_CANG')).toBe('ONE_LEG')
    expect(resolveQnCargoQuarantineMode(true, 'CHUYEN_CANG_XUAT')).toBe('ONE_LEG')
  })

  it('does not enable cargo quarantine for other purposes', () => {
    expect(resolveQnCargoQuarantineMode(true, 'MUC_DICH_KHAC')).toBe('OTHER')
  })
})
