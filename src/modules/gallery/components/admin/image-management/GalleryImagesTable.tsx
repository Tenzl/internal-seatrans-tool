import { type Dispatch, type SetStateAction, useState } from 'react'
import {
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { GalleryImage } from '@/modules/gallery/services/galleryService'
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
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
import { galleryImageMatchesSearch } from './galleryImageRules'
import { useGalleryImageColumns } from './useGalleryImageColumns'

type GalleryImagesTableProps = {
  embedded: boolean
  images: GalleryImage[]
  totalImages: number
  totalPages: number
  currentPage: number
  loading: boolean
  rowSelection: RowSelectionState
  onRowSelectionChange: Dispatch<SetStateAction<RowSelectionState>>
  onPageChange: (page: number) => void
  onReload: () => void
  onEdit: (image: GalleryImage) => void
  onDelete: (image: GalleryImage) => void
  onDeleteSelected: (ids: number[]) => void
}

export function GalleryImagesTable({
  embedded,
  images,
  totalImages,
  totalPages,
  currentPage,
  loading,
  rowSelection,
  onRowSelectionChange,
  onPageChange,
  onReload,
  onEdit,
  onDelete,
  onDeleteSelected,
}: GalleryImagesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const columns = useGalleryImageColumns(onEdit, onDelete)

  // TanStack Table intentionally returns mutable controller functions.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: images,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) =>
      galleryImageMatchesSearch(row.original, filterValue),
    onRowSelectionChange,
    getRowId: (row) => row.id.toString(),
    state: {
      rowSelection,
      sorting,
      globalFilter,
    },
  })

  const selectedIds = table
    .getFilteredSelectedRowModel()
    .rows.map((row) => row.original.id)
  const showEmptyState = !loading && images.length === 0

  const deleteSelected = () => {
    if (!selectedIds.length) return

    const confirmed =
      typeof window === 'undefined'
        ? true
        : window.confirm('Delete selected images? This cannot be undone.')
    if (confirmed) onDeleteSelected(selectedIds)
  }

  return (
    <Card className={embedded ? 'border-border/60 shadow-none' : undefined}>
      <CardHeader className='border-b border-border/50 pb-4'>
        <div className='flex items-center justify-between gap-3'>
          <CardDescription className='text-sm'>
            {totalImages} image(s) found
          </CardDescription>
          <div className='flex items-center gap-2'>
            {images.length > 0 ? (
              <Button
                variant='destructive'
                onClick={deleteSelected}
                disabled={selectedIds.length === 0 || loading}
                className='cursor-pointer'
              >
                Delete Selected ({selectedIds.length})
              </Button>
            ) : null}
            <Button
              variant='outline'
              size='sm'
              onClick={onReload}
              disabled={loading}
              className='gap-2'
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              Reload
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showEmptyState ? (
          <div className='p-12 text-center'>
            <ImageIcon className='mx-auto mb-4 h-12 w-12 text-muted-foreground' />
            <p className='text-muted-foreground'>No images found</p>
          </div>
        ) : (
          <>
            <div className='mb-4'>
              <Input
                placeholder='Search by file, port, cargo...'
                value={globalFilter}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className='max-w-md'
                disabled={loading && images.length === 0}
              />
            </div>
            <div className='relative min-h-[12rem] overflow-x-auto rounded-md border'>
              {loading ? (
                <div
                  className='absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]'
                  aria-live='polite'
                  aria-busy='true'
                >
                  <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
                </div>
              ) : null}
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className={
                            header.id === 'thumbnail'
                              ? 'min-w-[120px]'
                              : header.id === 'select'
                                ? 'w-[40px]'
                                : ''
                          }
                        >
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
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className='hover:bg-muted/20'
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

            {totalPages > 1 ? (
              <div className='flex items-center justify-end space-x-2 py-4'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => onPageChange(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0 || loading}
                  className='cursor-pointer disabled:cursor-not-allowed'
                >
                  <ChevronLeft className='mr-1 h-4 w-4' />
                  Previous
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() =>
                    onPageChange(Math.min(totalPages - 1, currentPage + 1))
                  }
                  disabled={currentPage === totalPages - 1 || loading}
                  className='cursor-pointer disabled:cursor-not-allowed'
                >
                  Next
                  <ChevronRight className='ml-1 h-4 w-4' />
                </Button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
