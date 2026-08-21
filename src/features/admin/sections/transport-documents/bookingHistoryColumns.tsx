import type { ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  STATUS_BADGE_CONFIG,
  type InquiryStatus,
} from '@/shared/constants/inquiry-status'
import { ArrowUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TransportDocumentRecord } from './transportDocument.types'

type BuildBookingHistoryColumnsOptions = {
  renderActions: (record: TransportDocumentRecord) => ReactNode
}

export function buildBookingHistoryColumns({
  renderActions,
}: BuildBookingHistoryColumnsOptions): ColumnDef<TransportDocumentRecord>[] {
  return [
    {
      id: 'document',
      accessorKey: 'bookingFlow',
      header: ({ column }) =>
        renderSortableHeader('Direction', () =>
          column.toggleSorting(column.getIsSorted() === 'asc')
        ),
      cell: ({ row }) => (
        <span className='font-medium'>
          {row.original.bookingFlow === 'IMPORT' ? 'Import' : 'Export'}
        </span>
      ),
    },
    {
      accessorKey: 'referenceNumber',
      header: ({ column }) =>
        renderSortableHeader('Booking No.', () =>
          column.toggleSorting(column.getIsSorted() === 'asc')
        ),
      cell: ({ row }) => (
        <span className='truncate font-medium'>
          {row.original.referenceNumber || `Record #${row.original.id}`}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) =>
        renderSortableHeader('Status', () =>
          column.toggleSorting(column.getIsSorted() === 'asc')
        ),
      cell: ({ row }) => renderTransportDocumentStatusBadge(row.original),
    },
    {
      id: 'createdBy',
      header: 'Created by',
      cell: ({ row }) => (
        <span className='truncate text-sm text-muted-foreground'>
          {row.original.createdBy?.fullName ||
            row.original.createdBy?.email ||
            `User #${row.original.createdByUserId}`}
        </span>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) =>
        renderSortableHeader('Created at', () =>
          column.toggleSorting(column.getIsSorted() === 'asc')
        ),
      cell: ({ row }) => (
        <span className='text-sm whitespace-nowrap text-muted-foreground'>
          {new Date(row.original.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => renderActions(row.original),
      enableHiding: false,
      enableSorting: false,
    },
  ]
}

function renderSortableHeader(label: string, onSort: () => void) {
  return (
    <Button variant='ghost' onClick={onSort}>
      {label}
      <ArrowUpDown className='ml-2 h-4 w-4' />
    </Button>
  )
}

export function renderTransportDocumentStatusBadge(
  record: TransportDocumentRecord
) {
  const displayedStatus = record.workflowStatus ?? record.status
  const config = STATUS_BADGE_CONFIG[displayedStatus as InquiryStatus] || {
    variant: 'outline' as const,
    label: displayedStatus,
  }
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}
