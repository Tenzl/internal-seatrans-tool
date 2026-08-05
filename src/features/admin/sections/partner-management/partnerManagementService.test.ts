import { describe, expect, it } from 'vitest'
import {
  buildPartnerListQuery,
  buildPartnerOptionsQuery,
} from './partnerManagementService'

describe('partner management list query', () => {
  it('serializes paginated Party search filters for the existing endpoint', () => {
    const query = new URLSearchParams(
      buildPartnerListQuery({
        page: 3,
        size: 10,
        sort: 'name,asc',
        q: '  apex  ',
        additionTypes: ['SHIPPER'],
      })
    )

    expect(query.get('page')).toBe('3')
    expect(query.get('size')).toBe('10')
    expect(query.get('sort')).toBe('name,asc')
    expect(query.get('q')).toBe('apex')
    expect(query.getAll('additionTypes')).toEqual(['SHIPPER'])
    expect(query.get('additionTypesMode')).toBe('OR')
    expect(query.get('includeArchived')).toBe('false')
  })

  it('filters Agent options by customer type and limits every page to 10', () => {
    const query = new URLSearchParams(
      buildPartnerOptionsQuery({
        page: 2,
        q: '  international  ',
        customerType: 'AGENT',
      })
    )

    expect(query.get('page')).toBe('2')
    expect(query.get('limit')).toBe('10')
    expect(query.get('q')).toBe('international')
    expect(query.get('customerType')).toBe('AGENT')
    expect(query.has('additionType')).toBe(false)
  })

  it('filters Party options by the requested addition tag', () => {
    const query = new URLSearchParams(
      buildPartnerOptionsQuery({ page: 0, additionType: 'CONSIGNEE' })
    )

    expect(query.get('additionType')).toBe('CONSIGNEE')
    expect(query.has('customerType')).toBe(false)
  })
})
