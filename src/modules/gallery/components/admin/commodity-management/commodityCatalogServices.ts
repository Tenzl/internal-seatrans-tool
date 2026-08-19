import type { CommodityAdminService } from '@/modules/gallery/services/commodityService'

const COMMODITY_CATALOG_SERVICE_SLUGS = [
  'freight-forwarding',
  'shipping-agency',
] as const

export function filterCommodityCatalogServices(
  services: CommodityAdminService[]
): CommodityAdminService[] {
  return COMMODITY_CATALOG_SERVICE_SLUGS.flatMap((slug) => {
    const service = services.find((candidate) => candidate.slug === slug)
    return service ? [service] : []
  })
}
