import { useState } from 'react'
import {
  type SortingState,
  type VisibilityState,
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  AdminDataPanel,
  AdminSection,
  AdminToolbar,
  AdminToolbarGroup,
} from '@/shared/components/layout/dashboard/admin'
import { ChevronDown, FileSpreadsheet, Plus, Trash2 } from 'lucide-react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CUSTOMER_STATUS_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
  formatAdditionTypeLabel,
  PARTNER_ADDITION_TYPE_OPTIONS,
} from './partnerFormModel'
import { PARTNERS_PAGE_SIZE } from './partnerManagementService'
import type {
  BookingPartnerListItem,
  CustomerStatus,
  CustomerType,
  PartnerAdditionType,
} from './partnerManagementTypes'
import { usePartnerTableColumns } from './usePartnerTableColumns'

type PartnerTableProps = {
  rows: BookingPartnerListItem[]
  totalElements: number
  pageCount: number
  pageIndex: number
  loading: boolean
  search: string
  additionType: PartnerAdditionType | 'ALL'
  customerStatus: CustomerStatus | 'ALL'
  customerType: CustomerType | 'ALL'
  onPageChange: (page: number) => void
  onSearchChange: (search: string) => void
  onAdditionTypeChange: (type: PartnerAdditionType | 'ALL') => void
  onCustomerStatusChange: (status: CustomerStatus | 'ALL') => void
  onCustomerTypeChange: (type: CustomerType | 'ALL') => void
  onCreate: () => void
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onDeleteAll: () => void
  canHardDelete: boolean
  onImport: () => void
}

const MOBILE_COLUMN_VISIBILITY: VisibilityState = {
  country: false,
  city: false,
  contacts: false,
  phone: false,
  fax: false,
  trackingUrl: false,
  customerType: false,
  taxNumber: false,
  approveStatus: false,
  updatedBy: false,
  updatedAt: false,
}

const createInitialColumnVisibility = (): VisibilityState => {
  const visibility: VisibilityState = {
    address: false,
    approveBy: false,
    companyEstablishmentDate: false,
    paymentDueDays: false,
    contractNo: false,
    invoiceCompanyName: false,
    invoiceCompanyAddress: false,
    invoiceCompanyPhone: false,
    invoiceCompanyEmail: false,
    invoiceBankName: false,
    invoiceBankBranch: false,
    invoiceBankAccount: false,
  }

  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 767px)').matches
  ) {
    return { ...visibility, ...MOBILE_COLUMN_VISIBILITY }
  }

  return visibility
}

export function PartnerTable({
  rows,
  totalElements,
  pageCount,
  pageIndex,
  loading,
  search,
  additionType,
  customerStatus,
  customerType,
  onPageChange,
  onSearchChange,
  onAdditionTypeChange,
  onCustomerStatusChange,
  onCustomerTypeChange,
  onCreate,
  onEdit,
  onDelete,
  onDeleteAll,
  canHardDelete,
  onImport,
}: PartnerTableProps) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    createInitialColumnVisibility
  )
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'updatedAt', desc: true },
  ])
  const columns = usePartnerTableColumns(onEdit, onDelete, canHardDelete)

  // TanStack Table intentionally returns mutable controller functions.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    manualPagination: true,
    rowCount: totalElements,
    pageCount,
    state: {
      sorting,
      columnVisibility,
      pagination: { pageIndex, pageSize: PARTNERS_PAGE_SIZE },
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const next = functionalUpdate(updater, {
        pageIndex,
        pageSize: PARTNERS_PAGE_SIZE,
      })
      onPageChange(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    autoResetPageIndex: false,
  })

  const tableTitle = search.trim()
    ? `${totalElements} result${totalElements === 1 ? '' : 's'}`
    : `All Partners (${totalElements})`

  return (
    <AdminSection
      description='Partner profiles for booking. Search and filters run on the server; 20 records per page.'
      actions={
        <>
          {canHardDelete ? (
            <Button
              variant='outline'
              size='sm'
              onClick={onDeleteAll}
              disabled={totalElements === 0}
              className='gap-2 text-destructive transition-transform hover:text-destructive active:scale-[0.98]'
            >
              <Trash2 className='h-4 w-4' />
              Delete all
            </Button>
          ) : null}
          <Button
            variant='outline'
            size='sm'
            onClick={onImport}
            className='gap-2 transition-transform active:scale-[0.98]'
          >
            <FileSpreadsheet className='h-4 w-4' />
            Import
          </Button>
          <Button
            size='sm'
            onClick={onCreate}
            className='gap-2 transition-transform active:scale-[0.98]'
          >
            <Plus className='h-4 w-4' />
            Add partner
          </Button>
        </>
      }
      toolbar={
        <div className='space-y-3'>
          <div className='flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
            <Button
              className='h-8 shrink-0 px-2.5 text-[11px] font-medium'
              variant={additionType === 'ALL' ? 'default' : 'outline'}
              onClick={() => onAdditionTypeChange('ALL')}
            >
              All types
            </Button>
            {PARTNER_ADDITION_TYPE_OPTIONS.map((type) => (
              <Button
                key={type}
                className='h-8 shrink-0 px-2.5 text-[11px] font-medium'
                variant={additionType === type ? 'default' : 'outline'}
                onClick={() => onAdditionTypeChange(type)}
              >
                {formatAdditionTypeLabel(type)}
              </Button>
            ))}
          </div>
          <AdminToolbar>
            <AdminToolbarGroup>
              <Input
                placeholder='Name, customer ID, or tax number'
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                className='h-9 w-full md:w-[300px]'
              />
              {search.trim() ? (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => onSearchChange('')}
                >
                  Clear
                </Button>
              ) : null}
              <Select
                value={customerStatus}
                onValueChange={(value) =>
                  onCustomerStatusChange(value as CustomerStatus | 'ALL')
                }
              >
                <SelectTrigger className='h-9 w-full md:w-[160px]'>
                  <SelectValue placeholder='Status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>All status</SelectItem>
                  {CUSTOMER_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={customerType}
                onValueChange={(value) =>
                  onCustomerTypeChange(value as CustomerType | 'ALL')
                }
              >
                <SelectTrigger className='h-9 w-full md:w-[150px]'>
                  <SelectValue placeholder='Type' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>All types</SelectItem>
                  {CUSTOMER_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                          column.toggleVisibility(Boolean(value))
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
        loading={loading && rows.length === 0}
        empty={!loading && rows.length === 0}
        emptyMessage='No partners match your filters. Adjust search or type filters and try again.'
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
                            ? 'sticky right-0 z-30 border-l shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.15)]'
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
                    No partners found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination
          table={table}
          persistKey='partners-page'
          totalRowCount={totalElements}
          isFetching={loading && rows.length > 0}
        />
      </AdminDataPanel>
    </AdminSection>
  )
}
