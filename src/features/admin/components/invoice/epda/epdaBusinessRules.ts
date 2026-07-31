import type {
  CargoType,
  Commodity,
} from '@/modules/gallery/services/commodityService'
import {
  legacyCargoTypeToCode,
  readInquiryCargoForEpda,
  type InquiryCargoFields,
} from '@/modules/gallery/shippingAgencyCargoCatalog'
import type { EpdaParameterValues } from '@/modules/inquiries/services/epdaParametersService'
import { parseFiniteNumber } from '@/shared/utils/parseNumber'

const normalizeOptionCode = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

export const isTallyFeeEligibleCargo = (value: string) => {
  const code = legacyCargoTypeToCode(value)
  return code === 'IN_BAG_PACK' || code === 'IN_EQUIPMENT'
}

export const isLoaAtOrAboveTugMaximum = (
  value: string,
  params: EpdaParameterValues
): boolean => {
  const loa = parseFiniteNumber(value)
  const activeMinimumLoas = (params.tugTiers ?? [])
    .filter((tier) => (parseFiniteNumber(tier.amount) ?? 0) > 0)
    .map((tier) => parseFiniteNumber(tier.minLoa))
    .filter((number): number is number => number !== null)

  if (loa === null || activeMinimumLoas.length === 0) return false
  return loa >= Math.max(...activeMinimumLoas)
}

export const canEnableFreightTaxByPurpose = (purpose: string) => {
  const normalized = normalizeOptionCode(purpose)
  return normalized === 'NHAP_XUAT' || normalized === 'CHUYEN_CANG_XUAT'
}

export const getShipQuarantineTrips = (purpose: string) => {
  const normalized = normalizeOptionCode(purpose)
  if (normalized === 'NHAP_XUAT') return 2
  if (normalized === 'NHAP_CHUYEN_CANG' || normalized === 'CHUYEN_CANG_XUAT')
    return 1
  return 0
}

export const hasCargoQuarantineFee = (purpose: string) =>
  normalizeOptionCode(purpose) !== 'MUC_DICH_KHAC'

export const formatUsdAmount = (value: number) =>
  value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export const isExportTotalAmountMode = (value: string) =>
  normalizeOptionCode(value) === 'EXPORT_FREIGHT_RATE_DECLARATION'

export const isExportPlsAdviseMode = (value: string) =>
  normalizeOptionCode(value) === 'EXPORT_PLS_ADVISE'

export const isImportFrtTaxType = (value: string) =>
  normalizeOptionCode(value) === 'IMPORT'

export const resolveInquiryCargo = (
  inquiryCargo: InquiryCargoFields,
  catalog: Commodity[]
): { cargoType: CargoType | ''; cargoName: string } => {
  const { cargoType, cargoName } = readInquiryCargoForEpda(
    inquiryCargo,
    catalog
  )
  const catalogContainsCargoType = cargoType
    ? catalog.some(
        (item) => legacyCargoTypeToCode(item.cargoType) === cargoType
      )
    : false

  return {
    cargoType: cargoType as CargoType | '',
    cargoName: catalogContainsCargoType ? cargoName : '',
  }
}
