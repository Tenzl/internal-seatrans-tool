'use client'

import React, { type FormEvent, useCallback, useMemo, useState } from 'react'
import {
  type ColumnDef,
  type SortingState,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
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
import { DataTableContent, adminStickyColumnClass } from '@/shared/components/ui/data-table'
import { useTableSortHeader } from '@/features/admin/hooks/useTableSortHeader'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'

const AREA_OPTIONS = ['NORTHERN', 'MIDDLE', 'SOUTHERN'] as const
const NONE_VALUE = '__NONE__'

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

const COLUMN_CLASS_NAMES: Record<string, string> = {
  area: 'hidden md:table-cell w-32',
  provinceName: 'hidden lg:table-cell w-48',
  code: 'hidden md:table-cell w-32',
  zoneCode: 'hidden lg:table-cell w-32',
  countryCode: 'hidden lg:table-cell w-32',
  latitude: 'hidden xl:table-cell w-32',
  longitude: 'hidden xl:table-cell w-32',
  hasInfo: 'w-40',
  actions: 'text-right',
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

  const [portSearch, setPortSearch] = useState('')
  const [searchField, setSearchField] = useState<PortSearchFieldId>('name')
  const debouncedPortSearch = useDebouncedValue(portSearch, 300)

  const portsListQueryKey = queryKeys.portsList(debouncedPortSearch, searchField)

  const { data: portsPage, isLoading: isPortsQueryLoading, isFetching } = useQuery({
    queryKey: portsListQueryKey,
    queryFn: async () => {
      try {
        return await portService.listPortsPaginated({
          page: 0,
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

  const [isBusy, setIsBusy] = useState(false)
  const isLoading = isPortsQueryLoading || isFetching || isBusy

  const [sorting, setSorting] = useState<SortingState>([])

  const invalidatePortsList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.portsListPrefix() })
  }, [queryClient])

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addPortName, setAddPortName] = useState('')
  const [addPortOfCall, setAddPortOfCall] = useState('')
  const [addCode, setAddCode] = useState('')
  const [addZoneCode, setAddZoneCode] = useState('')
  const [addCountryCode, setAddCountryCode] = useState('')
  const [addLatitude, setAddLatitude] = useState('')
  const [addLongitude, setAddLongitude] = useState('')

  const [editingPortId, setEditingPortId] = useState<number | null>(null)
  const [editingPortName, setEditingPortName] = useState('')
  const [editingPortOfCall, setEditingPortOfCall] = useState('')
  const [editingCode, setEditingCode] = useState('')
  const [editingZoneCode, setEditingZoneCode] = useState('')
  const [editingCountryCode, setEditingCountryCode] = useState('')
  const [editingLatitude, setEditingLatitude] = useState('')
  const [editingLongitude, setEditingLongitude] = useState('')
  const [editingProvinceId, setEditingProvinceId] = useState<number | null>(null)
  const [editingArea, setEditingArea] = useState<string>(NONE_VALUE)
  const renderSortableHeader = useTableSortHeader<PortTableRow>()

  const resetEditingState = useCallback(() => {
    setEditingPortId(null)
    setEditingPortName('')
    setEditingPortOfCall('')
    setEditingCode('')
    setEditingZoneCode('')
    setEditingCountryCode('')
    setEditingLatitude('')
    setEditingLongitude('')
    setEditingProvinceId(null)
    setEditingArea(NONE_VALUE)
  }, [])

  const resetAddForm = () => {
    setAddPortName('')
    setAddPortOfCall('')
    setAddCode('')
    setAddZoneCode('')
    setAddCountryCode('')
    setAddLatitude('')
    setAddLongitude('')
  }

  const openAddDialog = () => {
    setAddPortName('')
    setAddPortOfCall('')
    setAddCode('')
    setAddZoneCode('')
    setAddCountryCode('')
    setAddLatitude('')
    setAddLongitude('')
    setAddDialogOpen(true)
  }

  const handleAddPort = async () => {
    if (!addPortName.trim()) {
      toast.error('Port name cannot be empty')
      return
    }

    try {
      setIsBusy(true)
      const payload: Record<string, unknown> = {
        name: addPortName.trim(),
        provinceId: null,
      }

      const maybePortOfCall = addPortOfCall.trim()
      if (maybePortOfCall) payload.portOfCall = maybePortOfCall

      const maybeCode = addCode.trim()
      if (maybeCode) payload.code = maybeCode

      const maybeZoneCode = addZoneCode.trim()
      if (maybeZoneCode) payload.zoneCode = maybeZoneCode

      const maybeCountryCode = addCountryCode.trim()
      if (maybeCountryCode) payload.countryCode = maybeCountryCode

      const maybeLatitude = parseOptionalNumber(addLatitude, 'Latitude')
      if (maybeLatitude !== undefined) payload.latitude = maybeLatitude

      const maybeLongitude = parseOptionalNumber(addLongitude, 'Longitude')
      if (maybeLongitude !== undefined) payload.longitude = maybeLongitude

      const response = await apiClient.post<ApiResponse<Port>>(API_CONFIG.PORTS.ADMIN_BASE, payload)

      if (!response.ok) {
        throw new Error('Failed to add port')
      }

      await response.json()
      invalidatePortsList()
      setAddDialogOpen(false)
      resetAddForm()
      toast.success('Port added successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add port'
      toast.error(message)
    } finally {
      setIsBusy(false)
    }
  }

  const handleSubmitAddPort = async (event: FormEvent) => {
    event.preventDefault()
    await handleAddPort()
  }

  const handleEditPort = useCallback((port: Port) => {
    setEditingPortId(port.id)
    setEditingPortName(port.name)
    setEditingPortOfCall(port.portOfCall || '')
    setEditingProvinceId(port.provinceId)

    const matchedProvince = port.provinceId != null
      ? provinces.find((province) => province.id === port.provinceId)
      : undefined
    setEditingArea(matchedProvince?.area || NONE_VALUE)

    setEditingCode(port.code || '')
    setEditingZoneCode(port.zoneCode || '')
    setEditingCountryCode(port.countryCode || '')
    setEditingLatitude(port.latitude != null ? String(port.latitude) : '')
    setEditingLongitude(port.longitude != null ? String(port.longitude) : '')
  }, [provinces])

  const handleSavePort = useCallback(async (portId: number) => {
    if (!editingPortName.trim()) {
      toast.error('Port name cannot be empty')
      return
    }

    try {
      setIsBusy(true)
      const payload: Record<string, unknown> = {
        name: editingPortName.trim(),
        portOfCall: editingPortOfCall.trim(),
      }

      if (editingProvinceId != null) {
        payload.provinceId = editingProvinceId
      }

      const maybeCode = editingCode.trim()
      if (maybeCode) payload.code = maybeCode

      const maybeZoneCode = editingZoneCode.trim()
      if (maybeZoneCode) payload.zoneCode = maybeZoneCode

      const maybeCountryCode = editingCountryCode.trim()
      if (maybeCountryCode) payload.countryCode = maybeCountryCode

      const maybeLatitude = parseOptionalNumber(editingLatitude, 'Latitude')
      if (maybeLatitude !== undefined) payload.latitude = maybeLatitude

      const maybeLongitude = parseOptionalNumber(editingLongitude, 'Longitude')
      if (maybeLongitude !== undefined) payload.longitude = maybeLongitude

      const response = await apiClient.put<ApiResponse<Port>>(API_CONFIG.PORTS.ADMIN_BY_ID(portId), payload)

      if (!response.ok) {
        throw new Error('Failed to update port')
      }

      await response.json()
      invalidatePortsList()
      resetEditingState()
      toast.success('Port updated successfully')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update port'
      toast.error(message)
    } finally {
      setIsBusy(false)
    }
  }, [
    editingCode,
    editingCountryCode,
    editingLatitude,
    editingLongitude,
    editingPortName,
    editingPortOfCall,
    editingProvinceId,
    editingZoneCode,
    invalidatePortsList,
    resetEditingState,
  ])

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

  const provincesForEditingArea = useMemo(
    () => provinces.filter((province) => province.area === editingArea),
    [provinces, editingArea]
  )

  const provinceMap = useMemo(() => {
    return new Map(provinces.map((province) => [province.id, province]))
  }, [provinces])

  const portsForTable = useMemo<PortTableRow[]>(() => {
    return ports.map((port: Port) => {
      const province = port.provinceId != null ? provinceMap.get(port.provinceId) : undefined
      return {
        ...port,
        area: province?.area || 'UNKNOWN',
        provinceName: province?.displayName || province?.name || '-',
      }
    })
  }, [ports, provinceMap])

  const columns = useMemo<ColumnDef<PortTableRow>[]>(() => [
    {
      accessorKey: 'area',
      header: renderSortableHeader('Area'),
      cell: ({ row }) => {
        const port = row.original
        if (editingPortId !== port.id) return port.area

        return (
          <Select
            value={editingArea || NONE_VALUE}
            onValueChange={(value) => {
              setEditingArea(value)
              setEditingProvinceId(null)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>No Area</SelectItem>
              {AREA_OPTIONS.map((area) => (
                <SelectItem key={area} value={area}>
                  {area}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      },
    },
    {
      accessorKey: 'provinceName',
      header: renderSortableHeader('Province'),
      cell: ({ row }) => {
        const port = row.original
        if (editingPortId !== port.id) return port.provinceName

        return (
          <Select
            value={editingProvinceId != null ? editingProvinceId.toString() : NONE_VALUE}
            onValueChange={(value) => setEditingProvinceId(value === NONE_VALUE ? null : Number(value))}
            disabled={editingArea === NONE_VALUE}
          >
            <SelectTrigger>
              <SelectValue placeholder={editingArea === NONE_VALUE ? 'Select area first' : 'Select province'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>No Province</SelectItem>
              {provincesForEditingArea.map((province) => (
                <SelectItem key={province.id} value={province.id.toString()}>
                  {province.displayName || province.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      },
    },
    {
      accessorKey: 'name',
      header: renderSortableHeader('Port Name'),
      cell: ({ row }) => {
        const port = row.original
        if (editingPortId !== port.id) return port.name

        return (
          <Input
            value={editingPortName}
            onChange={(e) => setEditingPortName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSavePort(port.id)}
            autoFocus
          />
        )
      },
    },
    {
      accessorKey: 'portOfCall',
      header: renderSortableHeader('Port of Call'),
      cell: ({ row }) => {
        const port = row.original
        if (editingPortId !== port.id) return port.portOfCall || '-'

        return (
          <Input
            value={editingPortOfCall}
            onChange={(e) => setEditingPortOfCall(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSavePort(port.id)}
            placeholder="Port of call"
          />
        )
      },
    },
    {
      accessorKey: 'code',
      header: 'Code',
      cell: ({ row }) => {
        const port = row.original
        if (editingPortId !== port.id) return port.code || '-'

        return (
          <Input
            value={editingCode}
            onChange={(e) => setEditingCode(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSavePort(port.id)}
            placeholder="Code"
          />
        )
      },
    },
    {
      accessorKey: 'zoneCode',
      header: 'Zone',
      cell: ({ row }) => {
        const port = row.original
        if (editingPortId !== port.id) return port.zoneCode || '-'

        return (
          <Input
            value={editingZoneCode}
            onChange={(e) => setEditingZoneCode(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSavePort(port.id)}
            placeholder="Zone code"
          />
        )
      },
    },
    {
      accessorKey: 'countryCode',
      header: 'Country',
      cell: ({ row }) => {
        const port = row.original
        if (editingPortId !== port.id) return port.countryCode || '-'

        return (
          <Input
            value={editingCountryCode}
            onChange={(e) => setEditingCountryCode(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSavePort(port.id)}
            placeholder="Country code"
          />
        )
      },
    },
    {
      accessorKey: 'latitude',
      header: 'Latitude',
      cell: ({ row }) => {
        const port = row.original
        if (editingPortId !== port.id) return port.latitude != null ? port.latitude : '-'

        return (
          <Input
            value={editingLatitude}
            onChange={(e) => setEditingLatitude(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSavePort(port.id)}
            type="number"
            step="any"
            placeholder="Latitude"
          />
        )
      },
    },
    {
      accessorKey: 'longitude',
      header: 'Longitude',
      cell: ({ row }) => {
        const port = row.original
        if (editingPortId !== port.id) return port.longitude != null ? port.longitude : '-'

        return (
          <Input
            value={editingLongitude}
            onChange={(e) => setEditingLongitude(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSavePort(port.id)}
            type="number"
            step="any"
            placeholder="Longitude"
          />
        )
      },
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
            disabled={isLoading || editingPortId === port.id}
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
      cell: ({ row }) => {
        const port = row.original
        return (
          <div className="flex items-center justify-end gap-0.5">
            {editingPortId === port.id ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSavePort(port.id)}
                  disabled={isLoading}
                >
                  Save
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetEditingState}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditPort(port)}
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
              </>
            )}
          </div>
        )
      },
    },
  ], [
    editingArea,
    editingCode,
    editingCountryCode,
    editingLatitude,
    editingLongitude,
    editingPortId,
    editingPortName,
    editingPortOfCall,
    editingProvinceId,
    editingZoneCode,
    handleDeletePort,
    handleEditPort,
    handleSavePort,
    handleToggleHasInfo,
    isLoading,
    provincesForEditingArea,
    resetEditingState,
  ])

  const table = useReactTable({
    data: portsForTable,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
              <Button
                variant="default"
                size="sm"
                onClick={openAddDialog}
                className="gap-2 transition-transform active:scale-[0.98]"
                disabled={isLoading}
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
          emptyMessage="No ports match your search. Try another field or clear filters."
        >
          <DataTableContent
            table={table}
            columnCount={columns.length}
            loading={isLoading && ports.length === 0}
            emptyMessage="No results."
            tableClassName="w-max min-w-full"
            columnClassName={(columnId, type) =>
              adminStickyColumnClass(columnId, type, COLUMN_CLASS_NAMES[columnId] ?? '', {
                pinRight: ['actions'],
              })
            }
          />
          {isFetching && ports.length > 0 ? (
            <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Updating results…
            </p>
          ) : null}
        </AdminDataPanel>
      </AdminSection>

      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          setAddDialogOpen(open)
          if (!open) {
            resetAddForm()
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Port</DialogTitle>
            <DialogDescription>Enter port information in the form below.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAddPort}>
            <div className="grid grid-cols-1 gap-3 py-2 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="add-port-name">Port Name</Label>
                <Input
                  id="add-port-name"
                  value={addPortName}
                  onChange={(e) => setAddPortName(e.target.value)}
                  placeholder="Enter port name"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="add-port-of-call">Port of Call</Label>
                <Input
                  id="add-port-of-call"
                  value={addPortOfCall}
                  onChange={(e) => setAddPortOfCall(e.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-code">Code</Label>
                <Input
                  id="add-code"
                  value={addCode}
                  onChange={(e) => setAddCode(e.target.value)}
                  placeholder="e.g., 123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-zone-code">Zone Code</Label>
                <Input
                  id="add-zone-code"
                  value={addZoneCode}
                  onChange={(e) => setAddZoneCode(e.target.value)}
                  placeholder="e.g., SOUTHERN"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-country-code">Country Code</Label>
                <Input
                  id="add-country-code"
                  value={addCountryCode}
                  onChange={(e) => setAddCountryCode(e.target.value)}
                  placeholder="e.g., VN"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-latitude">Latitude</Label>
                <Input
                  id="add-latitude"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={addLatitude}
                  onChange={(e) => setAddLatitude(e.target.value)}
                  placeholder="e.g., 10.73"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="add-longitude">Longitude</Label>
                <Input
                  id="add-longitude"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={addLongitude}
                  onChange={(e) => setAddLongitude(e.target.value)}
                  placeholder="e.g., 106.71"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="gap-2">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add New
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
