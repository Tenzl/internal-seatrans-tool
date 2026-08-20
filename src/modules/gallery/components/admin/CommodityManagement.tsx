'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isAdminRole } from '@/config/section-catalog'
import {
  commodityService,
  type CommodityAdminServiceSlug,
} from '@/modules/gallery/services/commodityService'
import { getRoleGroup } from '@/shared/utils/auth'
import { Ship, Truck } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Button } from '@/components/ui/button'
import { CommoditiesTable } from './commodity-management/CommoditiesTable'
import { CommodityTypesTable } from './commodity-management/CommodityTypesTable'
import { filterCommodityCatalogServices } from './commodity-management/commodityCatalogServices'
import { useCommodities } from './commodity-management/useCommodities'
import { useCommodityTypes } from './commodity-management/useCommodityTypes'

interface CatalogTablesProps {
  serviceSlug: CommodityAdminServiceSlug
  canManage: boolean
}

function CatalogTables({ serviceSlug, canManage }: CatalogTablesProps) {
  const typeManagement = useCommodityTypes(serviceSlug)
  const commodityManagement = useCommodities(serviceSlug)

  return (
    <div className='space-y-6'>
      <CommodityTypesTable
        key={`types-${serviceSlug}`}
        types={typeManagement.types}
        loading={typeManagement.loading}
        canManage={canManage}
        onCreate={typeManagement.createType}
        onUpdate={typeManagement.updateType}
        onDelete={typeManagement.deleteType}
      />

      <CommoditiesTable
        key={`commodities-${serviceSlug}`}
        commodities={commodityManagement.commodities}
        loading={commodityManagement.loading}
        canManage={canManage}
        onCreate={commodityManagement.createCommodity}
        onUpdate={commodityManagement.updateCommodity}
        onDelete={commodityManagement.deleteCommodity}
      />
    </div>
  )
}

export function ManageCommodities() {
  const currentUser = useCurrentUser()
  const [preferredServiceSlug, setPreferredServiceSlug] =
    useState<CommodityAdminServiceSlug | null>(null)
  const servicesQuery = useQuery({
    queryKey: ['admin', 'commodity-catalog', 'services'],
    queryFn: ({ signal }) =>
      commodityService.listCommodityAdminServices(signal),
    retry: false,
  })
  const services = filterCommodityCatalogServices(servicesQuery.data ?? [])
  const selectedService =
    services.find((service) => service.slug === preferredServiceSlug) ??
    services[0] ??
    null
  const canAddCommodity = getRoleGroup(currentUser) === 'INTERNAL'
  const canManage = isAdminRole(currentUser?.role) || canAddCommodity

  return (
    <div className='space-y-6'>
      <section
        aria-label='Service selector'
        className='rounded-2xl bg-muted/35 p-2 ring-1 ring-border/70'
      >
        <div
          role='tablist'
          aria-label='Service scope'
          className='grid gap-2 sm:grid-cols-2'
        >
          {services.map((service) => {
            const active = selectedService?.id === service.id
            const ServiceIcon =
              service.slug === 'freight-forwarding' ? Truck : Ship
            return (
              <Button
                key={service.id}
                type='button'
                role='tab'
                aria-selected={active}
                variant='ghost'
                className={
                  active
                    ? 'group relative h-12 justify-start overflow-hidden rounded-xl border border-primary/25 bg-background px-3.5 text-foreground shadow-sm after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary hover:bg-background active:translate-y-px'
                    : 'group h-12 justify-start rounded-xl border border-transparent px-3.5 text-muted-foreground hover:border-border/70 hover:bg-background/75 hover:text-foreground active:translate-y-px'
                }
                onClick={() => setPreferredServiceSlug(service.slug)}
              >
                <span
                  className={
                    active
                      ? 'flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm'
                      : 'flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground ring-1 ring-border/60 transition-colors group-hover:text-foreground'
                  }
                >
                  <ServiceIcon className='size-4' aria-hidden='true' />
                </span>
                <span className='truncate text-sm font-semibold tracking-[-0.01em]'>
                  {service.label}
                </span>
              </Button>
            )
          })}
        </div>
        {servicesQuery.isFetching ? (
          <div
            className='grid gap-2 sm:grid-cols-2'
            aria-label='Loading Services'
          >
            <span className='h-12 animate-pulse rounded-xl bg-muted' />
            <span className='h-12 animate-pulse rounded-xl bg-muted/70' />
          </div>
        ) : null}
        {servicesQuery.isError ? (
          <p className='px-2 py-1 text-sm text-destructive'>
            Failed to load Services.
          </p>
        ) : null}
        {!servicesQuery.isFetching &&
        !servicesQuery.isError &&
        !selectedService ? (
          <p className='px-2 py-1 text-sm text-muted-foreground'>
            No active Services available.
          </p>
        ) : null}
      </section>

      {selectedService ? (
        <CatalogTables
          key={selectedService.id}
          serviceSlug={selectedService.slug}
          canManage={canManage}
        />
      ) : null}
    </div>
  )
}
