import { describe, expect, it } from 'vitest'
import {
  buildRequiredFields,
  getMissingRequiredFields,
  getRequiredFieldState,
  type CreateInvoiceRequiredValues,
} from './invoiceValidation'

const completeValues: CreateInvoiceRequiredValues = {
  toShipowner: 'Owner',
  mv: 'MV Test',
  dischargeLoadingLocation: 'Berth',
  dwt: '10000',
  grt: '8000',
  loa: '150',
  cargoQty: '1200',
  cargoType: 'BULK',
  cargoName: 'RICE',
  purposeOfCalling: 'OTHER',
  frtTaxType: 'IMPORT',
}

describe('EPDA required-field validation', () => {
  it.each(['dwt', 'grt', 'loa', 'cargoQty'] as const)(
    'rejects zero for required positive numeric field %s',
    (key) => {
      const fields = buildRequiredFields({ ...completeValues, [key]: '0' })
      expect(
        getMissingRequiredFields(fields).map((field) => field.key)
      ).toContain(key)
    }
  )

  it('accepts positive numeric vessel and cargo values', () => {
    expect(
      getMissingRequiredFields(buildRequiredFields(completeValues))
    ).toEqual([])
  })

  it('marks a zero required numeric input as invalid in the form UI', () => {
    expect(getRequiredFieldState('0', true, 'grt').fieldClass).toContain(
      'border-red-500'
    )
    expect(getRequiredFieldState('0', true, 'toShipowner').fieldClass).toBe('')
  })
})
