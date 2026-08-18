'use client'

import * as React from 'react'
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { DateTimePicker } from '@/shared/components/DateTimePicker'
import { parseLocalDateTime } from '@/shared/utils/dateTimePicker'
import { ChevronDown, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { INQUIRY_PAGE_SIZE } from './useInquiryData'

export interface InquiryDataTableProps<TData extends { id: number }> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  search: string
  onSearchChange: (value: string) => void
  dateFrom: string
  dateTo: string
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  sorting: SortingState
  onSortingChange: (sorting: SortingState) => void
  pageIndex: number
  pageCount: number
  totalElements: number
  onPageChange: (page: number) => void
  onDelete?: (ids: number[]) => Promise<void>
  canSelectRow?: (row: TData) => boolean
  /** Initial column visibility (e.g. hide port/date on small screens). */
  initialColumnVisibility?: VisibilityState
}

export function InquiryDataTable<TData extends { id: number }>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  search,
  onSearchChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  sorting,
  onSortingChange,
  pageIndex,
  pageCount,
  totalElements,
  onPageChange,
  onDelete,
  canSelectRow,
  initialColumnVisibility,
}: InquiryDataTableProps<TData>) {
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(() => initialColumnVisibility ?? {})
  const [rowSelection, setRowSelection] = React.useState({})

  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const selectColumn = React.useMemo<ColumnDef<TData>>(
    () => ({
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Select all'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          disabled={!row.getCanSelect()}
          aria-label='Select row'
        />
      ),
      enableSorting: false,
      enableHiding: false,
    }),
    []
  )

  const columnsWithSelect = React.useMemo(
    () => (onDelete ? [selectColumn, ...columns] : columns),
    [columns, onDelete, selectColumn]
  )

  const table = useReactTable({
    data,
    columns: columnsWithSelect,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: Math.max(pageCount, 1),
    rowCount: totalElements,
    onSortingChange: (updater) => {
      const next = functionalUpdate(updater, sorting)
      onSortingChange(next)
      onPageChange(0)
    },
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: (row) => canSelectRow?.(row.original) ?? true,
    onPaginationChange: (updater) => {
      const next = functionalUpdate(updater, {
        pageIndex,
        pageSize: INQUIRY_PAGE_SIZE,
      })
      onPageChange(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    autoResetPageIndex: false,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      pagination: { pageIndex, pageSize: INQUIRY_PAGE_SIZE },
    },
  })

  const selectedRows = table.getSelectedRowModel().rows
  const selectedCount = selectedRows.length

  const handleDelete = async () => {
    if (!onDelete || selectedCount === 0) return

    setIsDeleting(true)
    try {
      const ids = selectedRows.map((row) => row.original.id)
      await onDelete(ids)
      setRowSelection({})
      setShowDeleteDialog(false)
    } catch {
      // The caller owns user-facing error reporting for delete failures.
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className='w-full'>
        <div className='flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-center'>
          <div className='flex w-full min-w-0 flex-col gap-2 sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center'>
            {searchKey && (
              <Input
                placeholder={searchPlaceholder}
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                className='w-full sm:max-w-sm'
              />
            )}

            <div className='flex flex-wrap items-center gap-2'>
              <DateTimePicker
                value={dateFrom}
                onValueChange={onDateFromChange}
                placeholder='From date'
                className='h-10 w-[160px] active:scale-[0.98] sm:h-9'
              />

              <DateTimePicker
                value={dateTo}
                onValueChange={onDateToChange}
                placeholder='To date'
                minDate={parseLocalDateTime(dateFrom)}
                className='h-10 w-[160px] active:scale-[0.98] sm:h-9'
              />

              {(dateFrom || dateTo) && (
                <Button
                  variant='ghost'
                  onClick={() => {
                    onDateFromChange('')
                    onDateToChange('')
                  }}
                  className='h-10 px-2 active:scale-[0.98] sm:h-8'
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-2 sm:ml-auto'>
            {onDelete && selectedCount > 0 && (
              <Button
                variant='destructive'
                size='sm'
                onClick={() => setShowDeleteDialog(true)}
                className='h-10 gap-2 active:scale-[0.98] sm:h-9'
              >
                <Trash2 className='h-4 w-4' />
                Delete permanently ({selectedCount})
              </Button>
            )}

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
                  .map((column) => {
                    return (
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
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className='overflow-x-auto rounded-md border'>
          <Table>
            <TableHeader className='sticky top-0 z-20 bg-background'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className='bg-background'>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
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
                    colSpan={columnsWithSelect.length}
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
            {selectedCount} of {data.length} row(s) selected on this page
            {totalElements > 0 ? ` · ${totalElements} total` : ''}.
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className='h-10 flex-1 active:scale-[0.98] sm:h-9 sm:flex-none'
            >
              Previous
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className='h-10 flex-1 active:scale-[0.98] sm:h-9 sm:flex-none'
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete inquiries?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedCount}{' '}
              {selectedCount === 1 ? 'inquiry' : 'inquiries'} and attached
              documents. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete()}
              disabled={isDeleting}
              className='text-destructive-foreground bg-destructive hover:bg-destructive/90'
            >
              {isDeleting ? 'Processing...' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
