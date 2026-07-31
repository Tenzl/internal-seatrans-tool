import { useMemo, useState, type ReactNode } from 'react'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { Category } from '@/modules/categories/services/categoryService'
import {
  AdminDataPanel,
  AdminSection,
  AdminToolbar,
  AdminToolbarGroup,
} from '@/shared/components/layout/dashboard/admin'
import { useTableSortHeader } from '@/shared/hooks/useTableSortHeader'
import { ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/ui/data-table'
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
import {
  formatCategoryDate,
  getCategoryTableTitle,
} from './categoryManagementModel'

const CATEGORIES_PAGE_SIZE = 10

interface CategoryTableSectionProps {
  categories: Category[]
  loading: boolean
  managementControls: ReactNode
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

export function CategoryTableSection({
  categories,
  loading,
  managementControls,
  onEdit,
  onDelete,
}: CategoryTableSectionProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const renderSortableHeader = useTableSortHeader<Category>()

  const columns = useMemo<ColumnDef<Category>[]>(
    () => [
      {
        accessorKey: 'id',
        header: renderSortableHeader('ID'),
        cell: ({ row }) => (
          <span className='tabular-nums'>{row.original.id}</span>
        ),
      },
      {
        accessorKey: 'name',
        header: renderSortableHeader('Name'),
        cell: ({ row }) => (
          <span className='font-medium'>{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'description',
        header: 'Description',
        enableSorting: false,
        cell: ({ row }) => (
          <span className='block max-w-md truncate text-sm text-muted-foreground'>
            {row.original.description || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: renderSortableHeader('Created At'),
        cell: ({ row }) => (
          <span className='text-sm text-muted-foreground'>
            {formatCategoryDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => (
          <div className='flex items-center justify-end gap-0.5'>
            <Button
              size='sm'
              variant='outline'
              onClick={() => onEdit(row.original)}
              title='Edit'
            >
              <Pencil className='h-3 w-3' />
            </Button>
            <Button
              size='sm'
              variant='outline'
              onClick={() => onDelete(row.original)}
              title='Delete'
            >
              <Trash2 className='h-3 w-3' />
            </Button>
          </div>
        ),
      },
    ],
    [onDelete, onEdit, renderSortableHeader]
  )

  // TanStack Table owns mutable table methods, so React Compiler must skip it.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: categories,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    initialState: {
      pagination: { pageIndex: 0, pageSize: CATEGORIES_PAGE_SIZE },
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })
  const search = (table.getColumn('name')?.getFilterValue() as string) ?? ''
  const filteredCount = table.getFilteredRowModel().rows.length
  const tableTitle = getCategoryTableTitle(
    search,
    filteredCount,
    categories.length
  )

  return (
    <AdminSection
      description='Manage post categories. Search by name; create or edit categories with the form below.'
      toolbar={
        <div className='space-y-4'>
          {managementControls}
          <AdminToolbar>
            <AdminToolbarGroup>
              <Input
                placeholder='Search categories by name'
                value={search}
                onChange={(event) =>
                  table.getColumn('name')?.setFilterValue(event.target.value)
                }
                className='h-9 w-full md:w-[300px]'
              />
              {search.trim() ? (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => table.getColumn('name')?.setFilterValue('')}
                >
                  Clear
                </Button>
              ) : null}
            </AdminToolbarGroup>
            <AdminToolbarGroup align='end'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' size='sm' className='h-9'>
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
            </AdminToolbarGroup>
          </AdminToolbar>
        </div>
      }
    >
      <AdminDataPanel
        meta={tableTitle}
        loading={loading && categories.length === 0}
        empty={!loading && categories.length === 0}
        emptyMessage='No categories found. Create your first category!'
      >
        <div className='overflow-x-auto rounded-md border'>
          <Table>
            <TableHeader className='sticky top-0 z-20 bg-background'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isActions = header.column.id === 'actions'
                    return (
                      <TableHead
                        key={header.id}
                        className={`whitespace-nowrap bg-background${
                          isActions
                            ? 'sticky right-0 z-30 border-l text-right shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.15)]'
                            : ''
                        }`}
                      >
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
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className='group'>
                    {row.getVisibleCells().map((cell) => {
                      const isActions = cell.column.id === 'actions'
                      return (
                        <TableCell
                          key={cell.id}
                          className={`whitespace-nowrap align-top${
                            isActions
                              ? 'sticky right-0 z-10 border-l bg-background shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.15)] group-hover:bg-muted/50'
                              : ''
                          }`}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='h-24 text-center'
                  >
                    No categories found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination table={table} persistKey='categories-page' />
      </AdminDataPanel>
    </AdminSection>
  )
}
