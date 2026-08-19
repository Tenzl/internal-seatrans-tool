'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { isAdminRole } from '@/config/section-catalog'
import {
  commodityService,
  type CommodityAdminServiceSlug,
} from '@/modules/gallery/services/commodityService'
import { getRoleGroup } from '@/shared/utils/auth'
import { Boxes, Ship, Truck } from 'lucide-react'
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
    <div className='grid items-start gap-6 xl:grid-cols-2'>
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
      <section className='maritime-grid-subtle relative overflow-hidden rounded-2xl border border-primary/15 bg-primary/[0.045] px-5 pt-5 pb-6 shadow-[0_18px_45px_-36px_color-mix(in_oklch,var(--primary)_55%,transparent)] sm:px-7 sm:pt-7 sm:pb-7'>
        <div className='relative'>
          <div className='max-w-2xl'>
            <div className='mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-primary uppercase'>
              <span className='flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm'>
                <Boxes className='size-4' aria-hidden='true' />
              </span>
              Data management
            </div>
            <h1 className='text-2xl font-semibold tracking-[-0.035em] text-balance text-foreground sm:text-3xl'>
              Commodity catalog
            </h1>
          </div>
        </div>

        <div className='relative mt-6 border-t border-primary/10 pt-4'>
          <div className='mb-3 flex items-end justify-between gap-4'>
            <div>
              <h2 className='text-sm font-semibold tracking-[-0.015em] text-foreground'>
                Service workspace
              </h2>
              <p className='mt-0.5 text-xs text-muted-foreground'>
                Switch between the two managed catalogs.
              </p>
            </div>
            <span className='hidden font-mono text-xs text-muted-foreground tabular-nums sm:block'>
              02 services
            </span>
          </div>
          <div
            role='tablist'
            aria-label='Service scope'
            className='grid gap-2 rounded-xl bg-background/45 p-1.5 ring-1 ring-border/60 backdrop-blur-sm sm:grid-cols-2'
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
                      ? 'group relative h-auto min-h-16 justify-start overflow-hidden rounded-lg border border-primary/25 bg-background px-3.5 py-3 text-foreground shadow-[0_12px_24px_-20px_color-mix(in_oklch,var(--primary)_70%,transparent)] after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary hover:bg-background active:translate-y-px'
                      : 'group h-auto min-h-16 justify-start rounded-lg border border-transparent bg-transparent px-3.5 py-3 text-muted-foreground hover:border-border/70 hover:bg-background/75 hover:text-foreground active:translate-y-px'
                  }
                  onClick={() => setPreferredServiceSlug(service.slug)}
                >
                  <span
                    className={
                      active
                        ? 'flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm'
                        : 'flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:text-foreground'
                    }
                  >
                    <ServiceIcon className='size-4' aria-hidden='true' />
                  </span>
                  <span className='min-w-0 text-left'>
                    <span className='block truncate text-sm font-semibold tracking-[-0.01em]'>
                      {service.label}
                    </span>
                    <span className='mt-0.5 block text-[0.7rem] font-normal text-muted-foreground'>
                      Commodity workspace
                    </span>
                  </span>
                </Button>
              )
            })}
          </div>
          {servicesQuery.isFetching ? (
            <div
              className='mt-3 grid gap-2 sm:grid-cols-2'
              aria-label='Loading Services'
            >
              <span className='h-16 animate-pulse rounded-lg bg-muted' />
              <span className='h-16 animate-pulse rounded-lg bg-muted/70' />
            </div>
          ) : null}
          {servicesQuery.isError ? (
            <p className='mt-2 text-sm text-destructive'>
              Failed to load Services.
            </p>
          ) : null}
          {!servicesQuery.isFetching &&
          !servicesQuery.isError &&
          !selectedService ? (
            <p className='mt-2 text-sm text-muted-foreground'>
              No active Services available.
            </p>
          ) : null}
        </div>
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
