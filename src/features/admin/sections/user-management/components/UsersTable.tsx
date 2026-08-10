import { useMemo, useState } from 'react'
import {
  type ColumnDef,
  type SortingState,
  functionalUpdate,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { AdminDataPanel } from '@/shared/components/layout/dashboard/admin'
import {
  Ban,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Pencil,
  UserCheck,
  UserCog,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DataTableContent,
  DataTablePagination,
} from '@/components/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AdminUserRow } from '../api/adminUsersService'
import type { UserRowActions } from '../model/userManagement.types'

type UsersTableProps = {
  users: AdminUserRow[]
  isLoading: boolean
  totalElements: number
  pageIndex: number
  pageCount: number
  pageSize: number
  onPageChange: (page: number) => void
  actions: UserRowActions
}

export function UsersTable({
  users,
  isLoading,
  totalElements,
  pageIndex,
  pageCount,
  pageSize,
  onPageChange,
  actions,
}: UsersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'createdAt', desc: true },
  ])

  const columns = useMemo<ColumnDef<AdminUserRow>[]>(
    () => [
      {
        id: 'no',
        header: 'No.',
        cell: (context) => pageIndex * pageSize + context.row.index + 1,
        enableSorting: false,
        meta: { className: 'w-16' },
      },
      {
        accessorKey: 'fullName',
        header: 'Name',
        cell: ({ row }) => (
          <div className='flex items-center gap-2'>
            <span>{row.original.fullName ?? '—'}</span>
            {!row.original.isActive && (
              <Badge variant='secondary' className='text-muted-foreground'>
                Inactive
              </Badge>
            )}
          </div>
        ),
        meta: { className: 'min-w-[220px]' },
      },
      {
        accessorKey: 'username',
        header: 'Username',
        cell: (context) => context.getValue<string | null>() ?? '—',
        meta: { className: 'min-w-[160px]' },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: (context) => context.getValue<string>() || '—',
        meta: { className: 'min-w-[220px]' },
      },
      {
        accessorKey: 'companyEmail',
        header: 'Company email',
        cell: (context) => context.getValue<string | null>() ?? '—',
        meta: { className: 'min-w-[220px]' },
      },
      {
        accessorKey: 'roleName',
        header: 'Role',
        cell: (context) => context.getValue<string | null>() ?? '—',
        meta: { className: 'w-44' },
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: (context) => {
          const value = context.getValue<string>()
          return value ? new Date(value).toLocaleString() : '—'
        },
        meta: { className: 'w-56' },
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        meta: { className: 'w-16' },
        cell: ({ row }) => (
          <UserActionsMenu user={row.original} actions={actions} />
        ),
      },
    ],
    [actions, pageIndex, pageSize]
  )

  // TanStack Table exposes mutable helpers that React Compiler intentionally skips.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: users,
    columns,
    manualPagination: true,
    pageCount,
    rowCount: totalElements,
    state: {
      sorting,
      pagination: { pageIndex, pageSize },
    },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const next = functionalUpdate(updater, { pageIndex, pageSize })
      onPageChange(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    autoResetPageIndex: false,
  })

  return (
    <AdminDataPanel>
      {isLoading ? (
        <div className='flex items-center gap-2 p-6 text-sm text-muted-foreground'>
          <Loader2 className='h-4 w-4 animate-spin' />
          Loading users…
        </div>
      ) : (
        <>
          <DataTableContent table={table} columnCount={columns.length} />
          <DataTablePagination
            table={table}
            totalRowCount={totalElements}
            isFetching={isLoading}
          />
        </>
      )}
    </AdminDataPanel>
  )
}

function UserActionsMenu({
  user,
  actions,
}: {
  user: AdminUserRow
  actions: UserRowActions
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>Open actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onSelect={() => actions.onEdit(user)}>
          <Pencil className='mr-2 h-4 w-4' />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.onChangeRole(user)}>
          <UserCog className='mr-2 h-4 w-4' />
          Change role
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => actions.onResetPassword(user)}>
          <KeyRound className='mr-2 h-4 w-4' />
          Reset password
        </DropdownMenuItem>
        {user.isActive ? (
          <DropdownMenuItem
            variant='destructive'
            onSelect={() => actions.onDeactivate(user)}
          >
            <Ban className='mr-2 h-4 w-4' />
            Deactivate user
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => actions.onReactivate(user)}>
            <UserCheck className='mr-2 h-4 w-4' />
            Reactivate user
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
