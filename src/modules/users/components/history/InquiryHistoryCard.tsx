import type { ColumnDef, SortingState, VisibilityState } from '@tanstack/react-table'
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InquiryDataTable, type InquiryDeleteMode } from './InquiryDataTable'
import type { InquiryHistoryRecord } from './inquiryHistory.types'
import type { AdminArchivedFilter } from './useInquiryData'

type InquiryHistoryCardProps = {
  title?: string
  description?: string
  rows: InquiryHistoryRecord[]
  columns: ColumnDef<InquiryHistoryRecord>[]
  isLoading: boolean
  error: string | null
  canHardDelete: boolean
  canDelete: boolean
  archivedFilter: AdminArchivedFilter
  searchKey?: string
  searchPlaceholder: string
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
  initialColumnVisibility?: VisibilityState
  onArchivedFilterChange: (filter: AdminArchivedFilter) => void
  onReload: () => void
  onDelete: (ids: number[], mode: InquiryDeleteMode) => Promise<void>
}

export function InquiryHistoryCard({
  title,
  description,
  rows,
  columns,
  isLoading,
  error,
  canHardDelete,
  canDelete,
  archivedFilter,
  searchKey,
  searchPlaceholder,
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
  initialColumnVisibility,
  onArchivedFilterChange,
  onReload,
  onDelete,
}: InquiryHistoryCardProps) {
  return (
    <Card>
      <CardHeader className='border-b border-border/50 pb-4'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='min-w-0 flex-1 space-y-1.5'>
            {title && (
              <CardTitle className='text-lg font-semibold tracking-tight'>
                {title}
              </CardTitle>
            )}
            {description && (
              <CardDescription className='max-w-2xl text-sm leading-relaxed'>
                {description}
              </CardDescription>
            )}
          </div>
          <div className='flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end'>
            {canHardDelete && (
              <Select
                value={archivedFilter}
                onValueChange={(value) =>
                  onArchivedFilterChange(value as AdminArchivedFilter)
                }
              >
                <SelectTrigger className='h-10 w-full sm:h-9 sm:w-[140px]'>
                  <SelectValue placeholder='Filter' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='active'>Active</SelectItem>
                  <SelectItem value='archived'>Archived</SelectItem>
                  <SelectItem value='all'>All</SelectItem>
                </SelectContent>
              </Select>
            )}
            <Button
              variant='outline'
              size='sm'
              onClick={onReload}
              disabled={isLoading}
              className='h-10 shrink-0 gap-2 active:scale-[0.98] sm:h-9'
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              Reload
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && rows.length === 0 ? (
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-6 w-6 animate-spin' />
          </div>
        ) : error ? (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <InquiryDataTable
            columns={columns}
            data={rows}
            searchKey={searchKey}
            searchPlaceholder={searchPlaceholder}
            search={search}
            onSearchChange={onSearchChange}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={onDateFromChange}
            onDateToChange={onDateToChange}
            sorting={sorting}
            onSortingChange={onSortingChange}
            pageIndex={pageIndex}
            pageCount={pageCount}
            totalElements={totalElements}
            onPageChange={onPageChange}
            onDelete={canDelete ? onDelete : undefined}
            canHardDelete={canHardDelete}
            initialColumnVisibility={initialColumnVisibility}
          />
        )}
      </CardContent>
    </Card>
  )
}
