import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { GalleryImage } from '@/modules/gallery/services/galleryService'
import { ImageWithFallback } from '@/shared/components/ImageWithFallback'
import { Edit2, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { GallerySortableColumnHeader } from './GallerySortableColumnHeader'
import { getGalleryImageUrl } from './galleryImageRules'

export function useGalleryImageColumns(
  onEdit: (image: GalleryImage) => void,
  onDelete: (image: GalleryImage) => void
) {
  return useMemo<ColumnDef<GalleryImage>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(Boolean(value))
            }
            aria-label='Select all'
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
            aria-label='Select row'
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'thumbnail',
        header: 'Thumbnail',
        cell: ({ row }) => {
          const image = row.original
          return (
            <Dialog>
              <DialogTrigger asChild>
                <div className='inline-block cursor-pointer transition-opacity hover:opacity-80'>
                  <ImageWithFallback
                    src={getGalleryImageUrl(image.url)}
                    alt={image.fileName}
                    width={48}
                    height={48}
                    className='h-12 w-12 rounded object-cover'
                  />
                </div>
              </DialogTrigger>
              <DialogContent className='max-w-4xl'>
                <DialogTitle className='sr-only'>{image.fileName}</DialogTitle>
                <DialogDescription className='sr-only'>
                  {image.portName} - {image.provinceName}
                </DialogDescription>
                <ImageWithFallback
                  src={getGalleryImageUrl(image.url)}
                  alt={image.fileName}
                  width={1200}
                  height={800}
                  className='h-auto max-h-[80vh] w-full rounded-lg object-contain'
                />
                <div className='mt-4 space-y-2'>
                  <h3 className='text-xl font-semibold'>{image.portName}</h3>
                  <div className='flex flex-wrap gap-2'>
                    <Badge variant='secondary'>{image.provinceName}</Badge>
                    <Badge variant='secondary'>{image.serviceTypeName}</Badge>
                    <Badge variant='outline'>{image.commodityName}</Badge>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )
        },
      },
      {
        accessorKey: 'portName',
        header: ({ column }) => (
          <GallerySortableColumnHeader
            label='Port'
            descending={column.getIsSorted() === 'asc'}
            onToggle={(descending) => column.toggleSorting(descending)}
          />
        ),
        cell: ({ row }) => (
          <span className='text-sm'>{row.original.portName}</span>
        ),
      },
      {
        accessorKey: 'commodityName',
        header: ({ column }) => (
          <GallerySortableColumnHeader
            label='Cargo Types'
            descending={column.getIsSorted() === 'asc'}
            onToggle={(descending) => column.toggleSorting(descending)}
          />
        ),
        cell: ({ row }) => (
          <span className='text-sm'>{row.original.commodityName}</span>
        ),
      },
      {
        accessorKey: 'uploadedAt',
        header: ({ column }) => (
          <GallerySortableColumnHeader
            label='Uploaded'
            descending={column.getIsSorted() === 'asc'}
            onToggle={(descending) => column.toggleSorting(descending)}
          />
        ),
        cell: ({ row }) => (
          <span className='text-sm'>
            {row.original.uploadedAt
              ? new Date(row.original.uploadedAt).toLocaleDateString('vi-VN')
              : '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }) => (
          <div className='flex items-center justify-end gap-1'>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => onEdit(row.original)}
              className='cursor-pointer text-primary hover:bg-primary/10 hover:text-primary/90'
            >
              <Edit2 className='h-4 w-4' />
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => onDelete(row.original)}
              className='cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700'
            >
              <Trash2 className='h-4 w-4' />
            </Button>
          </div>
        ),
      },
    ],
    [onDelete, onEdit]
  )
}
