'use client'

import React, { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  AdminDataPanel,
  AdminSection,
  AdminToolbar,
  AdminToolbarGroup,
} from '@/shared/components/layout/dashboard/admin'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { queryKeys } from '@/shared/config/react-query.config'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { toast } from '@/shared/utils/toast'
import { apiClient } from '@/shared/utils/apiClient'
import { API_CONFIG } from '@/shared/config/api.config'
import { portService, PORTS_ADMIN_LIST_SIZE } from '@/modules/logistics/services/portService'
import { provinceService, type Province } from '@/modules/logistics/services/provinceService'
import type { ApiResponse } from '@/shared/types/api.types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
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
import { useTableSortHeader } from '@/features/admin/hooks/useTableSortHeader'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { AREA_OPTIONS as EPDA_AREA_OPTIONS, getAreaShortLabel } from '@/features/admin/components/invoice/epdaFormParameters'
const AREA_OPTIONS = EPDA_AREA_OPTIONS
const NONE_VALUE = '__NONE__'

const getInitialPortsColumnVisibility = (): VisibilityState => {
  const base: VisibilityState = {
    portOfCall: false,
    zoneCode: false,
    latitude: false,
    longitude: false,
    hasInfo: false,
  }
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
    return {
      ...base,
      provinceName: false,
      countryCode: false,
      code: false,
    }
  }
  return base
}

const PORT_SEARCH_FIELDS = [
  { id: 'area', label: 'Area' },
  { id: 'provinceName', label: 'Province' },
  { id: 'name', label: 'Port Name' },
  { id: 'portOfCall', label: 'Port of Call' },
  { id: 'code', label: 'Code' },
  { id: 'zoneCode', label: 'Zone' },
  { id: 'countryCode', label: 'Country' },
] as const

type PortSearchFieldId = (typeof PORT_SEARCH_FIELDS)[number]['id']

interface Port {
  id: number
  name: string
  portOfCall?: string
  provinceId: number | null
  provinceName?: string | null
  provinceArea?: number | null
  hasInfo?: number
  code?: string
  zoneCode?: string
  countryCode?: string
  latitude?: number
  longitude?: number
}

interface PortTableRow extends Port {
  area: string
  provinceName: string
}

/** Shape of the create / edit dialog form. */
interface PortFormState {
  name: string
  portOfCall: string
  code: string
  zoneCode: string
  countryCode: string
  latitude: string
  longitude: string
  area: string
  provinceId: number | null
}

const buildPortOfCall = (name: string): string => name.trim().toUpperCase()
const getAreaLabel = (value?: number | string | null): string => {
  if (value === null || value === undefined || value === '' || value === NONE_VALUE) return 'UNKNOWN'
  return getAreaShortLabel(String(value)) ?? 'UNKNOWN'
}

const emptyPortForm: PortFormState = {
  name: '',
  portOfCall: '',
  code: '',
  zoneCode: 'AS-SIN',
  countryCode: 'VN',
  latitude: '',
  longitude: '',
  area: NONE_VALUE,
  provinceId: null,
}

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

const parseOptionalNumber = (rawValue: string, fieldLabel: string): number | undefined => {
  const trimmed = rawValue.trim()
  if (!trimmed) return undefined

  const value = Number(trimmed)
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldLabel} must be a valid number`)
  }
  return value
}

export function ManagePorts() {
  const queryClient = useQueryClient()

  const { data: provinces = [] } = useQuery({
    queryKey: queryKeys.provinces(),
    queryFn: async () => {
      try {
        return await provinceService.getAllProvinces()
      } catch (e) {
        toast.error('Failed to load provinces')
        throw e
      }
    },
  })

  const [serverPage, setServerPage] = useState(0)
  const [portSearch, setPortSearch] = useState('')
  const [searchField, setSearchField] = useState<PortSearchFieldId>('name')
  const debouncedPortSearch = useDebouncedValue(portSearch, 300)

  const portsListQueryKey = [
    ...queryKeys.portsList(debouncedPortSearch, searchField),
    serverPage,
  ]

  const { data: portsPage, isLoading: isPortsQueryLoading, isFetching } = useQuery({
    queryKey: portsListQueryKey,
    queryFn: async () => {
      try {
        return await portService.listPortsPaginated({
          page: serverPage,
          size: PORTS_ADMIN_LIST_SIZE,
          q: debouncedPortSearch.trim() || undefined,
          searchIn: searchField,
        })
      } catch {
        toast.error('Failed to load ports')
        throw new Error('Failed to load ports')
      }
    },
  })

  const ports = portsPage?.content ?? []
  const totalElements = portsPage?.totalElements ?? 0
  const serverPageCount = Math.max(1, portsPage?.totalPages ?? 1)

  // Reset to the first page whenever the search query or field changes.
  useEffect(() => {
    setServerPage(0)
  }, [debouncedPortSearch, searchField])

  const [isBusy, setIsBusy] = useState(false)
  const isLoading = isPortsQueryLoading || isFetching || isBusy

  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(getInitialPortsColumnVisibility)

  const invalidatePortsList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.portsListPrefix() })
  }, [queryClient])

  // Combined create / edit dialog --------------------------------------------
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPortId, setEditingPortId] = useState<number | null>(null)
  const [form, setForm] = useState<PortFormState>(emptyPortForm)
  const renderSortableHeader = useTableSortHeader<PortTableRow>()

  const hasActiveSearch = debouncedPortSearch.trim().length > 0
  const searchSettled = !isPortsQueryLoading && !isFetching
  const canAddPort = hasActiveSearch && searchSettled && totalElements === 0

  const updateForm = useCallback(
    <K extends keyof PortFormState>(key: K, value: PortFormState[K]) => {
      setForm((prev) => {
        if (key === 'name') {
          const name = String(value)
          return {
            ...prev,
            name,
            // Keep Port of Call aligned with the uppercase port name.
            portOfCall: buildPortOfCall(name),
          }
        }
        return { ...prev, [key]: value }
      })
    },
    [],
  )

  const openCreateDialog = () => {
    const prefilledName = searchField === 'name' ? debouncedPortSearch.trim() : ''
    setEditingPortId(null)
    setForm({
      ...emptyPortForm,
      name: prefilledName,
      portOfCall: prefilledName ? buildPortOfCall(prefilledName) : '',
    })
    setDialogOpen(true)
  }

  const openEditDialog = useCallback(
    (port: Port) => {
      const matchedProvince =
        port.provinceId != null
          ? provinces.find((province) => province.id === port.provinceId)
          : undefined
      setEditingPortId(port.id)
      setForm({
        name: port.name ?? '',
        portOfCall: port.portOfCall ?? '',
        code: port.code ?? '',
        zoneCode: port.zoneCode ?? '',
        countryCode: port.countryCode ?? '',
        latitude: port.latitude != null ? String(port.latitude) : '',
        longitude: port.longitude != null ? String(port.longitude) : '',
        area:
          port.provinceArea != null
            ? String(port.provinceArea)
            : matchedProvince?.area != null
              ? String(matchedProvince.area)
              : NONE_VALUE,
        provinceId: port.provinceId ?? null,
      })
      setDialogOpen(true)
    },
    [provinces],
  )

  const handleSavePort = useCallback(
    async (event: FormEvent) => {
      event.preventDefault()

      if (!form.name.trim()) {
        toast.error('Port name cannot be empty')
        return
      }

      const isEditing = editingPortId != null

      try {
        setIsBusy(true)
        const payload: Record<string, unknown> = {
          name: form.name.trim(),
          // null clears the province; the API treats it as "no province".
          provinceId: form.provinceId ?? null,
        }

        const maybePortOfCall = form.portOfCall.trim()
        // On edit, always send so the field can be cleared; on create, omit when empty.
        if (maybePortOfCall || isEditing) payload.portOfCall = maybePortOfCall

        const maybeCode = form.code.trim()
        if (maybeCode) payload.code = maybeCode

        const maybeZoneCode = form.zoneCode.trim()
        if (maybeZoneCode) payload.zoneCode = maybeZoneCode

        const maybeCountryCode = form.countryCode.trim()
        if (maybeCountryCode) payload.countryCode = maybeCountryCode

        // The API expects latitude / longitude as numeric *strings* (IsNumberString).
        const maybeLatitude = parseOptionalNumber(form.latitude, 'Latitude')
        if (maybeLatitude !== undefined) payload.latitude = String(maybeLatitude)

        const maybeLongitude = parseOptionalNumber(form.longitude, 'Longitude')
        if (maybeLongitude !== undefined) payload.longitude = String(maybeLongitude)

        const response = isEditing
          ? await apiClient.put<ApiResponse<Port>>(
              API_CONFIG.PORTS.ADMIN_BY_ID(editingPortId),
              payload,
            )
          : await apiClient.post<ApiResponse<Port>>(API_CONFIG.PORTS.ADMIN_BASE, payload)

        if (!response.ok) {
          throw new Error(isEditing ? 'Failed to update port' : 'Failed to add port')
        }

        await response.json()
        invalidatePortsList()
        setDialogOpen(false)
        setEditingPortId(null)
        setForm(emptyPortForm)
        toast.success(isEditing ? 'Port updated successfully' : 'Port added successfully')
      } catch (error) {
        const fallback = isEditing ? 'Failed to update port' : 'Failed to add port'
        toast.error(error instanceof Error ? error.message : fallback)
      } finally {
        setIsBusy(false)
      }
    },
    [editingPortId, form, invalidatePortsList],
  )

  const handleDeletePort = useCallback(async (portId: number, portName: string) => {
    if (!confirm(`Are you sure you want to delete port "${portName}"?`)) return

    try {
      setIsBusy(true)
      const response = await apiClient.delete(API_CONFIG.PORTS.ADMIN_BY_ID(portId))

      if (!response.ok) {
        throw new Error('Failed to delete port')
      }

      invalidatePortsList()
      toast.success('Port deleted successfully')
    } catch (error) {
      toast.error('Failed to delete port')
    } finally {
      setIsBusy(false)
    }
  }, [invalidatePortsList])

  const handleToggleHasInfo = useCallback(async (port: Port) => {
    const nextHasInfo = port.hasInfo === 1 ? 0 : 1

    try {
      setIsBusy(true)
      const response = await apiClient.patch<ApiResponse<Port>>(
        API_CONFIG.PORTS.ADMIN_HAS_INFO(port.id),
        { hasInfo: nextHasInfo }
      )

      if (!response.ok) {
        throw new Error('Failed to update has info')
      }

      await response.json()
      invalidatePortsList()
      toast.success(`Has info set to ${nextHasInfo === 1 ? 'Active' : 'Inactive'}`)
    } catch (error) {
      toast.error('Failed to update has info')
    } finally {
      setIsBusy(false)
    }
  }, [invalidatePortsList])

  const clearFilters = () => {
    setPortSearch('')
    setSearchField('name')
  }

  const searchFieldLabel =
    PORT_SEARCH_FIELDS.find((f) => f.id === searchField)?.label ?? 'Port Name'

  const provincesForArea = useMemo(
    () => provinces.filter((province) => String(province.area ?? '') === form.area),
    [provinces, form.area]
  )

  const provinceMap = useMemo(() => {
    return new Map(provinces.map((province) => [province.id, province]))
  }, [provinces])

  const portsForTable = useMemo<PortTableRow[]>(() => {
    return ports
      .map((port: Port) => {
        const province = port.provinceId != null ? provinceMap.get(port.provinceId) : undefined
        const provinceName = port.provinceName ?? province?.displayName ?? province?.name ?? 'UNKNOWN'
        const area = getAreaLabel(port.provinceArea ?? province?.area ?? null)
        return {
          ...port,
          area,
          provinceName,
        }
      })
      .sort((a, b) => {
        const aUnknown = a.area === 'UNKNOWN' || a.provinceName === 'UNKNOWN'
        const bUnknown = b.area === 'UNKNOWN' || b.provinceName === 'UNKNOWN'
        if (aUnknown !== bUnknown) return aUnknown ? 1 : -1
        const aIsVn = (a.countryCode ?? '').trim().toUpperCase() === 'VN'
        const bIsVn = (b.countryCode ?? '').trim().toUpperCase() === 'VN'
        if (aIsVn !== bIsVn) return aIsVn ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  }, [ports, provinceMap])

  const columns = useMemo<ColumnDef<PortTableRow>[]>(() => [
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
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
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
      cell: ({ row }) => (row.original.latitude != null ? row.original.latitude : '-'),
    },
    {
      accessorKey: 'longitude',
      header: 'Longitude',
      cell: ({ row }) => (row.original.longitude != null ? row.original.longitude : '-'),
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
            size="sm"
            onClick={() => handleToggleHasInfo(port)}
            disabled={isLoading}
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
          <div className="flex items-center justify-end gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditDialog(port)}
              disabled={isLoading}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeletePort(port.id, port.name)}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )
      },
    },
  ], [
    handleDeletePort,
    handleToggleHasInfo,
    isLoading,
    openEditDialog,
    renderSortableHeader,
  ])

  const table = useReactTable({
    data: portsForTable,
    columns,
    manualPagination: true,
    rowCount: totalElements,
    pageCount: serverPageCount,
    state: {
      sorting,
      columnVisibility,
      pagination: { pageIndex: serverPage, pageSize: PORTS_ADMIN_LIST_SIZE },
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      setServerPage((prev) => {
        const next = functionalUpdate(updater, {
          pageIndex: prev,
          pageSize: PORTS_ADMIN_LIST_SIZE,
        })
        return next.pageIndex
      })
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    autoResetPageIndex: false,
  })

  const tableTitle = (() => {
    const shown = ports.length
    const totalLabel = `${totalElements} port${totalElements === 1 ? '' : 's'}`
    const showingMore = totalElements > shown

    if (portSearch.trim()) {
      const matchLabel = `${totalElements} match${totalElements === 1 ? '' : 'es'}`
      if (showingMore) {
        return `${searchFieldLabel} — ${matchLabel} (showing ${shown}, refine search)`
      }
      return `${searchFieldLabel} — ${matchLabel}`
    }

    if (showingMore) {
      return `${totalLabel} — search to find a port (showing ${shown})`
    }
    return totalLabel
  })()

  return (
    <>
      <AdminSection
        toolbar={
          <AdminToolbar>
            <AdminToolbarGroup>
              <Input
                placeholder={`Search by ${searchFieldLabel.toLowerCase()}…`}
                value={portSearch}
                onChange={(event) => setPortSearch(event.target.value)}
                className="h-9 w-full sm:w-[260px] md:w-[280px]"
              />
              <Select
                value={searchField}
                onValueChange={(value) => setSearchField(value as PortSearchFieldId)}
              >
                <SelectTrigger className="h-9 w-full sm:w-[160px] md:w-[180px]">
                  <SelectValue placeholder="Field" />
                </SelectTrigger>
                <SelectContent>
                  {PORT_SEARCH_FIELDS.map((field) => (
                    <SelectItem key={field.id} value={field.id}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {portSearch.trim() ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
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
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="default"
                size="sm"
                onClick={openCreateDialog}
                className="gap-2 transition-transform active:scale-[0.98]"
                disabled={!canAddPort}
                title={
                  canAddPort
                    ? undefined
                    : 'Search for a port first — Add port is available when no matches are found'
                }
              >
                <Plus className="h-4 w-4" />
                Add port
              </Button>
            </AdminToolbarGroup>
          </AdminToolbar>
        }
      >
        <AdminDataPanel
          meta={tableTitle}
          loading={isLoading && ports.length === 0}
          empty={!isLoading && ports.length === 0}
          emptyMessage={
            hasActiveSearch
              ? 'No ports match your search. You can add a new port using the button above.'
              : 'Search for a port by name, area, province, or other fields.'
          }
        >
          <div className="overflow-x-auto rounded-md border">
            <Table className="table-fixed w-full">
              <TableHeader className="sticky top-0 z-20 bg-background">
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
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="group">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={`whitespace-nowrap align-middle ${
                            COLUMN_CLASS_NAMES[cell.column.id] ?? ''
                          }`}
                        >
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
          <DataTablePagination
            table={table}
            persistKey="ports-page"
            totalRowCount={totalElements}
            isFetching={isFetching && ports.length > 0}
          />
        </AdminDataPanel>
      </AdminSection>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingPortId(null)
            setForm(emptyPortForm)
          }
        }}
      >
        <DialogContent className="flex sm:max-w-lg sm:min-h-[620px] flex-col">
          <DialogHeader>
            <DialogTitle>{editingPortId != null ? 'Edit Port' : 'Add New Port'}</DialogTitle>
            <DialogDescription>
              {editingPortId != null
                ? 'Update the port information below.'
                : 'No matching port was found. Fill in the details to create a new port.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePort} className="flex flex-1 flex-col">
            <div className="grid flex-1 grid-cols-1 gap-3 py-2 md:grid-cols-2 content-start">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="port-name">Port Name</Label>
                <Input
                  id="port-name"
                  value={form.name}
                  onChange={(e) => updateForm('name', e.target.value)}
                  placeholder="Enter port name"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="port-of-call">Port of Call</Label>
                <Input
                  id="port-of-call"
                  value={form.portOfCall}
                  placeholder="Auto-generated from Port Name"
                  disabled
                  readOnly
                />
              </div>

              <div className="space-y-2">
                <Label>Area</Label>
                <Select
                  value={form.area || NONE_VALUE}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, area: value, provinceId: null }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>No Area</SelectItem>
                    {AREA_OPTIONS.map((area) => (
                      <SelectItem key={area.value} value={area.value}>
                        {area.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Province</Label>
                <Select
                  value={form.provinceId != null ? form.provinceId.toString() : NONE_VALUE}
                  onValueChange={(value) =>
                    updateForm('provinceId', value === NONE_VALUE ? null : Number(value))
                  }
                  disabled={form.area === NONE_VALUE}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={form.area === NONE_VALUE ? 'Select area first' : 'Select province'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>No Province</SelectItem>
                    {provincesForArea.map((province) => (
                      <SelectItem key={province.id} value={province.id.toString()}>
                        {province.displayName || province.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="port-code">Code (optional)</Label>
                <Input
                  id="port-code"
                  value={form.code}
                  onChange={(e) => updateForm('code', e.target.value)}
                  placeholder="e.g., mã cảng"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="port-zone-code">Zone Code</Label>
                <Input
                  id="port-zone-code"
                  value={form.zoneCode}
                  onChange={(e) => updateForm('zoneCode', e.target.value)}
                  placeholder="e.g., AS-SIN"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="port-country-code">Country Code</Label>
                <Input
                  id="port-country-code"
                  value={form.countryCode}
                  onChange={(e) => updateForm('countryCode', e.target.value)}
                  placeholder="e.g., VN"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="port-latitude">Latitude (optional)</Label>
                <Input
                  id="port-latitude"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={form.latitude}
                  onChange={(e) => updateForm('latitude', e.target.value)}
                  placeholder="e.g., 10.73"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="port-longitude">Longitude (optional)</Label>
                <Input
                  id="port-longitude"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={form.longitude}
                  onChange={(e) => updateForm('longitude', e.target.value)}
                  placeholder="e.g., 106.71"
                />
              </div>
            </div>

            <DialogFooter className="mt-auto">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="gap-2">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {editingPortId != null ? 'Save changes' : 'Add New'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
