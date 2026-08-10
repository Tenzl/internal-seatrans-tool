// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InquiryHistoryRowActions } from './InquiryHistoryRowActions'
import type { InquiryHistoryRecord } from './inquiryHistory.types'

describe('InquiryHistoryRowActions', () => {
  it('shows Restore to an admin when an EPDA inquiry has deletedAt', () => {
    const inquiry = {
      id: 42,
      status: 'COMPLETED',
      submittedAt: '2026-08-10T00:00:00.000Z',
      deletedAt: '2026-08-10T01:00:00.000Z',
      serviceType: { name: 'SHIPPING AGENCY' },
    } as InquiryHistoryRecord

    render(
      <InquiryHistoryRowActions
        inquiry={inquiry}
        permissions={{
          isAdmin: true,
          canSoftDelete: true,
          canHardDelete: true,
        }}
        fallbackServiceType='shipping-agency'
        onOpenDetail={vi.fn()}
        onViewQuote={vi.fn()}
        onDelete={vi.fn()}
        onRestore={vi.fn()}
        onLock={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Restore' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Archive' })
    ).not.toBeInTheDocument()
  })
})
