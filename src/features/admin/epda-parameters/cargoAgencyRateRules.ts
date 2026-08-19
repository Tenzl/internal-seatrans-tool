import type { CommodityType } from '@/modules/gallery/services/commodityService'
import type { CargoAgencyRate } from '@/modules/inquiries/components/common/quoteParameters'

export function buildCanonicalCargoAgencyRates(
  commodityTypes: CommodityType[],
  rates: CargoAgencyRate[],
  editedTypeId: number,
  editedRate: number
): CargoAgencyRate[] {
  return canonicalizeCargoAgencyRates(commodityTypes, rates).map((row) =>
    row.commodityTypeId === editedTypeId ? { ...row, rate: editedRate } : row
  )
}

export function canonicalizeCargoAgencyRates(
  commodityTypes: CommodityType[],
  rates: CargoAgencyRate[]
): CargoAgencyRate[] {
  return commodityTypes.map((type) => {
    const existing = rates.find((row) => row.commodityTypeId === type.id)
    return {
      commodityTypeId: type.id,
      typeNameSnapshot: existing?.typeNameSnapshot?.trim() || type.name,
      label: existing?.label?.trim() || type.name,
      rate: existing?.rate ?? 0,
    }
  })
}
