// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InquiryHistoryRowActions } from './InquiryHistoryRowActions'
import type { InquiryHistoryRecord } from './inquiryHistory.types'

describe('InquiryHistoryRowActions', () => {
  it('shows Unlock edit and hides Delete when an EPDA inquiry is locked', () => {
    const inquiry = {
      id: 42,
      status: 'COMPLETED',
      submittedAt: '2026-08-10T00:00:00.000Z',
      deletedAt: null,
      epdaLockedAt: '2026-08-10T01:00:00.000Z',
      serviceType: { name: 'SHIPPING AGENCY' },
    } as InquiryHistoryRecord

    render(
      <InquiryHistoryRowActions
        inquiry={inquiry}
        permissions={{
          isAdmin: true,
          canHardDelete: true,
          canUnlock: true,
        }}
        fallbackServiceType='shipping-agency'
        onOpenDetail={vi.fn()}
        onViewQuote={vi.fn()}
        onDelete={vi.fn()}
        onLock={vi.fn()}
        onUnlock={vi.fn()}
      />
    )

    expect(
      screen.getByRole('button', { name: 'Unlock edit' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Delete' })
    ).not.toBeInTheDocument()
  })
})
