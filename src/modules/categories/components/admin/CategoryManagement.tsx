"use client"

import { useState, useEffect, useMemo } from 'react'
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
import { ChevronDown, Pencil, Trash2, Plus } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  AdminDataPanel,
  AdminSection,
  AdminToolbar,
  AdminToolbarGroup,
} from '@/shared/components/layout/dashboard/admin'
import { DataTablePagination } from '@/shared/components/ui/data-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
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
import { useTableSortHeader } from '@/features/admin/hooks/useTableSortHeader'
import { categoryService, Category, CategoryRequest } from '@/modules/categories/services/categoryService'

const CATEGORIES_PAGE_SIZE = 10

export function ManageCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; category: Category | null }>({
    isOpen: false,
    category: null,
  })
  const [formData, setFormData] = useState<CategoryRequest>({
    name: '',
    slug: '',
    description: '',
  })

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  useEffect(() => {
    loadCategories()
  }, [])

  // Auto-generate slug from name
  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')      // Replace spaces with hyphens
      .replace(/-+/g, '-')       // Remove consecutive hyphens
  }

  // Capitalize first letter of each word
  const capitalizeWords = (text: string): string => {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const loadCategories = async () => {
    try {
      setLoading(true)
      setErrorMessage(null)
      const data = await categoryService.getAdminCategories()
      setCategories(data)

      // Show info message if no categories loaded from backend
      if (data.length === 0) {
        console.log('No categories loaded. Backend endpoints may not be implemented yet.')
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      // Don't show error to user, just use empty list
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingId) {
        await categoryService.updateCategory(editingId, formData)
        setSuccessMessage('Category updated successfully')
      } else {
        await categoryService.createCategory(formData)
        setSuccessMessage('Category created successfully')
      }

      resetForm()
      loadCategories()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error: any) {
      console.error('Error saving category:', error)
      setErrorMessage(error.message || 'Failed to save category')
      setTimeout(() => setErrorMessage(null), 3000)
    }
  }

  const handleEdit = (category: Category) => {
    setIsEditing(true)
    setEditingId(category.id)
    setFormData({
      name: category.name,
      slug: generateSlug(category.name),
      description: category.description || '',
    })
  }

  const handleDelete = (category: Category) => {
    setDeleteDialog({ isOpen: true, category })
  }

  const confirmDelete = async () => {
    if (!deleteDialog.category) return

    try {
      await categoryService.deleteCategory(deleteDialog.category.id)
      setSuccessMessage('Category deleted successfully')
      loadCategories()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error: any) {
      console.error('Error deleting category:', error)
      // Check if error is due to foreign key constraint
      if (error.message && (error.message.includes('foreign key constraint') || error.message.includes('Cannot delete or update a parent row'))) {
        setErrorMessage(`Cannot delete "${deleteDialog.category.name}" - this category is being used by one or more posts. Please remove it from posts first.`)
      } else {
        setErrorMessage(error.message || 'Failed to delete category')
      }
      setTimeout(() => setErrorMessage(null), 5000)
    } finally {
      setDeleteDialog({ isOpen: false, category: null })
    }
  }

  const resetForm = () => {
    setIsEditing(false)
    setEditingId(null)
    setFormData({ name: '', slug: '', description: '' })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const renderSortableHeader = useTableSortHeader<Category>()

  const columns = useMemo<ColumnDef<Category>[]>(
    () => [
      {
        accessorKey: 'id',
        header: renderSortableHeader('ID'),
        cell: ({ row }) => <span className="tabular-nums">{row.original.id}</span>,
      },
      {
        accessorKey: 'name',
        header: renderSortableHeader('Name'),
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: 'description',
        header: 'Description',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground block max-w-md truncate">
            {row.original.description || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: renderSortableHeader('Created At'),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: 'Actions',
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => {
          const category = row.original
          return (
            <div className="flex items-center justify-end gap-0.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEdit(category)}
                title="Edit"
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDelete(category)}
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const table = useReactTable({
    data: categories,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    initialState: { pagination: { pageIndex: 0, pageSize: CATEGORIES_PAGE_SIZE } },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const search = (table.getColumn('name')?.getFilterValue() as string) ?? ''
  const total = categories.length
  const filteredCount = table.getFilteredRowModel().rows.length
  const tableTitle = search.trim()
    ? `${filteredCount} result${filteredCount === 1 ? '' : 's'}`
    : `All Categories (${total})`

  return (
    <>
      <AdminSection
        description="Manage post categories. Search by name; create or edit categories with the form below."
        toolbar={
          <div className="space-y-4">
            {/* Create/Edit Form */}
            <div className="rounded-lg border bg-muted/20 p-4">
              <h3 className="mb-4 font-medium">
                {isEditing ? 'Edit Category' : 'Create New Category'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Category Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      const newName = capitalizeWords(e.target.value)
                      setFormData({
                        ...formData,
                        name: newName,
                        slug: generateSlug(newName),
                      })
                    }}
                    required
                    maxLength={100}
                    placeholder="e.g., Industry News, Company Updates"
                    className="mt-1"
                  />
                  {formData.slug && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Slug: <span className="font-mono">{formData.slug}</span>
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    maxLength={500}
                    placeholder="Optional description for this category"
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="cursor-pointer">
                    {isEditing ? 'Update Category' : 'Create Category'}
                  </Button>
                  {isEditing && (
                    <Button type="button" variant="outline" onClick={resetForm} className="cursor-pointer">
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </div>

            {/* Success/Error Messages */}
            {successMessage && (
              <div className="flex items-center justify-between rounded-lg border-2 border-success bg-success/10 p-4 text-success">
                <span className="font-medium">{successMessage}</span>
                <button type="button" aria-label="Dismiss" onClick={() => setSuccessMessage(null)} className="cursor-pointer">
                  <Plus className="h-4 w-4 rotate-45" />
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-center justify-between rounded-lg border-2 border-red-500 bg-red-50 p-4 text-red-800">
                <span className="font-medium">{errorMessage}</span>
                <button type="button" aria-label="Dismiss" onClick={() => setErrorMessage(null)} className="cursor-pointer">
                  <Plus className="h-4 w-4 rotate-45" />
                </button>
              </div>
            )}

            {/* Table toolbar */}
            <AdminToolbar>
              <AdminToolbarGroup>
                <Input
                  placeholder="Search categories by name"
                  value={search}
                  onChange={(e) => table.getColumn('name')?.setFilterValue(e.target.value)}
                  className="h-9 w-full md:w-[300px]"
                />
                {search.trim() ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => table.getColumn('name')?.setFilterValue('')}
                  >
                    Clear
                  </Button>
                ) : null}
              </AdminToolbarGroup>
              <AdminToolbarGroup align="end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9">
                      Columns <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {table.getAllColumns().filter((c) => c.getCanHide()).map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
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
          emptyMessage="No categories found. Create your first category!"
        >
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 z-20 bg-background">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const isActions = header.column.id === "actions"
                      return (
                        <TableHead
                          key={header.id}
                          className={`bg-background whitespace-nowrap${
                            isActions ? " sticky right-0 z-30 border-l text-right shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.15)]" : ""
                          }`}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="group">
                      {row.getVisibleCells().map((cell) => {
                        const isActions = cell.column.id === "actions"
                        return (
                          <TableCell
                            key={cell.id}
                            className={`whitespace-nowrap align-top${
                              isActions
                                ? " sticky right-0 z-10 border-l bg-background shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.15)] group-hover:bg-muted/50"
                                : ""
                            }`}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No categories found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination table={table} persistKey="categories-page" />
        </AdminDataPanel>
      </AdminSection>

      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, category: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete category "<strong>{deleteDialog.category?.name}</strong>"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
