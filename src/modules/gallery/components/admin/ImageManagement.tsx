import { useCallback, useEffect, useState } from 'react'
import {
  type SortingState,
  type ColumnDef,
  getFilteredRowModel,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type RowSelectionState,
} from '@tanstack/react-table'
import { Image as ImageIcon, ChevronLeft, ChevronRight, Trash2, AlertTriangle, Info, Edit2, Loader2, RefreshCw, ArrowUpDown } from 'lucide-react'
import {
  GalleryImageFilters,
  GalleryManageProvider,
  useGalleryManageFilters,
} from './galleryManageContext'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription } from '@/shared/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import { ImageWithFallback } from '@/shared/components/ImageWithFallback'
import { provinceService, type Province } from '@/modules/logistics/services/provinceService'
import { portService, type Port } from '@/modules/logistics/services/portService'
import { commodityService, type Commodity } from '@/modules/gallery/services/commodityService'
import { galleryService, type GalleryImage } from '@/modules/gallery/services/galleryService'
import { API_CONFIG } from '@/shared/config/api.config'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader } from '@/shared/components/ui/card'
import { Input } from '@/shared/components/ui/input'
import { toast } from '@/shared/utils/toast'

// Helper function to construct proper image URL
const getImageUrl = (url: string) => {
  if (!url) return ''
  // If it's already a full URL, return it
  if (url.startsWith('http')) return url
  
  // Normalize slashes
  const normalizedPath = url.replace(/\\/g, '/')
  
  // Ensure it starts with / if not present
  const path = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`
  
  const assetBase = API_CONFIG.ASSET_BASE_URL
  return `${assetBase}${path}`
}

export interface ManageImagesTabProps {
  embedded?: boolean
  /** Filters render in GalleryImageHub sidebar; requires GalleryManageProvider ancestor. */
  hideFilters?: boolean
}

export function ManageImagesTab({ embedded = false, hideFilters = false }: ManageImagesTabProps = {}) {
  if (hideFilters) {
    return <ManageImagesBody embedded={embedded} />
  }

  return (
    <GalleryManageProvider>
      <div className="space-y-6">
        <GalleryImageFilters layout="bar" />
        <ManageImagesBody embedded={embedded} />
      </div>
    </GalleryManageProvider>
  )
}

function ManageImagesBody({ embedded = false }: { embedded?: boolean }) {
  const {
    filterPort,
    filterServiceType,
    filterCommodity,
    filterProvinceId,
    serviceTypes,
  } = useGalleryManageFilters()

  const [provincesWithPorts, setProvincesWithPorts] = useState<Province[]>([])

  const [images, setImages] = useState<GalleryImage[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalImages, setTotalImages] = useState(0)
  const [isTableLoading, setIsTableLoading] = useState(false)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  
  const [currentPage, setCurrentPage] = useState(0)
  const [deleteModalImage, setDeleteModalImage] = useState<GalleryImage | null>(null)
  const [editModalImage, setEditModalImage] = useState<GalleryImage | null>(null)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [editPorts, setEditPorts] = useState<Port[]>([])
  const [editCommodities, setEditCommodities] = useState<Commodity[]>([])
  const [editForm, setEditForm] = useState<{
    provinceId: number | null
    portId: number | null
    serviceTypeId: number | null
    commodityId: number | null
  }>({
    provinceId: null,
    portId: null,
    serviceTypeId: null,
    commodityId: null,
  })
  const [commodityCounts, setCommodityCounts] = useState<Record<string, number>>({})

  const imagesPerPage = 6

  useEffect(() => {
    loadProvinces()
  }, [])

  useEffect(() => {
    setRowSelection({})
  }, [images])

  const loadProvinces = async () => {
    try {
      const data = await provinceService.getAllProvinces()
      setProvincesWithPorts(data)
    } catch (error) {
      toast.error('Failed to load provinces', error)
    }
  }

  const loadCommodityCount = useCallback(async (commodityId: number, provinceId?: number, portId?: number, serviceTypeId?: number) => {
    try {
      const countData = await commodityService.getImageCount(commodityId, provinceId, portId, serviceTypeId)
      const key = `${provinceId || 0}_${portId || 0}_${serviceTypeId || 0}_${commodityId}`
      setCommodityCounts(prev => ({ ...prev, [key]: countData.current }))
    } catch (error) {
      toast.error('Failed to load image count', error)
    }
  }, [])

  const handleDeleteClick = (image: GalleryImage) => {
    setDeleteModalImage(image)
  }

  const loadEditPorts = async (provinceId: number) => {
    try {
      const data = await portService.getPortsByProvince(provinceId)
      setEditPorts(data)
    } catch (error) {
      toast.error('Failed to load ports', error)
      setEditPorts([])
    }
  }

  const loadEditCommodities = async (serviceTypeId: number) => {
    try {
      const data = await commodityService.getCommoditiesByServiceType(serviceTypeId)
      setEditCommodities(data)
    } catch (error) {
      toast.error('Failed to load cargo types', error)
      setEditCommodities([])
    }
  }

  const handleEditClick = async (image: GalleryImage) => {
    if (!image.provinceId || !image.portId || !image.serviceTypeId || !image.commodityId) {
      alert('Image metadata is incomplete and cannot be edited.')
      return
    }

    setEditForm({
      provinceId: image.provinceId,
      portId: image.portId,
      serviceTypeId: image.serviceTypeId,
      commodityId: image.commodityId,
    })
    setEditModalImage(image)

    await Promise.all([
      loadEditPorts(image.provinceId),
      loadEditCommodities(image.serviceTypeId),
    ])
  }

  const handleSaveEdit = async () => {
    if (!editModalImage) return
    if (!editForm.provinceId || !editForm.portId || !editForm.serviceTypeId || !editForm.commodityId) {
      alert('Please select all required fields.')
      return
    }

    try {
      setIsSavingEdit(true)
      await galleryService.updateImage(editModalImage.id, {
        provinceId: editForm.provinceId,
        portId: editForm.portId,
        serviceTypeId: editForm.serviceTypeId,
        commodityId: editForm.commodityId,
      })

      setEditModalImage(null)
      await loadPage(currentPage)
    } catch {
      alert('Failed to update image information')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const deleteSelected = async () => {
    if (selectedRows.length === 0) return
    const confirmed = typeof window === 'undefined' ? true : window.confirm('Delete selected images? This cannot be undone.')
    if (!confirmed) return

    setIsTableLoading(true)
    const ids = selectedRows.map((row) => row.original.id)
    try {
      await Promise.allSettled(ids.map(id => galleryService.deleteImage(id)))
      setRowSelection({})
      await loadPage(currentPage)
    } catch {
      alert('Failed to delete some images')
    } finally {
      setIsTableLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteModalImage) return

    try {
      await galleryService.deleteImage(deleteModalImage.id)
      
      // Remove from list
      setImages(images.filter(img => img.id !== deleteModalImage.id))
      
      // Update count
      const key = `${deleteModalImage.provinceId}_${deleteModalImage.portId}_${deleteModalImage.serviceTypeId}_${deleteModalImage.commodityId}`
      if (commodityCounts[key]) {
        setCommodityCounts({
          ...commodityCounts,
          [key]: commodityCounts[key] - 1
        })
      }

      setDeleteModalImage(null)
    } catch {
      alert('Failed to delete image')
    }
  }

  const getDeleteWarningType = (image: GalleryImage): 'over' | 'below' | 'normal' => {
    const key = `${image.provinceId}_${image.portId}_${image.serviceTypeId}_${image.commodityId}`
    const count = commodityCounts[key] || 0
    if (count > 18) return 'over'
    if (count === 18) return 'below'
    return 'normal'
  }

  const loadPage = useCallback(async (page: number) => {
    setIsTableLoading(true)
    try {
      const response = await galleryService.getAllImages(
        filterProvinceId || undefined,
        filterPort || undefined,
        filterServiceType || undefined,
        filterCommodity || undefined,
        page,
        imagesPerPage
      )
      setImages(response.content)
      setTotalPages(response.totalPages)
      setTotalImages(response.totalElements)

      const uniqueCombinations = new Set<string>()
      response.content.forEach((img) => {
        const key = `${img.provinceId}_${img.portId}_${img.serviceTypeId}_${img.commodityId}`
        uniqueCombinations.add(key)
      })

      void Promise.all(
        Array.from(uniqueCombinations).map((key) => {
          const [provinceId, portId, serviceTypeId, commodityId] = key.split('_').map(Number)
          return loadCommodityCount(commodityId, provinceId, portId, serviceTypeId)
        }),
      )
    } catch (error) {
      toast.error('Failed to load images', error)
    } finally {
      setIsTableLoading(false)
    }
  }, [filterProvinceId, filterPort, filterServiceType, filterCommodity, loadCommodityCount])

  // Load when filters or page changes (realtime).
  useEffect(() => {
    void loadPage(currentPage)
  }, [currentPage, loadPage])

  const columns: ColumnDef<GalleryImage>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
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
    },
    {
      accessorKey: 'thumbnail',
      header: 'Thumbnail',
      cell: ({ row }) => {
        const image = row.original
        return (
          <Dialog>
            <DialogTrigger asChild>
              <div className="cursor-pointer hover:opacity-80 transition-opacity inline-block">
                <ImageWithFallback
                  src={getImageUrl(image.url)}
                  alt={image.fileName}
                  width={48}
                  height={48}
                  className="w-12 h-12 object-cover rounded"
                />
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogTitle className="sr-only">{image.fileName}</DialogTitle>
              <DialogDescription className="sr-only">
                {image.portName} - {image.provinceName}
              </DialogDescription>
              <ImageWithFallback
                src={getImageUrl(image.url)}
                alt={image.fileName}
                width={1200}
                height={800}
                className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              />
              <div className="mt-4 space-y-2">
                <h3 className="text-xl font-semibold">{image.portName}</h3>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">{image.provinceName}</Badge>
                  <Badge variant="secondary">{image.serviceTypeName}</Badge>
                  <Badge variant="outline">{image.commodityName}</Badge>
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
        <Button
          variant="ghost"
          className="px-0 hover:bg-transparent"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Port
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span className="text-sm">{row.original.portName}</span>,
    },
    {
      accessorKey: 'commodityName',
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="px-0 hover:bg-transparent"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Cargo Types
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.commodityName}</span>
      ),
    },
    {
      accessorKey: 'uploadedAt',
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="px-0 hover:bg-transparent"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Uploaded
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.uploadedAt
            ? new Date(row.original.uploadedAt).toLocaleDateString('vi-VN')
            : '—'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const image = row.original
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditClick(image)}
              className="text-primary hover:text-primary/90 hover:bg-primary/10 cursor-pointer"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteClick(image)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: images,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const query = String(filterValue || '').toLowerCase().trim()
      if (!query) return true
      const image = row.original
      const searchable = [
        image.fileName,
        image.provinceName,
        image.portName,
        image.commodityName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return searchable.includes(query)
    },
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id.toString(),
    state: {
      rowSelection,
      sorting,
      globalFilter,
    },
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedCount = selectedRows.length
  const showEmptyState = !isTableLoading && images.length === 0

  const tablePanel = (
      <Card className={embedded ? 'border-border/60 shadow-none' : undefined}>
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between gap-3">
            <CardDescription className="text-sm">{totalImages} image(s) found</CardDescription>
            <div className="flex items-center gap-2">
              {images.length > 0 && (
                <Button
                  variant="destructive"
                  onClick={deleteSelected}
                  disabled={selectedCount === 0 || isTableLoading}
                  className="cursor-pointer"
                >
                  Delete Selected ({selectedCount})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadPage(currentPage)}
                disabled={isTableLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isTableLoading ? 'animate-spin' : ''}`} />
                Reload
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
        {showEmptyState ? (
          <div className="p-12 text-center">
            <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No images found</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <Input
                placeholder="Search by file, port, cargo..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="max-w-md"
                disabled={isTableLoading && images.length === 0}
              />
            </div>
            <div className="relative min-h-[12rem] rounded-md border overflow-x-auto">
              {isTableLoading && (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-[1px]"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className={header.id === 'thumbnail' ? 'min-w-[120px]' : header.id === 'select' ? 'w-[40px]' : ''}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="hover:bg-muted/20" data-state={row.getIsSelected() && 'selected'}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                  disabled={currentPage === 0 || isTableLoading}
                  className="cursor-pointer disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={currentPage === totalPages - 1 || isTableLoading}
                  className="cursor-pointer disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
        </CardContent>
      </Card>
  )

  return (
    <div className={embedded ? 'space-y-0' : 'space-y-6'}>
      {tablePanel}

      <Dialog open={!!editModalImage} onOpenChange={(open) => !open && setEditModalImage(null)}>
        <DialogContent className="max-w-xl">
          <DialogTitle>Edit Image Information</DialogTitle>
          <DialogDescription>
            Update province, port, service type, and cargo type for this image.
          </DialogDescription>

          <div className="grid gap-4 py-2">
            <div>
              <label className="block text-sm font-medium mb-2">Province</label>
              <select
                value={editForm.provinceId || ''}
                onChange={async (e) => {
                  const provinceId = e.target.value ? Number(e.target.value) : null
                  setEditForm(prev => ({ ...prev, provinceId, portId: null }))
                  if (provinceId) {
                    await loadEditPorts(provinceId)
                  } else {
                    setEditPorts([])
                  }
                }}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                title="Province"
              >
                <option value="">Select province</option>
                {provincesWithPorts.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Port</label>
              <select
                value={editForm.portId || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, portId: e.target.value ? Number(e.target.value) : null }))}
                disabled={!editForm.provinceId}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:cursor-not-allowed"
                title="Port"
              >
                <option value="">Select port</option>
                {editPorts.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Service Type</label>
              <select
                value={editForm.serviceTypeId || ''}
                onChange={async (e) => {
                  const serviceTypeId = e.target.value ? Number(e.target.value) : null
                  setEditForm(prev => ({ ...prev, serviceTypeId, commodityId: null }))
                  if (serviceTypeId) {
                    await loadEditCommodities(serviceTypeId)
                  } else {
                    setEditCommodities([])
                  }
                }}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                title="Service Type"
              >
                <option value="">Select service type</option>
                {serviceTypes.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Cargo Type</label>
              <select
                value={editForm.commodityId || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, commodityId: e.target.value ? Number(e.target.value) : null }))}
                disabled={!editForm.serviceTypeId}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:cursor-not-allowed"
                title="Cargo Type"
              >
                <option value="">Select cargo type</option>
                {editCommodities.map(t => (
                  <option key={t.id} value={t.id}>{t.displayName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditModalImage(null)} disabled={isSavingEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteModalImage} onOpenChange={(open) => !open && setDeleteModalImage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {deleteModalImage && getDeleteWarningType(deleteModalImage) === 'over' && (
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              )}
              {deleteModalImage && getDeleteWarningType(deleteModalImage) === 'below' && (
                <Info className="h-5 w-5 text-info" />
              )}
              {deleteModalImage && getDeleteWarningType(deleteModalImage) === 'over' 
                ? '⚠️ Image Limit Exceeded'
                : deleteModalImage && getDeleteWarningType(deleteModalImage) === 'below'
                ? 'ℹ️ Warning: Below Required Limit'
                : 'Delete Image?'
              }
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {deleteModalImage && getDeleteWarningType(deleteModalImage) === 'over' ? (
                <>
                  This type has <strong>{commodityCounts[`${deleteModalImage.provinceId}_${deleteModalImage.portId}_${deleteModalImage.serviceTypeId}_${deleteModalImage.commodityId}`]}/18 images</strong>. 
                  You MUST delete this image to meet the requirement.
                </>
              ) : deleteModalImage && getDeleteWarningType(deleteModalImage) === 'below' ? (
                <>
                  Deleting this image will bring the count below 18. 
                  After deletion: <strong>{(commodityCounts[`${deleteModalImage.provinceId}_${deleteModalImage.portId}_${deleteModalImage.serviceTypeId}_${deleteModalImage.commodityId}`] || 18) - 1}/18</strong>
                </>
              ) : (
                <>
                  Are you sure you want to delete <strong>{deleteModalImage?.fileName}</strong>?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className={
                deleteModalImage && getDeleteWarningType(deleteModalImage) === 'over' 
                  ? 'bg-orange-500 hover:bg-orange-600' 
                  : 'bg-destructive hover:bg-destructive/90'
              }
            >
              {deleteModalImage && getDeleteWarningType(deleteModalImage) === 'over' ? 'Delete (Required)' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
