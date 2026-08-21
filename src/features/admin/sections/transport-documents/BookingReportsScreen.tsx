'use client'

import * as React from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { BarChart3, Loader2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PartySearchSelect } from './PartySearchSelect'
import type { BookingReportRow } from './transportDocument.types'
import { transportDocumentService } from './transportDocumentService'

const columns: ColumnDef<BookingReportRow>[] = [
  {
    id: 'bookingNumber',
    accessorKey: 'booking_number',
    header: 'Booking No.',
    cell: ({ row }) => (
      <span className='font-medium'>{row.original.booking_number ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'booking_flow',
    header: 'Flow',
    cell: ({ row }) => (
      <Badge variant='outline'>{row.original.booking_flow}</Badge>
    ),
  },
  {
    accessorKey: 'workflow_status',
    header: 'Status',
    cell: ({ row }) => (
      <Badge
        variant={
          row.original.workflow_status === 'COMPLETED' ? 'default' : 'secondary'
        }
      >
        {row.original.workflow_status === 'COMPLETED'
          ? 'Completed'
          : 'Processing'}
      </Badge>
    ),
  },
  { id: 'bookingDate', accessorKey: 'booking_date', header: 'Date' },
  {
    id: 'client',
    accessorKey: 'client_name',
    header: 'Customer',
    cell: ({ row }) => row.original.client_name ?? '—',
  },
  {
    accessorKey: 'port_of_loading_name',
    header: 'POL',
    cell: ({ row }) => row.original.port_of_loading_name ?? '—',
  },
  {
    accessorKey: 'port_of_discharge_name',
    header: 'POD',
    cell: ({ row }) => row.original.port_of_discharge_name ?? '—',
  },
  {
    id: 'vesselVoyage',
    accessorKey: 'vessel_voyage',
    header: 'Vessel / Voyage',
    cell: ({ row }) => row.original.vessel_voyage ?? '—',
  },
  {
    id: 'plannedContainers',
    accessorKey: 'planned_container_count',
    header: 'Planned',
    cell: ({ row }) => `${row.original.planned_container_count} cont.`,
  },
  {
    id: 'actualContainers',
    accessorKey: 'actual_container_count',
    header: 'Actual',
    cell: ({ row }) => `${row.original.actual_container_count} cont.`,
  },
  {
    id: 'documents',
    header: 'Documents',
    enableSorting: false,
    cell: ({ row }) => (
      <div className='flex gap-1'>
        {row.original.has_bl ? <Badge variant='secondary'>BL</Badge> : null}
        {row.original.has_an ? <Badge variant='secondary'>AN</Badge> : null}
        {row.original.has_do ? <Badge variant='secondary'>DO</Badge> : null}
        {!row.original.has_bl && !row.original.has_an && !row.original.has_do
          ? '—'
          : null}
      </div>
    ),
  },
]

function metric(value: string | number | undefined, suffix = '') {
  const numeric = Number(value ?? 0)
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 3 }).format(Number.isFinite(numeric) ? numeric : 0)}${suffix}`
}

export function BookingReportsScreen() {
  const [page, setPage] = React.useState(0)
  const [bookingNo, setBookingNo] = React.useState('')
  const [flow, setFlow] = React.useState('')
  const [status, setStatus] = React.useState('')
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
  const [clientPartyId, setClientPartyId] = React.useState<number | null>(null)
  const [clientName, setClientName] = React.useState('')
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'bookingDate', desc: true },
  ])
  const debouncedBookingNo = useDebouncedValue(bookingNo, 300).trim()
  const sort = sorting[0]
  const pageSize = 20

  React.useEffect(
    () => setPage(0),
    [debouncedBookingNo, flow, status, dateFrom, dateTo, clientPartyId, sorting]
  )

  const reportQuery = useQuery({
    queryKey: [
      'booking-reports',
      page,
      pageSize,
      debouncedBookingNo,
      flow,
      status,
      dateFrom,
      dateTo,
      clientPartyId,
      sort?.id,
      sort?.desc,
    ],
    queryFn: () =>
      transportDocumentService.report({
        page,
        size: pageSize,
        bookingNo: debouncedBookingNo || undefined,
        flow: flow || undefined,
        status: status || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        clientPartyId: clientPartyId ?? undefined,
        sortBy: sort?.id ?? 'bookingDate',
        sortDirection: sort?.desc === false ? 'asc' : 'desc',
      }),
    placeholderData: keepPreviousData,
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: reportQuery.data?.content ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: reportQuery.data?.totalPages ?? 0,
    state: { sorting, pagination: { pageIndex: page, pageSize } },
    onSortingChange: setSorting,
  })
  const summary = reportQuery.data?.summary
  const totalPages = reportQuery.data?.totalPages ?? 0

  return (
    <div className='mx-auto max-w-[1600px] space-y-5 pb-8'>
      <Card>
        <CardHeader className='border-b border-border/50'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <CardTitle className='flex items-center gap-2 text-lg'>
                <BarChart3 className='h-5 w-5' />
                Booking Reports
              </CardTitle>
              <CardDescription className='mt-1.5'>
                One row per Booking with planned cargo and actual BL or Arrival
                Notice totals.
              </CardDescription>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => void reportQuery.refetch()}
              disabled={reportQuery.isFetching}
            >
              {reportQuery.isFetching ? (
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <RefreshCw className='mr-2 h-4 w-4' />
              )}
              Reload
            </Button>
          </div>
        </CardHeader>
        <CardContent className='space-y-5 pt-5'>
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
            {[
              ['Bookings', metric(summary?.total_bookings)],
              ['Planned containers', metric(summary?.planned_containers)],
              ['Actual containers', metric(summary?.actual_containers)],
              [
                'Planned / actual weight',
                `${metric(summary?.planned_gross_weight_kg, ' kg')} / ${metric(summary?.actual_gross_weight_kg, ' kg')}`,
              ],
            ].map(([label, value]) => (
              <div key={label} className='rounded-lg border bg-muted/20 p-4'>
                <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                  {label}
                </p>
                <p className='mt-1 text-xl font-semibold'>{value}</p>
              </div>
            ))}
          </div>

          <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-7'>
            <Input
              type='search'
              aria-label='Search Booking No.'
              placeholder='Booking No.'
              value={bookingNo}
              onChange={(event) => setBookingNo(event.target.value)}
            />
            <select
              aria-label='Booking flow'
              className='h-10 rounded-md border bg-background px-3 text-sm'
              value={flow}
              onChange={(event) => setFlow(event.target.value)}
            >
              <option value=''>All flows</option>
              <option value='EXPORT'>Export</option>
              <option value='IMPORT'>Import</option>
            </select>
            <select
              aria-label='Booking status'
              className='h-10 rounded-md border bg-background px-3 text-sm'
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value=''>All statuses</option>
              <option value='PROCESSING'>Processing</option>
              <option value='COMPLETED'>Completed</option>
            </select>
            <Input
              type='date'
              aria-label='Date from'
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
            <Input
              type='date'
              aria-label='Date to'
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
            />
            <div className='md:col-span-2'>
              <PartySearchSelect
                value={clientPartyId}
                documentValue={clientName}
                partyValueMode='name'
                placeholder='Customer'
                onChange={(option) => {
                  setClientPartyId(option?.id ?? null)
                  setClientName(option?.name ?? '')
                }}
              />
            </div>
          </div>

          <div className='overflow-x-auto rounded-md border'>
            <Table>
              <TableHeader className='sticky top-0 z-10 bg-background'>
                {table.getHeaderGroups().map((group) => (
                  <TableRow key={group.id}>
                    {group.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : (
                          <button
                            type='button'
                            className={
                              header.column.getCanSort()
                                ? 'cursor-pointer text-left select-none'
                                : ''
                            }
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {header.column.getIsSorted() === 'asc'
                              ? ' ↑'
                              : header.column.getIsSorted() === 'desc'
                                ? ' ↓'
                                : ''}
                          </button>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {reportQuery.isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className='h-28 text-center'
                    >
                      <Loader2 className='mx-auto h-5 w-5 animate-spin' />
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className='h-28 text-center text-muted-foreground'
                    >
                      No bookings match these filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground'>
            <span>
              Page {totalPages ? page + 1 : 0} of {totalPages} ·{' '}
              {reportQuery.data?.totalElements ?? 0} bookings
            </span>
            <div className='flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                disabled={page === 0 || reportQuery.isFetching}
                onClick={() => setPage((value) => Math.max(0, value - 1))}
              >
                Previous
              </Button>
              <Button
                variant='outline'
                size='sm'
                disabled={page + 1 >= totalPages || reportQuery.isFetching}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
