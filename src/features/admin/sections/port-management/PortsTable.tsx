'use client'

import { flexRender, type Table as ReactTable } from '@tanstack/react-table'
import { DataTablePagination } from '@/components/ui/data-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { PortTableRow } from './portManagement.types'

const COLUMN_CLASS_NAMES: Record<string, string> = {
  area: 'w-[14%]',
  provinceName: 'w-[22%]',
  name: 'w-[28%]',
  portOfCall: 'w-[18%]',
  code: 'w-[12%]',
  zoneCode: 'w-[12%]',
  countryCode: 'w-[10%]',
  latitude: 'w-[12%]',
  longitude: 'w-[12%]',
  hasInfo: 'w-[12%]',
  actions: 'w-[14%]',
}

interface PortsTableProps {
  table: ReactTable<PortTableRow>
  totalElements: number
  isFetching: boolean
}

export function PortsTable({
  table,
  totalElements,
  isFetching,
}: PortsTableProps) {
  return (
    <>
      <div className='overflow-x-auto rounded-md border'>
        <Table className='w-full table-fixed'>
          <TableHeader className='sticky top-0 z-20 bg-background'>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={`bg-background whitespace-nowrap ${
                      COLUMN_CLASS_NAMES[header.column.id] ?? ''
                    }`}
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
                <TableRow key={row.id} className='group'>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`align-middle whitespace-nowrap ${
                        COLUMN_CLASS_NAMES[cell.column.id] ?? ''
                      }`}
                    >
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
                  colSpan={table.getVisibleLeafColumns().length}
                  className='h-24 text-center'
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination
        table={table}
        persistKey='ports-page'
        totalRowCount={totalElements}
        isFetching={isFetching}
      />
    </>
  )
}
