"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type Table as TableInstance,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Loader2 } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"
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

/** Sticky header + optional pinned left/right columns inside `.admin-data-table` scroll */
export function adminStickyColumnClass(
  columnId: string,
  type: "header" | "cell",
  baseClass = "",
  options?: { pinLeft?: string[]; pinRight?: string[] },
): string {
  const isHeader = type === "header"
  const pinLeft = options?.pinLeft ?? []
  const pinRight = options?.pinRight ?? ["actions"]
  const headerTop = isHeader ? "sticky top-0 z-20 bg-muted/95 backdrop-blur-sm" : ""
  const pinnedHeader = "sticky top-0 z-30 bg-muted/95 backdrop-blur-sm"

  if (pinLeft.includes(columnId)) {
    return cn(
      "admin-table-pin-left sticky left-0 min-w-[7rem] shadow-[inset_-1px_0_0_0_hsl(var(--border)/0.55)] sm:min-w-[11rem]",
      isHeader ? pinnedHeader : "z-10 bg-background hover:!bg-background",
      baseClass,
    )
  }

  if (pinRight.includes(columnId)) {
    return cn(
      "admin-table-pin-right sticky right-0 min-w-[4.25rem] w-max max-w-[9rem]",
      "shadow-[inset_1px_0_0_0_hsl(var(--border)/0.55)]",
      !isHeader && "!px-0 !pr-1 !pl-2",
      isHeader ? pinnedHeader : "z-10 bg-background hover:!bg-background",
      baseClass,
    )
  }

  return cn(headerTop, baseClass)
}

// ---------------------------------------------------------------------------
// DataTableSortHeader — ghost-style sortable column header button
// ---------------------------------------------------------------------------

export function DataTableSortHeader({
   
  column,
  children,
}: {
  column: Column<any, any>
  children: React.ReactNode
}) {
  return (
    <Button
      variant="ghost"
      className="h-auto w-full justify-start p-0 font-medium hover:bg-transparent"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {children}
      {column.getIsSorted() === "asc" ? (
        <ArrowUp className="ml-2 h-3.5 w-3.5" />
      ) : column.getIsSorted() === "desc" ? (
        <ArrowDown className="ml-2 h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="ml-2 h-3.5 w-3.5 opacity-40" />
      )}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// DataTableContent — renders Table from an external Table<TData> instance
// ---------------------------------------------------------------------------

interface DataTableContentProps<TData> {
  table: TableInstance<TData>
  /** Number of visible columns — used for colSpan on empty/loading rows */
  columnCount: number
  loading?: boolean
  emptyMessage?: string
  /** Max height of the scrollable table container (default "430px") */
  maxHeight?: string
  /**
   * Returns className for a given columnId.
   * `type` is 'header' for <th> and 'cell' for <td> — use it to apply
   * different classes (e.g. align-top only on cells, not headers).
   */
  columnClassName?: (columnId: string, type: "header" | "cell") => string
  /** Extra className on the outer scroll container */
  containerClassName?: string
  /** Extra className on the <Table> element (e.g. "w-max min-w-full" for sticky cols) */
  tableClassName?: string
}

export function DataTableContent<TData>({
  table,
  columnCount,
  loading = false,
  emptyMessage = "No results.",
  maxHeight = "min(52dvh, 520px)",
  columnClassName,
  containerClassName,
  tableClassName,
}: DataTableContentProps<TData>) {
  return (
    <div
      className={cn("admin-data-table", containerClassName)}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table className={cn("w-full caption-bottom text-sm", tableClassName)}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={columnClassName?.(header.column.id, "header")}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-24 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-24 text-center">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={columnClassName?.(cell.column.id, "cell")}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// DataTablePagination — Previous / Next + URL page persistence
// ---------------------------------------------------------------------------

/**
 * Two-phase state machine for URL page persistence:
 *
 *   ┌──────────┐  data loads & page applied   ┌──────────┐
 *   │ RESTORING ├─────────────────────────────►│ SYNCING  │
 *   └──────────┘                               └──────────┘
 *        ▲                                          │
 *        │  (mount, read ?key=N from URL)           │  pageIndex changes
 *        └──────────────────────────────────────────►│  → write to URL
 *
 * "RESTORING" waits until data has loaded (filteredRows > 0) then applies the
 * target page.  This survives TanStack's autoResetPageIndex which fires when
 * `data` reference changes ([] → [...items]).
 *
 * "SYNCING" writes the current pageIndex to the URL on every change.
 */
export function DataTablePagination<TData>({
  table,
  persistKey,
  totalRowCount,
  isFetching,
}: {
  table: TableInstance<TData>
  persistKey?: string
  /** Server-side total; falls back to client filtered row count */
  totalRowCount?: number
  isFetching?: boolean
}) {
  const { pageIndex, pageSize } = table.getState().pagination
  const pageCount = Math.max(table.getPageCount(), 1)
  const shownRows = table.getRowModel().rows.length
  const filteredRows = totalRowCount ?? table.getFilteredRowModel().rows.length
  const rangeStart = filteredRows === 0 ? 0 : pageIndex * pageSize + 1
  const rangeEnd = filteredRows === 0 ? 0 : Math.min(pageIndex * pageSize + shownRows, filteredRows)

  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()

  const spRef = useRef(searchParams)
  spRef.current = searchParams

  // Phase: "restoring" = waiting for data before applying URL page
  //        "syncing"   = normal operation, write pageIndex → URL
  const phaseRef = useRef<"restoring" | "syncing">(persistKey ? "restoring" : "syncing")
  const targetPageRef = useRef(0)

  // On mount: read target page from URL
  useEffect(() => {
    if (!persistKey) return
    const urlPage = parseInt(spRef.current.get(persistKey) ?? "0", 10)
    if (Number.isFinite(urlPage) && urlPage > 0) {
      targetPageRef.current = urlPage
      table.setPageIndex(urlPage)
    } else {
      phaseRef.current = "syncing"
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // RESTORING phase: when data loads (filteredRows changes) or autoResetPageIndex
  // fires, re-apply the target page until we land on it.
  useEffect(() => {
    if (phaseRef.current !== "restoring") return
    const target = targetPageRef.current
    if (target === 0) { phaseRef.current = "syncing"; return }

    if (pageIndex === target) {
      phaseRef.current = "syncing"
      return
    }

    if (filteredRows > 0) {
      const maxPage = Math.ceil(filteredRows / table.getState().pagination.pageSize) - 1
      if (target <= maxPage) {
        table.setPageIndex(target)
      } else {
        phaseRef.current = "syncing"
      }
    }
  }, [filteredRows, pageIndex, table])

  // SYNCING phase: write pageIndex → URL
  useEffect(() => {
    if (!persistKey || phaseRef.current !== "syncing") return
    const currentUrlPage = parseInt(spRef.current.get(persistKey) ?? "0", 10)
    if (currentUrlPage === pageIndex) return

    const params = new URLSearchParams(spRef.current.toString())
    if (pageIndex === 0) {
      params.delete(persistKey)
    } else {
      params.set(persistKey, String(pageIndex))
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex, persistKey, pathname])

  // Manual navigation immediately switches to syncing phase
  const navigate = (action: () => void) => {
    phaseRef.current = "syncing"
    targetPageRef.current = 0
    action()
  }

  return (
    <div className="dashboard-pagination-bar">
      <div className="text-sm text-muted-foreground">
        {isFetching ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Updating…
          </span>
        ) : filteredRows === 0 ? (
          "No records"
        ) : (
          <>
            <span className="font-mono-data tabular-nums text-foreground/90">
              {rangeStart}–{rangeEnd}
            </span>
            <span> of </span>
            <span className="font-mono-data tabular-nums text-foreground/90">{filteredRows}</span>
            <span className="hidden sm:inline"> records</span>
            <span className="mx-2 hidden text-border sm:inline">·</span>
            <span className="hidden sm:inline">
              Page {pageIndex + 1} of {pageCount}
            </span>
          </>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(() => table.previousPage())}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(() => table.nextPage())}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
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

  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-2">
        {searchKey && (
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
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
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
