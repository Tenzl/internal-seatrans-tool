import type { CargoType } from '@/modules/gallery/services/commodityService'
import {
  resolveCargoAgencyRate,
  type EpdaParameterValues,
} from '@/modules/inquiries/components/common/quoteParameters'
import { getAgencyFeeByGrt } from '../epdaFormParameters'

interface AgencyFeeSummaryInput {
  grt: string
  cargoQty: string
  commodityTypeId: number | null
  cargoType: CargoType | ''
  discountPercent: string
}

export interface AgencyFeeSummary {
  grtBand: { amount: number; label: string }
  cargoRate: number
  cargoQty: number
  cargoBaseAmount: number
  discountPercent: number
  payablePercent: number
}

export function calculateAgencyFeeSummary(
  input: AgencyFeeSummaryInput,
  params: EpdaParameterValues
): AgencyFeeSummary {
  const grt = Number(input.grt)
  const cargoQty = Number(input.cargoQty)
  const rawDiscount = Number(input.discountPercent)
  const discountPercent = Number.isFinite(rawDiscount)
    ? Math.min(100, Math.max(0, rawDiscount))
    : 0
  const normalizedCargoQty =
    Number.isFinite(cargoQty) && cargoQty > 0 ? cargoQty : 0
  // Keep the on-screen preview aligned with the PDF: missing cargo rates are zero.
  const cargoRate =
    resolveCargoAgencyRate(input.commodityTypeId, input.cargoType, params) ?? 0

  return {
    grtBand:
      Number.isFinite(grt) && grt > 0
        ? getAgencyFeeByGrt(grt, params.agencyFeeTiers)
        : { amount: 0, label: '0 - 1,000' },
    cargoRate,
    cargoQty: normalizedCargoQty,
    cargoBaseAmount: cargoRate * normalizedCargoQty,
    discountPercent,
    payablePercent: ((100 - discountPercent) / 100) * 100,
  }
}
