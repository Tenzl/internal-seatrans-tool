// @vitest-environment jsdom
import { shippingAgencyEpdaService } from '@/modules/inquiries/services/shippingAgencyEpdaService'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EpdaFieldChangeHistory } from './EpdaFieldChangeHistory'

vi.mock('@/shared/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@/modules/inquiries/services/shippingAgencyEpdaService', () => ({
  shippingAgencyEpdaService: { listFieldChanges: vi.fn() },
}))

const entry = (id: number) => ({
  id,
  inquiryId: 7,
  fieldName: 'loa',
  previousValue: String(id - 1),
  newValue: String(id),
  action: 'EPDA_SAVE_DRAFT' as const,
  createdAt: '2026-08-10T00:00:00.000Z',
  changedBy: { id: 3, fullName: 'Staff', email: null },
})

describe('EpdaFieldChangeHistory', () => {
  beforeEach(() => {
    vi.mocked(shippingAgencyEpdaService.listFieldChanges).mockReset()
  })

  it('shows the total and loads the next history page', async () => {
    vi.mocked(shippingAgencyEpdaService.listFieldChanges)
      .mockResolvedValueOnce({
        content: Array.from({ length: 20 }, (_, index) => entry(index + 1)),
        page: 0,
        size: 20,
        totalElements: 21,
        totalPages: 2,
      })
      .mockResolvedValueOnce({
        content: [entry(21)],
        page: 1,
        size: 20,
        totalElements: 21,
        totalPages: 2,
      })

    const user = userEvent.setup()
    render(<EpdaFieldChangeHistory inquiryId={7} />)

    const trigger = await screen.findByRole('button', {
      name: 'epda.historyBtn (21)',
    })
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'epda.loadMore' }))

    await waitFor(() =>
      expect(
        shippingAgencyEpdaService.listFieldChanges
      ).toHaveBeenLastCalledWith(7, 1, 20)
    )
    expect(await screen.findByText('21')).toBeInTheDocument()
  })
})
