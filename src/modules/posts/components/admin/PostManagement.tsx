'use client'

import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ADMIN_POSTS_PAGE_SIZE,
  ADMIN_POSTS_QUERY_ROOT,
  postService,
  type PostListItem,
} from '@/modules/posts/services/postService'
import { queryKeys } from '@/shared/config/react-query.config'
import {
  AdminDataPanel,
  AdminSection,
  AdminToolbar,
  AdminToolbarGroup,
} from '@/shared/components/layout/dashboard/admin'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { useTableSortHeader } from '@/shared/hooks/useTableSortHeader'
import { toast } from '@/shared/utils/toast'
import {
  ChevronDown,
  Pencil,
  Trash2,
  Eye,
  Plus,
  MoreVertical,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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

export function ManagePosts() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [pageIndex, setPageIndex] = useState(0)
  const debouncedSearch = useDebouncedValue(search, 250)

  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean
    post: PostListItem | null
  }>({
    isOpen: false,
    post: null,
  })

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const postsQuery = useQuery({
    queryKey: queryKeys.adminPosts({
      page: pageIndex,
      size: ADMIN_POSTS_PAGE_SIZE,
      q: debouncedSearch,
    }),
    queryFn: ({ signal }) =>
      postService.getAdminPostsPage(
        {
          page: pageIndex,
          size: ADMIN_POSTS_PAGE_SIZE,
          q: debouncedSearch,
        },
        signal
      ),
  })

  const posts = postsQuery.data?.content ?? []
  const totalElements = postsQuery.data?.totalElements ?? 0
  const pageCount = Math.max(
    1,
    Number(postsQuery.data?.totalPages) ||
      Math.ceil(totalElements / ADMIN_POSTS_PAGE_SIZE) ||
      1
  )
  const safePage = Math.min(pageIndex, pageCount - 1)
  const loading = postsQuery.isLoading || postsQuery.isFetching
  const invalidatePosts = async () => {
    await queryClient.invalidateQueries({ queryKey: ADMIN_POSTS_QUERY_ROOT })
  }

  const handleOpenEditor = (post?: PostListItem) => {
    const url = post ? `/content/posts/${post.id}/edit` : '/content/posts/new'
    router.push(url)
  }

  const handleTogglePublish = async (post: PostListItem) => {
    try {
      if (post.isPublished) {
        await postService.unpublishPost(post.id)
        toast.success('Post unpublished successfully')
      } else {
        await postService.publishPost(post.id)
        toast.success('Post published successfully')
      }
      await invalidatePosts()
    } catch {
      toast.error('Failed to update publish status')
    }
  }

  const handleDelete = async (post: PostListItem) => {
    setDeleteDialog({ isOpen: true, post })
  }

  const confirmDelete = async () => {
    if (!deleteDialog.post) return

    try {
      await postService.deletePost(deleteDialog.post.id)
      toast.success('Post deleted successfully')
      await invalidatePosts()
    } catch {
      toast.error('Failed to delete post')
    } finally {
      setDeleteDialog({ isOpen: false, post: null })
    }
  }

  const handlePreview = (post: PostListItem) => {
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

  const renderSortableHeader = useTableSortHeader<PostListItem>()

  const columns = useMemo<ColumnDef<PostListItem>[]>(
    () => [
      {
        accessorKey: 'id',
        header: renderSortableHeader('ID'),
        cell: ({ row }) => (
          <span className='tabular-nums'>{row.original.id}</span>
        ),
      },
      {
        accessorKey: 'title',
        header: renderSortableHeader('Title'),
        cell: ({ row }) => (
          <span
            className='block max-w-xs truncate font-medium'
            title={row.original.title}
          >
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
            <div className='flex flex-wrap gap-1'>
              {categories && categories.length > 0 ? (
                categories.map((cat) => (
                  <Badge key={cat.id} variant='outline' className='text-xs'>
                    {cat.name}
                  </Badge>
                ))
              ) : (
                <span className='text-xs text-muted-foreground'>
                  No categories
                </span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'updatedAt',
        header: renderSortableHeader('Updated At'),
        cell: ({ row }) => (
          <span className='text-sm text-muted-foreground'>
            {formatDate(row.original.updatedAt)}
          </span>
        ),
      },
      {
        accessorKey: 'isPublished',
        header: renderSortableHeader('Status'),
        cell: ({ row }) => {
          const post = row.original
          return (
            <Badge
              variant={post.isPublished ? 'default' : 'secondary'}
              className='hover-primary-effect cursor-pointer'
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
            <div className='flex items-center justify-end'>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                    <MoreVertical className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem
                    onClick={() => handlePreview(post)}
                    className='cursor-pointer'
                  >
                    <Eye className='mr-2 h-4 w-4' />
                    Preview
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleOpenEditor(post)}
                    className='cursor-pointer'
                  >
                    <Pencil className='mr-2 h-4 w-4' />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleDelete(post)}
                    className='cursor-pointer text-destructive focus:text-destructive'
                  >
                    <Trash2 className='mr-2 h-4 w-4' />
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
    []
  )

  const table = useReactTable({
    data: posts,
    columns,
    manualPagination: true,
    pageCount,
    rowCount: totalElements,
    state: {
      sorting,
      columnVisibility,
      pagination: { pageIndex: safePage, pageSize: ADMIN_POSTS_PAGE_SIZE },
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const next = functionalUpdate(updater, {
        pageIndex: safePage,
        pageSize: ADMIN_POSTS_PAGE_SIZE,
      })
      setPageIndex(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    autoResetPageIndex: false,
  })

  const tableTitle = debouncedSearch.trim()
    ? `${totalElements} result${totalElements === 1 ? '' : 's'}`
    : `All Posts (${totalElements})`

  return (
    <>
      <AdminSection
        description='Manage insight posts. Search runs across titles; sort columns and toggle visibility as needed.'
        actions={
          <Button
            onClick={() => handleOpenEditor()}
            className='gap-2 transition-transform active:scale-[0.98]'
          >
            <Plus className='h-4 w-4' />
            Create Post
          </Button>
        }
        toolbar={
          <AdminToolbar>
            <AdminToolbarGroup>
              <Input
                placeholder='Search posts by title'
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPageIndex(0)
                }}
                className='h-9 w-full md:w-[300px]'
              />
              {search.trim() ? (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => {
                    setSearch('')
                    setPageIndex(0)
                  }}
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
                    .filter((c) => c.getCanHide())
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
        }
      >
        <AdminDataPanel
          meta={tableTitle}
          loading={loading && posts.length === 0}
          empty={!loading && totalElements === 0}
          emptyMessage='No posts found. Create your first post!'
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
                          className={`bg-background whitespace-nowrap${
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
                {table.getRowModel().rows?.length ? (
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
                      No posts found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination
            table={table}
            totalRowCount={totalElements}
            isFetching={postsQuery.isFetching}
          />
        </AdminDataPanel>
      </AdminSection>

      <AlertDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) =>
          !open && setDeleteDialog({ isOpen: false, post: null })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete post "
              <strong>{deleteDialog.post?.title}</strong>"? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className='bg-destructive hover:bg-destructive/90'
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
