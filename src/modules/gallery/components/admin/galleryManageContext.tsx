'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Filter, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { portService, type Port } from '@/modules/logistics/services/portService'
import { serviceTypeService, type ServiceType } from '@/modules/service-types/services/serviceTypeService'
import { commodityService, type Commodity } from '@/modules/gallery/services/commodityService'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/utils/toast'

export const GALLERY_AREA_OPTIONS = ['NORTHERN', 'MIDDLE', 'SOUTHERN'] as const

export interface GalleryManageFilterState {
  filterArea: string
  setFilterArea: (value: string) => void
  filterPort: number | null
  setFilterPort: (value: number | null) => void
  filterServiceType: number | null
  setFilterServiceType: (value: number | null) => void
  filterCommodity: number | null
  setFilterCommodity: (value: number | null) => void
  availablePorts: Port[]
  availableCommodities: Commodity[]
  serviceTypes: ServiceType[]
  commodityCounts: Record<string, number>
  filterProvinceId: number | undefined
  hasActiveFilters: boolean
  handleClearAll: () => void
}

const GalleryManageContext = createContext<GalleryManageFilterState | null>(null)

export function useGalleryManageFilters(): GalleryManageFilterState {
  const ctx = useContext(GalleryManageContext)
  if (!ctx) {
    throw new Error('useGalleryManageFilters must be used within GalleryManageProvider')
  }
  return ctx
}

export function GalleryManageProvider({ children }: { children: ReactNode }) {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [filterArea, setFilterArea] = useState('')
  const [filterPort, setFilterPort] = useState<number | null>(null)
  const [filterServiceType, setFilterServiceType] = useState<number | null>(null)
  const [filterCommodity, setFilterCommodity] = useState<number | null>(null)
  const [availablePorts, setAvailablePorts] = useState<Port[]>([])
  const [availableCommodities, setAvailableCommodities] = useState<Commodity[]>([])
  const [commodityCounts, setCommodityCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    void serviceTypeService
      .getAllServiceTypes()
      .then(setServiceTypes)
      .catch((error) => toast.error('Failed to load service types', error))
  }, [])

  useEffect(() => {
    if (!filterArea) return

    let cancelled = false
    void portService
      .getPortsByArea(filterArea)
      .then((ports) => {
        if (!cancelled) {
          setAvailablePorts(ports)
          setFilterPort(null)
        }
      })
      .catch((error) => {
        toast.error('Failed to load ports for area', error)
        if (!cancelled) {
          setAvailablePorts([])
          setFilterPort(null)
        }
      })

    return () => {
      cancelled = true
    }
  }, [filterArea])

  useEffect(() => {
    if (!filterServiceType) return

    void commodityService
      .getCommoditiesByServiceType(filterServiceType)
      .then((data) => {
        setAvailableCommodities(data)
        setFilterCommodity(null)
      })
      .catch((error) => toast.error('Failed to load cargo types', error))
  }, [filterServiceType])

  useEffect(() => {
    if (!filterCommodity) return
    const provinceId = filterPort
      ? availablePorts.find((port) => port.id === filterPort)?.provinceId
      : undefined
    void commodityService
      .getImageCount(
        filterCommodity,
        provinceId ?? undefined,
        filterPort ?? undefined,
        filterServiceType ?? undefined,
      )
      .then((countData) => {
        const scopedKey =
          provinceId && filterPort && filterServiceType
            ? `${provinceId}_${filterPort}_${filterServiceType}_${filterCommodity}`
            : String(filterCommodity)
        setCommodityCounts((prev) => ({
          ...prev,
          [scopedKey]: countData.current,
          [filterCommodity]: countData.current,
        }))
      })
      .catch((error) => toast.error('Failed to load image count', error))
  }, [filterCommodity, filterPort, filterServiceType, availablePorts])

  useEffect(() => {
    const provinceId = filterPort
      ? availablePorts.find((port) => port.id === filterPort)?.provinceId
      : undefined
    if (!filterServiceType || !filterPort || !provinceId || availableCommodities.length === 0) {
      return
    }

    void Promise.all(
      availableCommodities.map(async (type) => {
        const countData = await commodityService.getImageCount(
          type.id,
          provinceId,
          filterPort,
          filterServiceType,
        )
        const scopedKey = `${provinceId}_${filterPort}_${filterServiceType}_${type.id}`
        return { scopedKey, id: type.id, current: countData.current }
      }),
    )
      .then((results) => {
        setCommodityCounts((prev) => {
          const next = { ...prev }
          results.forEach((row) => {
            next[row.scopedKey] = row.current
            next[row.id] = row.current
          })
          return next
        })
      })
      .catch((error) => toast.error('Failed to load image counts', error))
  }, [availableCommodities, filterPort, filterServiceType, availablePorts])

  const selectedFilterPort = filterPort
    ? availablePorts.find((port) => port.id === filterPort)
    : null
  const filterProvinceId = selectedFilterPort?.provinceId ?? undefined

  const hasActiveFilters = Boolean(
    filterArea || filterPort || filterServiceType || filterCommodity,
  )

  const handleClearAll = useCallback(() => {
    setFilterArea('')
    setAvailablePorts([])
    setFilterPort(null)
    setFilterServiceType(null)
    setAvailableCommodities([])
    setFilterCommodity(null)
  }, [])

  const handleAreaChange = useCallback((value: string) => {
    setFilterArea(value)
    setAvailablePorts([])
    setFilterPort(null)
  }, [])

  const handleServiceTypeChange = useCallback((value: number | null) => {
    setFilterServiceType(value)
    setAvailableCommodities([])
    setFilterCommodity(null)
  }, [])

  const value = useMemo<GalleryManageFilterState>(
    () => ({
      filterArea,
      setFilterArea: handleAreaChange,
      filterPort,
      setFilterPort,
      filterServiceType,
      setFilterServiceType: handleServiceTypeChange,
      filterCommodity,
      setFilterCommodity,
      availablePorts,
      availableCommodities,
      serviceTypes,
      commodityCounts,
      filterProvinceId,
      hasActiveFilters,
      handleClearAll,
    }),
    [
      filterArea,
      filterPort,
      filterServiceType,
      filterCommodity,
      availablePorts,
      availableCommodities,
      serviceTypes,
      commodityCounts,
      filterProvinceId,
      hasActiveFilters,
      handleClearAll,
      handleAreaChange,
      handleServiceTypeChange,
    ],
  )

  return (
    <GalleryManageContext.Provider value={value}>{children}</GalleryManageContext.Provider>
  )
}

const selectClassName =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted'

export function GalleryImageFilters({
  layout = 'bar',
  mode = 'manage',
  className,
}: {
  layout?: 'bar' | 'sidebar'
  /** add = required selections; manage = optional “all” options */
  mode?: 'add' | 'manage'
  className?: string
}) {
  const {
    filterArea,
    setFilterArea,
    filterPort,
    setFilterPort,
    filterServiceType,
    setFilterServiceType,
    filterCommodity,
    setFilterCommodity,
    availablePorts,
    availableCommodities,
    serviceTypes,
    commodityCounts,
    hasActiveFilters,
    handleClearAll,
  } = useGalleryManageFilters()

  const provinceId = filterPort
    ? availablePorts.find((port) => port.id === filterPort)?.provinceId
    : undefined

  return (
    <div
      className={cn(
        'border-t border-border/60 pt-5',
        layout === 'sidebar' ? 'mt-5' : '',
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" strokeWidth={1.75} />
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Filters
          </span>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-7 px-2 text-xs active:scale-[0.98]"
          >
            <X className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      <div
        className={cn(
          'gap-3',
          layout === 'sidebar'
            ? 'flex flex-col'
            : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        )}
      >
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">Area</label>
          <select
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className={selectClassName}
            title="Area filter"
            aria-label="Area filter"
          >
            <option value="">{mode === 'add' ? 'Select area' : 'All areas'}</option>
            {GALLERY_AREA_OPTIONS.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">Port</label>
          <select
            value={filterPort ?? ''}
            onChange={(e) => setFilterPort(e.target.value ? Number(e.target.value) : null)}
            disabled={!filterArea}
            className={selectClassName}
            title="Port filter"
            aria-label="Port filter"
          >
            <option value="">
              {!filterArea ? 'Select area first' : mode === 'add' ? 'Select port' : 'All ports'}
            </option>
            {availablePorts.map((port) => (
              <option key={port.id} value={port.id}>
                {port.name}
                {port.provinceName ? ` (${port.provinceName})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">Service</label>
          <select
            value={filterServiceType ?? ''}
            onChange={(e) =>
              setFilterServiceType(e.target.value ? Number(e.target.value) : null)
            }
            className={selectClassName}
            title="Service type filter"
            aria-label="Service type filter"
          >
            <option value="">{mode === 'add' ? 'Select service' : 'All services'}</option>
            {serviceTypes.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-muted-foreground">Cargo</label>
          <select
            value={filterCommodity ?? ''}
            onChange={(e) =>
              setFilterCommodity(e.target.value ? Number(e.target.value) : null)
            }
            disabled={!filterServiceType || (mode === 'add' && !filterPort)}
            className={selectClassName}
            title="Cargo type filter"
            aria-label="Cargo type filter"
          >
            <option value="">{mode === 'add' ? 'Select cargo' : 'All cargo types'}</option>
            {availableCommodities.map((type) => {
              const scopedKey =
                provinceId && filterPort && filterServiceType
                  ? `${provinceId}_${filterPort}_${filterServiceType}_${type.id}`
                  : String(type.id)
              const current = commodityCounts[scopedKey] ?? commodityCounts[type.id] ?? 0
              return (
                <option key={type.id} value={type.id}>
                  {type.displayName} ({current}/{type.requiredImageCount})
                </option>
              )
            })}
          </select>
        </div>
      </div>
    </div>
  )
}
