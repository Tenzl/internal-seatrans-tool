import { describe, expect, it } from 'vitest'
import type { BuildInvoiceQuoteDataParams } from '@/features/admin/components/invoice/buildInvoiceQuoteData'
import { buildEpdaPatchPayload } from './epdaApiMappers'

describe('EPDA detail patch contract', () => {
  it('sends canonical numeric portId with the display name', () => {
    const payload = buildEpdaPatchPayload({
      portId: 38,
      port: 'CHAN MAY',
      quoteForm: 'QN',
      boatHireQuarantineAmount: '',
    } as BuildInvoiceQuoteDataParams & {
      portId: number
      boatHireQuarantineAmount: string
    })

    expect(payload).toMatchObject({ portId: 38, portOfCall: 'CHAN MAY', quoteForm: 'QN' })
  })
})
