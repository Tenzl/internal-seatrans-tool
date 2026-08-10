import type { ReactNode } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  STATUS_BADGE_CONFIG,
  type InquiryStatus,
} from '@/shared/constants/inquiry-status'
import { ArrowUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { InquiryHistoryRecord } from './inquiryHistory.types'
import { getInquiryDisplayName, getInquiryPort } from './inquiryHistoryRules'

type BuildInquiryHistoryColumnsOptions = {
  isShippingAgencyHistory: boolean
  showShippingParties: boolean
  renderActions: (inquiry: InquiryHistoryRecord) => ReactNode
}

export function buildInquiryHistoryColumns({
  isShippingAgencyHistory,
  showShippingParties,
  renderActions,
}: BuildInquiryHistoryColumnsOptions): ColumnDef<InquiryHistoryRecord>[] {
  const columns: ColumnDef<InquiryHistoryRecord>[] = [
    {
      id: 'no',
      header: 'No.',
      cell: ({ row }) => (
        <span className='text-sm text-muted-foreground tabular-nums'>
          {row.original.code || `#${row.original.id}`}
        </span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: isShippingAgencyHistory ? 'mv' : 'fullName',
      header: ({ column }) =>
        renderSortableHeader(
          isShippingAgencyHistory ? 'Vessel name' : 'Customer',
          () => column.toggleSorting(column.getIsSorted() === 'asc')
        ),
      cell: ({ row }) => (
        <span className='font-medium'>
          {getInquiryDisplayName(row.original, isShippingAgencyHistory)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: ({ column }) =>
        renderSortableHeader('Status', () =>
          column.toggleSorting(column.getIsSorted() === 'asc')
        ),
      cell: ({ row }) => renderInquiryStatusBadge(row.original),
    },
  ]

  if (showShippingParties) {
    columns.splice(
      2,
      0,
      {
        id: 'employeeInCharge',
        header: 'Employee in charge',
        cell: ({ row }) => (
          <span className='text-sm'>
            {partyLabel(row.original.employeeInCharge)}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: 'clientSubmittedBy',
        header: 'Client submitted by',
        cell: ({ row }) => (
          <span className='text-sm'>
            {partyLabel(row.original.clientSubmittedBy)}
          </span>
        ),
        enableSorting: false,
      }
    )
  }

  if (isShippingAgencyHistory) {
    columns.push({
      accessorKey: 'portOfCall',
      header: ({ column }) =>
        renderSortableHeader('Port', () =>
          column.toggleSorting(column.getIsSorted() === 'asc')
        ),
      cell: ({ row }) => (
        <span className='text-sm'>{getInquiryPort(row.original)}</span>
      ),
    })
  }

  columns.push(
    {
      accessorKey: 'submittedAt',
      header: ({ column }) =>
        renderSortableHeader('Date', () =>
          column.toggleSorting(column.getIsSorted() === 'asc')
        ),
      cell: ({ row }) => (
        <span className='text-sm whitespace-nowrap text-muted-foreground'>
          {new Date(row.original.submittedAt).toLocaleString()}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => renderActions(row.original),
    }
  )

  return columns
}

function partyLabel(
  party: InquiryHistoryRecord['employeeInCharge']
): string {
  return party?.fullName?.trim() || party?.email?.trim() || '—'
}

function renderSortableHeader(label: string, onSort: () => void) {
  return (
    <Button variant='ghost' onClick={onSort}>
      {label}
      <ArrowUpDown className='ml-2 h-4 w-4' />
    </Button>
  )
}

function renderInquiryStatusBadge(inquiry: InquiryHistoryRecord) {
  // Archived is a lifecycle state and takes precedence over business status.
  if (inquiry.isArchived) {
    return (
      <Badge variant='secondary' className='bg-muted text-muted-foreground'>
        Archived
      </Badge>
    )
  }

  const config = STATUS_BADGE_CONFIG[inquiry.status as InquiryStatus] || {
    variant: 'outline' as const,
    label: inquiry.status,
  }
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}
