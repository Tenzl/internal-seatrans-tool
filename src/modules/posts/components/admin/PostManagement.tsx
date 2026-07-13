"use client"

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
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
import { ChevronDown, Pencil, Trash2, Eye, Plus, MoreVertical } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { Input } from '@/shared/components/ui/input'
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
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { postService, type Post } from '@/modules/posts/services/postService'
import { toast } from '@/shared/utils/toast'

const POSTS_PAGE_SIZE = 10

export function ManagePosts() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; post: Post | null }>({
    isOpen: false,
    post: null,
  })

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  useEffect(() => {
    loadPosts()

    const handleFocus = () => {
      loadPosts()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const loadPosts = async () => {
    try {
      setLoading(true)
      const data = await postService.getAllPosts()
      const sortedByIdAsc = [...data].sort((a, b) => a.id - b.id)
      setPosts(sortedByIdAsc)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load posts'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenEditor = (post?: Post) => {
    // Navigate in same tab
    const url = post
      ? `/content/posts/${post.id}/edit`
      : '/content/posts/new'
    router.push(url)
  }

  const handleTogglePublish = async (post: Post) => {
    try {
      if (post.isPublished) {
        await postService.unpublishPost(post.id)
        toast.success("Post unpublished successfully")
      } else {
        await postService.publishPost(post.id)
        toast.success("Post published successfully")
      }

      loadPosts()
    } catch {
      toast.error("Failed to update publish status")
    }
  }

  const handleDelete = async (post: Post) => {
    setDeleteDialog({ isOpen: true, post })
  }

  const confirmDelete = async () => {
    if (!deleteDialog.post) return

    try {
      await postService.deletePost(deleteDialog.post.id)
      toast.success("Post deleted successfully")
      loadPosts()
    } catch {
      toast.error("Failed to delete post")
    } finally {
      setDeleteDialog({ isOpen: false, post: null })
    }
  }

  const handlePreview = (post: Post) => {
    const url = `/insights/${post.id}`
    router.push(url)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderSortableHeader = useTableSortHeader<Post>()

  const columns = useMemo<ColumnDef<Post>[]>(
    () => [
      {
        accessorKey: 'id',
        header: renderSortableHeader('ID'),
        cell: ({ row }) => <span className="tabular-nums">{row.original.id}</span>,
      },
      {
        accessorKey: 'title',
        header: renderSortableHeader('Title'),
        cell: ({ row }) => (
          <span className="font-medium block max-w-xs truncate" title={row.original.title}>
            {row.original.title}
          </span>
        ),
      },
      {
        id: 'categories',
        header: 'Categories',
        enableSorting: false,
        cell: ({ row }) => {
          const categories = row.original.categories
          return (
            <div className="flex flex-wrap gap-1">
              {categories && categories.length > 0 ? (
                categories.map((cat) => (
                  <Badge key={cat.id} variant="outline" className="text-xs">{cat.name}</Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No categories</span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'updatedAt',
        header: renderSortableHeader('Updated At'),
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{formatDate(row.original.updatedAt)}</span>
        ),
      },
      {
        accessorKey: 'isPublished',
        header: renderSortableHeader('Status'),
        cell: ({ row }) => {
          const post = row.original
          return (
            <Badge
              variant={post.isPublished ? "default" : "secondary"}
              className="cursor-pointer hover-primary-effect"
              onClick={() => handleTogglePublish(post)}
            >
              {post.isPublished ? 'Published' : 'Draft'}
            </Badge>
          )
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => {
          const post = row.original
          return (
            <div className="flex items-center justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handlePreview(post)} className="cursor-pointer">
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleOpenEditor(post)} className="cursor-pointer">
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(post)}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const table = useReactTable({
    data: posts,
    columns,
    state: { sorting, columnFilters, columnVisibility },
    initialState: { pagination: { pageIndex: 0, pageSize: POSTS_PAGE_SIZE } },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const search = (table.getColumn('title')?.getFilterValue() as string) ?? ''
  const total = posts.length
  const tableTitle = search.trim()
    ? `${table.getFilteredRowModel().rows.length} result${table.getFilteredRowModel().rows.length === 1 ? '' : 's'}`
    : `All Posts (${total})`

  return (
    <>
      <AdminSection
        description="Manage insight posts. Search runs across titles; sort columns and toggle visibility as needed."
        actions={
          <Button onClick={() => handleOpenEditor()} className="gap-2 transition-transform active:scale-[0.98]">
            <Plus className="h-4 w-4" />
            Create Post
          </Button>
        }
        toolbar={
          <AdminToolbar>
            <AdminToolbarGroup>
              <Input
                placeholder="Search posts by title"
                value={search}
                onChange={(e) => table.getColumn('title')?.setFilterValue(e.target.value)}
                className="h-9 w-full md:w-[300px]"
              />
              {search.trim() ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => table.getColumn('title')?.setFilterValue('')}
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
        }
      >
        <AdminDataPanel
          meta={tableTitle}
          loading={loading && posts.length === 0}
          empty={!loading && posts.length === 0}
          emptyMessage="No posts found. Create your first post!"
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
                      No posts found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination table={table} persistKey="posts-page" />
        </AdminDataPanel>
      </AdminSection>

      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, post: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete post "<strong>{deleteDialog.post?.title}</strong>"?
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
