'use client'

import type { Table } from '@tanstack/react-table'
import type { PortSearchFieldId } from '@/modules/logistics/services/portService'
import {
  AdminToolbar,
  AdminToolbarGroup,
} from '@/shared/components/layout/dashboard/admin'
import { ChevronDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PORT_SEARCH_FIELDS, type PortTableRow } from './portManagement.types'

interface PortsToolbarProps {
  table: Table<PortTableRow>
  search: string
  searchField: PortSearchFieldId
  searchFieldLabel: string
  canAddPort: boolean
  onSearchChange: (search: string) => void
  onSearchFieldChange: (field: PortSearchFieldId) => void
  onClear: () => void
  onAdd: () => void
}

export function PortsToolbar({
  table,
  search,
  searchField,
  searchFieldLabel,
  canAddPort,
  onSearchChange,
  onSearchFieldChange,
  onClear,
  onAdd,
}: PortsToolbarProps) {
  return (
    <AdminToolbar>
      <AdminToolbarGroup>
        <Input
          placeholder={`Search by ${searchFieldLabel.toLowerCase()}…`}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className='h-9 w-full sm:w-[260px] md:w-[280px]'
        />
        <Select
          value={searchField}
          onValueChange={(value) =>
            onSearchFieldChange(value as PortSearchFieldId)
          }
        >
          <SelectTrigger className='h-9 w-full sm:w-[160px] md:w-[180px]'>
            <SelectValue placeholder='Field' />
          </SelectTrigger>
          <SelectContent>
            {PORT_SEARCH_FIELDS.map((field) => (
              <SelectItem key={field.id} value={field.id}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {search.trim() ? (
          <Button variant='ghost' size='sm' onClick={onClear}>
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
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className='capitalize'
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) =>
                    column.toggleVisibility(Boolean(value))
                  }
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant='default'
          size='sm'
          onClick={onAdd}
          className='gap-2 transition-transform active:scale-[0.98]'
          disabled={!canAddPort}
          title={
            canAddPort
              ? undefined
              : 'Search for a port first — Add port is available when no matches are found'
          }
        >
          <Plus className='h-4 w-4' />
          Add port
        </Button>
      </AdminToolbarGroup>
    </AdminToolbar>
  )
}
