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
import {
  commodityService,
  type Commodity,
  type CommodityType,
} from '@/modules/gallery/services/commodityService'
import {
  portService,
  type Port,
} from '@/modules/logistics/services/portService'
import {
  serviceTypeService,
  type ServiceType,
} from '@/modules/service-types/services/serviceTypeService'
import {
  PORT_AREA_OPTIONS,
  isPortAreaCode,
  type PortAreaCode,
} from '@/shared/domain/portArea'
import { toast } from '@/shared/utils/toast'
import { Filter, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface GalleryManageFilterState {
  filterArea: PortAreaCode | ''
  setFilterArea: (value: PortAreaCode | '') => void
  filterPort: number | null
  setFilterPort: (value: number | null) => void
  filterServiceType: number | null
  setFilterServiceType: (value: number | null) => void
  filterCommodityType: number | null
  setFilterCommodityType: (value: number | null) => void
  filterCommodity: number | null
  setFilterCommodity: (value: number | null) => void
  availablePorts: Port[]
  availableCommodityTypes: CommodityType[]
  availableCommodities: Commodity[]
  serviceTypes: ServiceType[]
  filterProvinceId: number | undefined
  hasActiveFilters: boolean
  handleClearAll: () => void
}

const GalleryManageContext = createContext<GalleryManageFilterState | null>(
  null
)

export function useGalleryManageFilters(): GalleryManageFilterState {
  const ctx = useContext(GalleryManageContext)
  if (!ctx) {
    throw new Error(
      'useGalleryManageFilters must be used within GalleryManageProvider'
    )
  }
  return ctx
}

export function GalleryManageProvider({ children }: { children: ReactNode }) {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [filterArea, setFilterArea] = useState<PortAreaCode | ''>('')
  const [filterPort, setFilterPort] = useState<number | null>(null)
  const [filterServiceType, setFilterServiceType] = useState<number | null>(
    null
  )
  const [filterCommodityType, setFilterCommodityType] = useState<number | null>(
    null
  )
  const [filterCommodity, setFilterCommodity] = useState<number | null>(null)
  const [availablePorts, setAvailablePorts] = useState<Port[]>([])
  const [availableCommodityTypes, setAvailableCommodityTypes] = useState<
    CommodityType[]
  >([])
  const [availableCommodities, setAvailableCommodities] = useState<Commodity[]>(
    []
  )

  useEffect(() => {
    void serviceTypeService
      .getAllServiceTypes()
      .then(setServiceTypes)
      .catch((error) => toast.error('Failed to load service types', error))
  }, [])

  useEffect(() => {
    if (!filterArea) return

    const controller = new AbortController()
    void portService
      .getPortsByArea(filterArea, undefined, controller.signal)
      .then((ports) => {
        if (controller.signal.aborted) return
        setAvailablePorts(ports)
        setFilterPort(null)
      })
      .catch((error) => {
        if (controller.signal.aborted) return
        toast.error('Failed to load ports for area', error)
        setAvailablePorts([])
        setFilterPort(null)
      })

    return () => {
      controller.abort()
    }
  }, [filterArea])

  useEffect(() => {
    if (!filterServiceType) return

    const controller = new AbortController()
    void Promise.allSettled([
      commodityService.listCommodityTypes(filterServiceType, controller.signal),
      commodityService.getCommoditiesByServiceType(
        filterServiceType,
        controller.signal
      ),
    ]).then(([typesResult, commoditiesResult]) => {
      if (controller.signal.aborted) return

      if (typesResult.status === 'fulfilled') {
        setAvailableCommodityTypes(typesResult.value)
      } else {
        setAvailableCommodityTypes([])
        toast.error('Failed to load commodity types', typesResult.reason)
      }

      if (commoditiesResult.status === 'fulfilled') {
        setAvailableCommodities(commoditiesResult.value)
      } else {
        setAvailableCommodities([])
        toast.error('Failed to load commodities', commoditiesResult.reason)
      }
    })

    return () => {
      controller.abort()
    }
  }, [filterServiceType])

  const selectedFilterPort = filterPort
    ? availablePorts.find((port) => port.id === filterPort)
    : null
  const filterProvinceId = selectedFilterPort?.provinceId ?? undefined

  const hasActiveFilters = Boolean(
    filterArea ||
    filterPort ||
    filterServiceType ||
    filterCommodityType ||
    filterCommodity
  )

  const handleClearAll = useCallback(() => {
    setFilterArea('')
    setAvailablePorts([])
    setFilterPort(null)
    setFilterServiceType(null)
    setAvailableCommodityTypes([])
    setFilterCommodityType(null)
    setAvailableCommodities([])
    setFilterCommodity(null)
  }, [])

  const handleAreaChange = useCallback((value: PortAreaCode | '') => {
    setFilterArea(value)
    setAvailablePorts([])
    setFilterPort(null)
  }, [])

  const handleServiceTypeChange = useCallback((value: number | null) => {
    setFilterServiceType(value)
    setAvailableCommodityTypes([])
    setFilterCommodityType(null)
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
      filterCommodityType,
      setFilterCommodityType,
      filterCommodity,
      setFilterCommodity,
      availablePorts,
      availableCommodityTypes,
      availableCommodities,
      serviceTypes,
      filterProvinceId,
      hasActiveFilters,
      handleClearAll,
    }),
    [
      filterArea,
      filterPort,
      filterServiceType,
      filterCommodityType,
      filterCommodity,
      availablePorts,
      availableCommodityTypes,
      availableCommodities,
      serviceTypes,
      filterProvinceId,
      hasActiveFilters,
      handleClearAll,
      handleAreaChange,
      handleServiceTypeChange,
    ]
  )

  return (
    <GalleryManageContext.Provider value={value}>
      {children}
    </GalleryManageContext.Provider>
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
    filterCommodityType,
    setFilterCommodityType,
    filterCommodity,
    setFilterCommodity,
    availablePorts,
    availableCommodityTypes,
    availableCommodities,
    serviceTypes,
    hasActiveFilters,
    handleClearAll,
  } = useGalleryManageFilters()

  return (
    <div
      className={cn(
        'border-t border-border/60 pt-5',
        layout === 'sidebar' ? 'mt-5' : '',
        className
      )}
    >
      <div className='mb-3 flex items-center justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <Filter className='h-4 w-4 text-primary' strokeWidth={1.75} />
          <span className='text-[0.65rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase'>
            Filters
          </span>
        </div>
        {hasActiveFilters && (
          <Button
            variant='ghost'
            size='sm'
            onClick={handleClearAll}
            className='h-7 px-2 text-xs active:scale-[0.98]'
          >
            <X className='mr-1 h-3 w-3' />
            Clear
          </Button>
        )}
      </div>

      <div
        className={cn(
          'gap-3',
          layout === 'sidebar'
            ? 'flex flex-col'
            : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'
        )}
      >
        <div className='flex flex-col gap-2'>
          <label className='text-xs font-medium text-muted-foreground'>
            Area
          </label>
          <select
            value={filterArea}
            onChange={(e) => {
              const value = e.target.value
              setFilterArea(isPortAreaCode(value) ? value : '')
            }}
            className={selectClassName}
            title='Area filter'
            aria-label='Area filter'
          >
            <option value=''>
              {mode === 'add' ? 'Select area' : 'All areas'}
            </option>
            {PORT_AREA_OPTIONS.map((area) => (
              <option key={area.value} value={area.value}>
                {area.label}
              </option>
            ))}
          </select>
        </div>

        <div className='flex flex-col gap-2'>
          <label className='text-xs font-medium text-muted-foreground'>
            Port
          </label>
          <select
            value={filterPort ?? ''}
            onChange={(e) =>
              setFilterPort(e.target.value ? Number(e.target.value) : null)
            }
            disabled={!filterArea}
            className={selectClassName}
            title='Port filter'
            aria-label='Port filter'
          >
            <option value=''>
              {!filterArea
                ? 'Select area first'
                : mode === 'add'
                  ? 'Select port'
                  : 'All ports'}
            </option>
            {availablePorts.map((port) => (
              <option key={port.id} value={port.id}>
                {port.name}
                {port.provinceName ? ` (${port.provinceName})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className='flex flex-col gap-2'>
          <label className='text-xs font-medium text-muted-foreground'>
            Service
          </label>
          <select
            value={filterServiceType ?? ''}
            onChange={(e) =>
              setFilterServiceType(
                e.target.value ? Number(e.target.value) : null
              )
            }
            className={selectClassName}
            title='Service type filter'
            aria-label='Service type filter'
          >
            <option value=''>
              {mode === 'add' ? 'Select service' : 'All services'}
            </option>
            {serviceTypes.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
        </div>

        <div className='flex flex-col gap-2'>
          <label className='text-xs font-medium text-muted-foreground'>
            Type
          </label>
          <select
            value={filterCommodityType ?? ''}
            onChange={(event) =>
              setFilterCommodityType(
                event.target.value ? Number(event.target.value) : null
              )
            }
            disabled={!filterServiceType || (mode === 'add' && !filterPort)}
            className={selectClassName}
            title='Commodity type filter'
            aria-label='Commodity type filter'
          >
            <option value=''>
              {mode === 'add' ? 'Select type' : 'All types'}
            </option>
            {availableCommodityTypes.map((commodityType) => (
              <option key={commodityType.id} value={commodityType.id}>
                {commodityType.name}
              </option>
            ))}
          </select>
        </div>

        <div className='flex flex-col gap-2'>
          <label className='text-xs font-medium text-muted-foreground'>
            Commodity
          </label>
          <select
            value={filterCommodity ?? ''}
            onChange={(e) =>
              setFilterCommodity(e.target.value ? Number(e.target.value) : null)
            }
            disabled={!filterServiceType || (mode === 'add' && !filterPort)}
            className={selectClassName}
            title='Commodity filter'
            aria-label='Commodity filter'
          >
            <option value=''>
              {mode === 'add' ? 'Select commodity' : 'All commodities'}
            </option>
            {availableCommodities.map((commodity) => (
              <option key={commodity.id} value={commodity.id}>
                {commodity.displayName}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
