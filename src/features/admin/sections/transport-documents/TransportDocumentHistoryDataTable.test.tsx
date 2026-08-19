// @vitest-environment jsdom
import type { ColumnDef } from '@tanstack/react-table'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TransportDocumentHistoryDataTable } from './TransportDocumentHistoryDataTable'

afterEach(cleanup)

type BookingRow = {
  id: number
  referenceNumber: string
}

const columns: ColumnDef<BookingRow, unknown>[] = [
  {
    accessorKey: 'referenceNumber',
    header: 'Booking No.',
  },
]

describe('TransportDocumentHistoryDataTable search', () => {
  it('routes Booking No. search through the TanStack column filter', () => {
    const onSearchChange = vi.fn()
    const onPageChange = vi.fn()

    render(
      <TransportDocumentHistoryDataTable
        columns={columns}
        data={[{ id: 1, referenceNumber: 'BK-2026-001' }]}
        page={2}
        totalPages={4}
        totalElements={31}
        searchKey='referenceNumber'
        searchPlaceholder='Search Booking No.…'
        search='BK-2026'
        onSearchChange={onSearchChange}
        onPageChange={onPageChange}
      />
    )

    const search = screen.getByRole('searchbox', {
      name: 'Search by Booking No.',
    })
    expect(search).toHaveValue('BK-2026')

    fireEvent.change(search, { target: { value: 'BK-2026-002' } })

    expect(onSearchChange).toHaveBeenCalledWith('BK-2026-002')
    expect(onPageChange).toHaveBeenCalledWith(0)
  })
})
