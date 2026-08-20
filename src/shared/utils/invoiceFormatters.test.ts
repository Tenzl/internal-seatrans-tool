import { describe, expect, it } from 'vitest'
import { normalizeInvoiceNumericFields } from './invoiceFormatters'

describe('normalizeInvoiceNumericFields EPDA identity safety', () => {
  it('formats display amounts without converting stable numeric IDs to strings', () => {
    expect(
      normalizeInvoiceNumericFields({
        commodity_type_id: 2,
        nested: { commodityTypeId: 3 },
        cargo_qty_mt: 12_000,
      })
    ).toEqual({
      commodity_type_id: 2,
      nested: { commodityTypeId: 3 },
      cargo_qty_mt: '12,000',
    })
  })
})
