import { describe, expect, it } from 'vitest'
import { API_CONFIG } from '@/shared/config/api.config'
import { toInquiryServiceSlug } from './inquiryService'

describe('toInquiryServiceSlug', () => {
  it('normalizes UI route aliases to backend batch-delete slugs', () => {
    expect(toInquiryServiceSlug('total-logistics')).toBe('total-logistic')
    expect(toInquiryServiceSlug('chartering-ship-broking')).toBe('chartering')
    expect(toInquiryServiceSlug('SHIPPING AGENCY')).toBe('shipping-agency')
  })

  it('does not pass unknown services through to destructive endpoints', () => {
    expect(toInquiryServiceSlug('unknown')).toBeUndefined()
  })

  it('always scopes customer batch deletion by canonical service slug', () => {
    expect(API_CONFIG.INQUIRIES.USER_BATCH_DELETE('total-logistic')).toBe(
      '/inquiries/batch?serviceSlug=total-logistic',
    )
  })
})
