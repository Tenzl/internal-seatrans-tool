import { describe, expect, it } from 'vitest'
import { buildInquiryHistoryColumns } from './inquiryHistoryColumns'

describe('shipping agency inquiry party columns', () => {
  it('shows employee and client columns only on the admin shipping list', () => {
    const adminColumns = buildInquiryHistoryColumns({
      isShippingAgencyHistory: true,
      showShippingParties: true,
      renderActions: () => null,
    })
    const customerColumns = buildInquiryHistoryColumns({
      isShippingAgencyHistory: true,
      showShippingParties: false,
      renderActions: () => null,
    })

    expect(adminColumns.map((column) => column.id)).toEqual(
      expect.arrayContaining(['employeeInCharge', 'clientSubmittedBy'])
    )
    expect(customerColumns.map((column) => column.id)).not.toEqual(
      expect.arrayContaining(['employeeInCharge', 'clientSubmittedBy'])
    )
  })
})
