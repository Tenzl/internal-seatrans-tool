import { commodityService } from '@/modules/gallery/services/commodityService'

export interface PackageTypeCatalogItem {
  id: number
  code: string
  displayName: string
  isActive: boolean
  sortOrder: number
}

export const packageTypeService = {
  listActive: async (
    signal?: AbortSignal
  ): Promise<PackageTypeCatalogItem[]> => {
    const serviceTypeId = await commodityService.resolveServiceTypeId(
      'freight-forwarding',
      signal
    )
    const types = await commodityService.listCommodityTypes(
      serviceTypeId,
      signal
    )
    return types.map((type, index) => ({
      id: type.id,
      code: type.name,
      displayName: type.name,
      isActive: true,
      sortOrder: index,
    }))
  },
}
