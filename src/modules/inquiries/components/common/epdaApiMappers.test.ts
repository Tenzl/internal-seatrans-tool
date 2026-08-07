import type { BuildInvoiceQuoteDataParams } from '@/modules/inquiries/components/common/buildInvoiceQuoteData'
import { describe, expect, it } from 'vitest'
import {
  applyAdminInquiryToForm,
  buildEpdaPatchPayload,
  buildInternalCreatePayload,
} from './epdaApiMappers'

describe('EPDA quantity API contract', () => {
  it('sends quantityTons when creating a new internal EPDA', () => {
    const payload = buildInternalCreatePayload(7, {
      quoteForm: 'HCM',
      cargoQty: '12,500',
      boatHireQuarantineAmount: '',
    } as BuildInvoiceQuoteDataParams & {
      boatHireQuarantineAmount: string
    })

    expect(payload).toMatchObject({ customerUserId: 7, quantityTons: 12500 })
  })

  it('sends quantityTons when editing an existing EPDA', () => {
    const payload = buildEpdaPatchPayload({
      quoteForm: 'HCM',
      cargoQty: '12500.5',
      boatHireQuarantineAmount: '',
    } as BuildInvoiceQuoteDataParams & {
      boatHireQuarantineAmount: string
    })

    expect(payload).toMatchObject({ quantityTons: 12500.5 })
  })

  it('hydrates edit-form cargoQty from the server cargoQuantity value', () => {
    const appliedValues = new Map<string, string>()
    const setters = new Proxy(
      {},
      {
        get: (_, setterName: string) => (value: string) =>
          appliedValues.set(setterName, value),
      }
    ) as Parameters<typeof applyAdminInquiryToForm>[1]

    applyAdminInquiryToForm({ id: 11, cargoQuantity: '12,500.50' }, setters)

    expect(appliedValues.get('setCargoQty')).toBe('12500.5')
  })

  it('sends agencyOtherExpenses under in-lumpsum mode', () => {
    const payload = buildEpdaPatchPayload({
      quoteForm: 'HCM',
      agencyFeeMode: 'AGENCY_IN_LUMPSUM',
      agencyLumpsumAmount: '1500',
      agencyOtherExpenses: [
        { id: '1', name: 'Customs overtime', amount: '120' },
        { id: '2', name: '  ', amount: '50' },
      ],
      boatHireQuarantineAmount: '',
    } as BuildInvoiceQuoteDataParams & {
      boatHireQuarantineAmount: string
    })

    expect(payload).toMatchObject({
      agencyFeeMode: 'LUMPSUM',
      agencyLumpsumAmount: 1500,
      agencyOtherExpenses: [{ name: 'Customs overtime', amount: 120 }],
    })
  })

  it('clears agencyOtherExpenses when not in lumpsum mode', () => {
    const payload = buildEpdaPatchPayload({
      quoteForm: 'HCM',
      agencyFeeMode: 'TARRIF_AGENCY',
      agencyOtherExpenses: [
        { id: '1', name: 'Should clear', amount: '10' },
      ],
      boatHireQuarantineAmount: '',
    } as BuildInvoiceQuoteDataParams & {
      boatHireQuarantineAmount: string
    })

    expect(payload.agencyOtherExpenses).toEqual([])
  })
})
