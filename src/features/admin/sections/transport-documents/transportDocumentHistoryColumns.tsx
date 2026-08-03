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

const DOCUMENT_TYPE_LABELS: Record<TransportDocumentRecord['documentType'], string> =
  {
    an: 'Arrival Notice',
    booking: 'Order',
    do: 'Delivery Order',
    bl: 'Bill of Lading',
  }

type BuildTransportDocumentHistoryColumnsOptions = {
  renderActions: (record: TransportDocumentRecord) => ReactNode
}

export function buildTransportDocumentHistoryColumns({
  renderActions,
}: BuildTransportDocumentHistoryColumnsOptions): ColumnDef<TransportDocumentRecord>[] {
  return [
    {
      id: 'document',
      accessorKey: 'documentType',
      header: ({ column }) =>
        renderSortableHeader('Document', () =>
          column.toggleSorting(column.getIsSorted() === 'asc')
        ),
      cell: ({ row }) => (
        <span className='font-medium'>
          {DOCUMENT_TYPE_LABELS[row.original.documentType]}
        </span>
      ),
    },
    {
      accessorKey: 'referenceNumber',
      header: ({ column }) =>
        renderSortableHeader('Reference', () =>
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
  const config = STATUS_BADGE_CONFIG[record.status as InquiryStatus] || {
    variant: 'outline' as const,
    label: record.status,
  }
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}
