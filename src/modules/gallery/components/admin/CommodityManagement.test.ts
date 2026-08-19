import { describe, expect, it } from 'vitest'
import { filterCommodityCatalogServices } from './commodity-management/commodityCatalogServices'

describe('filterCommodityCatalogServices', () => {
  it('shows only Shipping Agency and Freight Forwarding', () => {
    expect(
      filterCommodityCatalogServices([
        { id: 1, slug: 'shipping-agency', label: 'Shipping Agency' },
        { id: 2, slug: 'freight-forwarding', label: 'Freight Forwarding' },
        { id: 3, slug: 'chartering', label: 'Chartering' },
        { id: 4, slug: 'total-logistic', label: 'Total Logistics' },
      ]).map((service) => service.slug)
    ).toEqual(['freight-forwarding', 'shipping-agency'])
  })
})
