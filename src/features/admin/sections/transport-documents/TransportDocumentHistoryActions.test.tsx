// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TransportDocumentHistoryActions } from './TransportDocumentHistoryActions'
import type { TransportDocumentRecord } from './transportDocument.types'

describe('TransportDocumentHistoryActions', () => {
  it('shows Unlock but hides Delete for an admin when the record is locked', () => {
    const record = {
      id: 12,
      version: 3,
      documentType: 'booking',
      bookingFlow: 'EXPORT',
      bookingId: null,
      referenceNumber: 'BK-12',
      payload: {},
      status: 'PROCESSING',
      createdByUserId: 2,
      createdAt: '2026-08-10T00:00:00.000Z',
      updatedAt: '2026-08-10T00:00:00.000Z',
      updatedByUserId: 2,
      lockedAt: '2026-08-10T01:00:00.000Z',
      deletedAt: null,
      deletedByUserId: null,
      createdBy: null,
    } as TransportDocumentRecord

    render(
      <TransportDocumentHistoryActions
        record={record}
        permissions={{
          canLock: true,
          canUnlock: true,
          canHardDelete: true,
        }}
        onViewDetails={vi.fn()}
        onCopy={vi.fn()}
        onLock={vi.fn()}
        onUnlock={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    expect(
      screen.getByRole('button', { name: 'Unlock edit' })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Delete permanently' })
    ).not.toBeInTheDocument()
  })
})
