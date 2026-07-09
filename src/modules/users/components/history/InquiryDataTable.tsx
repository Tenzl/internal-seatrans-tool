"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, Calendar, Trash2 } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/shared/components/ui/button"
import { Checkbox } from "@/shared/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { Input } from "@/shared/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover"
import { Calendar as CalendarComponent } from "@/shared/components/ui/calendar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"

export type InquiryDeleteMode = 'soft' | 'hard'

export interface InquiryDataTableProps<TData extends { id: number }> {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  onDelete?: (ids: number[], mode: InquiryDeleteMode) => Promise<void>
  canHardDelete?: boolean
  /** Initial column visibility (e.g. hide port/date on small screens). */
  initialColumnVisibility?: VisibilityState
}

export function InquiryDataTable<TData extends { id: number }>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  onDelete,
  canHardDelete = false,
  initialColumnVisibility,
}: InquiryDataTableProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    () => initialColumnVisibility ?? {},
  )
  const [rowSelection, setRowSelection] = React.useState({})
  
  const [dateFrom, setDateFrom] = React.useState<Date>()
  const [dateTo, setDateTo] = React.useState<Date>()
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [pendingDeleteMode, setPendingDeleteMode] = React.useState<InquiryDeleteMode>('soft')
  const [isDeleting, setIsDeleting] = React.useState(false)

  // Define select column (from table-09 pattern)
  const selectColumn: ColumnDef<TData> = {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  }

  const columnsWithSelect = React.useMemo(
    () => (onDelete ? [selectColumn, ...columns] : columns),
    [columns, onDelete],
  )

  // Filter data by date range
  const filteredData = React.useMemo(() => {
    if (!dateFrom && !dateTo) return data
    
    return data.filter((row: any) => {
      const submittedAt = row.submittedAt ? new Date(row.submittedAt) : null
      if (!submittedAt) return true
      
      const from = dateFrom ? new Date(dateFrom.setHours(0, 0, 0, 0)) : null
      const to = dateTo ? new Date(dateTo.setHours(23, 59, 59, 999)) : null
      
      if (from && submittedAt < from) return false
      if (to && submittedAt > to) return false
      
      return true
    })
  }, [data, dateFrom, dateTo])

  const table = useReactTable({
    data: filteredData,
    columns: columnsWithSelect,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedCount = selectedRows.length

  const handleDelete = async (mode: InquiryDeleteMode) => {
    if (!onDelete || selectedCount === 0) return
    
    setIsDeleting(true)
    try {
      const ids = selectedRows.map(row => row.original.id)
      await onDelete(ids, mode)
      setRowSelection({})
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Failed to delete inquiries:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const openDeleteDialog = (mode: InquiryDeleteMode) => {
    setPendingDeleteMode(mode)
    setShowDeleteDialog(true)
  }

  return (
    <>
      <div className="w-full">
        {/* Toolbar — stacks on mobile; filters grouped to avoid horizontal overflow */}
        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center">
            {searchKey && (
              <Input
                placeholder={searchPlaceholder}
                value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
                onChange={(event) =>
                  table.getColumn(searchKey)?.setFilterValue(event.target.value)
                }
                className="w-full sm:max-w-sm"
              />
            )}

            <div className="flex flex-wrap items-center gap-2">
          {/* Date filters */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 active:scale-[0.98] sm:h-9">
                <Calendar className="h-4 w-4" />
                {dateFrom ? format(dateFrom, "PP") : "From date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-10 gap-2 active:scale-[0.98] sm:h-9">
                <Calendar className="h-4 w-4" />
                {dateTo ? format(dateTo, "PP") : "To date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              onClick={() => {
                setDateFrom(undefined)
                setDateTo(undefined)
              }}
              className="h-10 px-2 active:scale-[0.98] sm:h-8"
            >
              Clear
            </Button>
          )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {/* Delete / archive button */}
          {onDelete && selectedCount > 0 && (
            <>
              {!canHardDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDeleteDialog('soft')}
                  className="h-10 gap-2 active:scale-[0.98] sm:h-9"
                >
                  <Trash2 className="h-4 w-4" />
                  Archive ({selectedCount})
                </Button>
              )}
              {canHardDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => openDeleteDialog('hard')}
                  className="h-10 gap-2 active:scale-[0.98] sm:h-9"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete permanently ({selectedCount})
                </Button>
              )}
            </>
          )}
          
          {/* Column visibility toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 active:scale-[0.98] sm:h-9">
                Columns <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
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

        {/* Table - following table-09 pattern */}
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 z-20 bg-background">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className="bg-background">
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
                    data-state={row.getIsSelected() && "selected"}
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
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-end">
          <div className="text-sm text-muted-foreground sm:flex-1">
            {selectedCount} of {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-10 flex-1 active:scale-[0.98] sm:h-9 sm:flex-none"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-10 flex-1 active:scale-[0.98] sm:h-9 sm:flex-none"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDeleteMode === 'hard' ? 'Permanently delete inquiries?' : 'Archive inquiries?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteMode === 'hard'
                ? `This will permanently delete ${selectedCount} inquiry${selectedCount > 1 ? 'ies' : ''} and attached documents. This cannot be undone.`
                : `This will archive ${selectedCount} inquiry${selectedCount > 1 ? 'ies' : ''}. They will be hidden from user/staff history but remain visible to administrators.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDelete(pendingDeleteMode)}
              disabled={isDeleting}
              className={
                pendingDeleteMode === 'hard'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : undefined
              }
            >
              {isDeleting
                ? 'Processing...'
                : pendingDeleteMode === 'hard'
                  ? 'Delete permanently'
                  : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

