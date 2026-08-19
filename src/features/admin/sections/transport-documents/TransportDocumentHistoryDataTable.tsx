'use client'

import * as React from 'react'
import {
  type ColumnFiltersState,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

/**
 * TanStack table chrome matching InquiryDataTable (borders, sticky header,
 * columns toggle, pagination density) with server-side pagination.
 */
export function TransportDocumentHistoryDataTable<
  TData extends { id: number },
>({
  columns,
  data,
  page,
  totalPages,
  totalElements,
  isBusy,
  onPageChange,
  searchKey,
  searchPlaceholder,
  search,
  onSearchChange,
  initialColumnVisibility,
}: {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  page: number
  totalPages: number
  totalElements: number
  isBusy?: boolean
  onPageChange: (page: number) => void
  searchKey: string
  searchPlaceholder: string
  search: string
  onSearchChange: (value: string) => void
  initialColumnVisibility?: VisibilityState
}) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => initialColumnVisibility ?? {})
  const columnFilters = React.useMemo<ColumnFiltersState>(
    () => [{ id: searchKey, value: search }],
    [search, searchKey]
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: (updater) => {
      const next = functionalUpdate(updater, columnFilters)
      const value = next.find((filter) => filter.id === searchKey)?.value
      onSearchChange(typeof value === 'string' ? value : '')
      onPageChange(0)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    manualPagination: true,
    manualFiltering: true,
    autoResetPageIndex: false,
    pageCount: totalPages,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination: {
        pageIndex: page,
        pageSize: data.length || 10,
      },
    },
  })

  return (
    <div className='w-full'>
      <div className='flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-center'>
        <div className='flex w-full min-w-0 flex-col gap-2 sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center'>
          <Input
            type='search'
            aria-label='Search by Booking No.'
            placeholder={searchPlaceholder}
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ''
            }
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className='w-full sm:max-w-sm'
          />
        </div>

        <div className='flex flex-wrap items-center gap-2 sm:ml-auto'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='outline'
                className='h-10 active:scale-[0.98] sm:h-9'
              >
                Columns <ChevronDown className='ml-2 h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className='capitalize'
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader className='sticky top-0 z-20 bg-background'>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className='bg-background'>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
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
                  className='h-24 text-center'
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className='flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-end'>
        <div className='text-sm text-muted-foreground sm:flex-1'>
          Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
          {totalElements > 0 ? ` · ${totalElements} total` : ''}
        </div>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0 || isBusy}
            className='h-10 flex-1 active:scale-[0.98] sm:h-9 sm:flex-none'
          >
            Previous
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onPageChange(page + 1)}
            disabled={page + 1 >= totalPages || isBusy}
            className='h-10 flex-1 active:scale-[0.98] sm:h-9 sm:flex-none'
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
