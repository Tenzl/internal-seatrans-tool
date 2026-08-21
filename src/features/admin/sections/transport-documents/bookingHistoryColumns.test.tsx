// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { renderTransportDocumentStatusBadge } from './bookingHistoryColumns'
import type { TransportDocumentRecord } from './transportDocument.types'

afterEach(cleanup)

const booking = {
  id: 1,
  documentType: 'booking',
  bookingFlow: 'EXPORT',
  payload: {},
  referenceNumber: 'BK-1',
  status: 'COMPLETED',
  version: 1,
  createdByUserId: 1,
  createdAt: '2026-08-21T00:00:00.000Z',
  updatedAt: '2026-08-21T00:00:00.000Z',
} satisfies TransportDocumentRecord

describe('booking history status', () => {
  it('shows workflow processing when Booking is complete but a child document is not', () => {
    render(
      renderTransportDocumentStatusBadge({
        ...booking,
        workflowStatus: 'PROCESSING',
      })
    )

    expect(screen.getByText('Processing')).toBeInTheDocument()
    expect(screen.queryByText('Completed')).not.toBeInTheDocument()
  })

  it('falls back to the document status for non-workflow records', () => {
    render(renderTransportDocumentStatusBadge(booking))
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })
})
