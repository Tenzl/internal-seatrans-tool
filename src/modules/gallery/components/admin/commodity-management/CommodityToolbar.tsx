import type { CommodityAdminServiceSlug } from '@/modules/gallery/services/commodityService'
import { Button } from '@/components/ui/button'
import { COMMODITY_SERVICE_TABS } from './commodityManagementModel'

interface CommodityToolbarProps {
  serviceSlug: CommodityAdminServiceSlug
  groupCount: number
  onServiceSlugChange: (slug: CommodityAdminServiceSlug) => void
}

export function CommodityToolbar({
  serviceSlug,
  groupCount,
  onServiceSlugChange,
}: CommodityToolbarProps) {
  return (
    <div className='space-y-4 rounded-lg border border-border/70 bg-card p-5'>
      <div>
        <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
          Service scope
        </p>
        <h2 className='mt-1 text-lg font-semibold tracking-tight text-foreground'>
          Commodities
        </h2>
        <p className='mt-1 max-w-xl text-sm text-muted-foreground'>
          Manage groups and commodities for Shipping Agency and Freight
          Forwarding only.
        </p>
      </div>

      <div>
        <p className='mb-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
          Service
        </p>
        <div
          role='tablist'
          aria-label='Service scope'
          className='flex flex-wrap items-center gap-2'
        >
          {COMMODITY_SERVICE_TABS.map((tab) => {
            const active = serviceSlug === tab.slug
            return (
              <Button
                key={tab.slug}
                type='button'
                role='tab'
                aria-selected={active}
                size='sm'
                variant={active ? 'default' : 'outline'}
                onClick={() => onServiceSlugChange(tab.slug)}
                className='gap-2 transition-colors'
              >
                {tab.label}
                {active ? (
                  <span className='rounded bg-background/20 px-1.5 py-0.5 text-xs tabular-nums'>
                    {groupCount}
                  </span>
                ) : null}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
