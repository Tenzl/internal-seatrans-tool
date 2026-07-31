'use client'

import { useMemo, useState } from 'react'
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  functionalUpdate,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  PORTS_ADMIN_LIST_SIZE,
  type Port,
} from '@/modules/logistics/services/portService'
import { useTableSortHeader } from '@/shared/hooks/useTableSortHeader'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PortTableRow } from './portManagement.types'

const INITIAL_COLUMN_VISIBILITY: VisibilityState = {
  portOfCall: false,
  zoneCode: false,
  latitude: false,
  longitude: false,
  hasInfo: false,
}

function getInitialColumnVisibility(): VisibilityState {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 767px)').matches
  ) {
    return {
      ...INITIAL_COLUMN_VISIBILITY,
      provinceName: false,
      countryCode: false,
      code: false,
    }
  }
  return { ...INITIAL_COLUMN_VISIBILITY }
}

interface UsePortsTableOptions {
  rows: PortTableRow[]
  totalElements: number
  pageCount: number
  pageIndex: number
  busy: boolean
  onPageChange: (page: number) => void
  onEdit: (port: Port) => void
  onDelete: (portId: number, portName: string) => Promise<void>
  onToggleHasInfo: (port: Port) => Promise<void>
}

export function usePortsTable({
  rows,
  totalElements,
  pageCount,
  pageIndex,
  busy,
  onPageChange,
  onEdit,
  onDelete,
  onToggleHasInfo,
}: UsePortsTableOptions) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    getInitialColumnVisibility
  )
  const renderSortableHeader = useTableSortHeader<PortTableRow>()

  const columns = useMemo<ColumnDef<PortTableRow>[]>(
    () => [
      {
        accessorKey: 'area',
        header: renderSortableHeader('Area'),
        cell: ({ row }) => row.original.area,
      },
      {
        accessorKey: 'provinceName',
        header: renderSortableHeader('Province'),
        cell: ({ row }) => row.original.provinceName,
      },
      {
        accessorKey: 'name',
        header: renderSortableHeader('Port Name'),
        cell: ({ row }) => (
          <span className='font-medium'>{row.original.name}</span>
        ),
      },
      {
        accessorKey: 'portOfCall',
        header: renderSortableHeader('Port of Call'),
        cell: ({ row }) => row.original.portOfCall || '-',
      },
      {
        accessorKey: 'code',
        header: 'Code',
        cell: ({ row }) => row.original.code || '-',
      },
      {
        accessorKey: 'zoneCode',
        header: 'Zone',
        cell: ({ row }) => row.original.zoneCode || '-',
      },
      {
        accessorKey: 'countryCode',
        header: 'Country',
        cell: ({ row }) => row.original.countryCode || '-',
      },
      {
        accessorKey: 'latitude',
        header: 'Latitude',
        cell: ({ row }) => row.original.latitude ?? '-',
      },
      {
        accessorKey: 'longitude',
        header: 'Longitude',
        cell: ({ row }) => row.original.longitude ?? '-',
      },
      {
        id: 'hasInfo',
        header: 'Has Info',
        enableSorting: false,
        cell: ({ row }) => {
          const port = row.original
          return (
            <Button
              variant={port.hasInfo === 1 ? 'default' : 'outline'}
              size='sm'
              onClick={() => void onToggleHasInfo(port)}
              disabled={busy}
            >
              {port.hasInfo === 1 ? 'Active' : 'Inactive'}
            </Button>
          )
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const port = row.original
          return (
            <div className='flex items-center justify-end gap-0.5'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => onEdit(port)}
                disabled={busy}
                aria-label={`Edit ${port.name}`}
              >
                <Pencil className='h-4 w-4' />
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => void onDelete(port.id, port.name)}
                disabled={busy}
                aria-label={`Delete ${port.name}`}
              >
                <Trash2 className='h-4 w-4 text-destructive' />
              </Button>
            </div>
          )
        },
      },
    ],
    [busy, onDelete, onEdit, onToggleHasInfo, renderSortableHeader]
  )

  // TanStack Table intentionally returns a mutable table facade.
  // eslint-disable-next-line react-hooks/incompatible-library
  return useReactTable({
    data: rows,
    columns,
    manualPagination: true,
    rowCount: totalElements,
    pageCount,
    state: {
      sorting,
      columnVisibility,
      pagination: { pageIndex, pageSize: PORTS_ADMIN_LIST_SIZE },
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const next = functionalUpdate(updater, {
        pageIndex,
        pageSize: PORTS_ADMIN_LIST_SIZE,
      })
      onPageChange(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    autoResetPageIndex: false,
  })
}
