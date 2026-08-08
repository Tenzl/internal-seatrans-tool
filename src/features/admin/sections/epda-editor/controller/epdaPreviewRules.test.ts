import { describe, expect, it } from 'vitest'
import {
  buildEpdaExportFileName,
  shouldRefreshPreviewParameters,
} from './epdaPreviewRules'

describe('epdaPreviewRules', () => {
  it('uses the inquiry id for a linked EPDA export', () => {
    expect(
      buildEpdaExportFileName({
        inquiryId: 42,
        quoteForm: 'QN',
        date: new Date('2026-07-30T00:00:00.000Z'),
      })
    ).toBe('EPDA_inquiry_42.html')
  })

  it('uses quote form and date for a new EPDA export', () => {
    expect(
      buildEpdaExportFileName({
        quoteForm: 'HCM',
        date: new Date('2026-07-30T23:59:59.000Z'),
      })
    ).toBe('EPDA_HCM_2026-07-30.html')
  })

  it('never silently refreshes live parameters for preview (Apply/Skip owns linked drafts)', () => {
    expect(
      shouldRefreshPreviewParameters({
        isLocked: false,
        hasFrozenParams: false,
        hasSelectedArea: true,
      })
    ).toBe(false)

    expect(
      shouldRefreshPreviewParameters({
        isLocked: true,
        hasFrozenParams: false,
        hasSelectedArea: true,
      })
    ).toBe(false)
    expect(
      shouldRefreshPreviewParameters({
        isLocked: false,
        hasFrozenParams: true,
        hasSelectedArea: true,
      })
    ).toBe(false)
  })
})
