import { describe, expect, it } from 'vitest'
import { defaultParameterValues } from '@/features/admin/components/invoice/epdaFormParameters'
import {
  canEnableFreightTaxByPurpose,
  getShipQuarantineTrips,
  hasCargoQuarantineFee,
  isExportPlsAdviseMode,
  isExportTotalAmountMode,
  isImportFrtTaxType,
  isLoaAtOrAboveTugMaximum,
  isTallyFeeEligibleCargo,
  resolveInquiryCargo,
} from './epdaBusinessRules'

describe('EPDA business rules', () => {
  it('normalizes purpose values before applying freight and quarantine rules', () => {
    expect(canEnableFreightTaxByPurpose('nhap xuat')).toBe(true)
    expect(canEnableFreightTaxByPurpose('nhap-chuyen-cang')).toBe(false)
    expect(getShipQuarantineTrips('NHAP XUAT')).toBe(2)
    expect(getShipQuarantineTrips('chuyen-cang-xuat')).toBe(1)
    expect(getShipQuarantineTrips('MUC_DICH_KHAC')).toBe(0)
    expect(hasCargoQuarantineFee('muc dich khac')).toBe(false)
  })

  it('recognizes canonical and legacy tally-fee cargo types', () => {
    expect(isTallyFeeEligibleCargo('IN_BAG_PACK')).toBe(true)
    expect(isTallyFeeEligibleCargo('EQUIPMENT')).toBe(true)
    expect(isTallyFeeEligibleCargo('BULK')).toBe(false)
  })

  it('recognizes freight-tax modes regardless of input formatting', () => {
    expect(isExportTotalAmountMode('export freight rate declaration')).toBe(
      true
    )
    expect(isExportPlsAdviseMode('EXPORT-PLS-ADVISE')).toBe(true)
    expect(isImportFrtTaxType(' import ')).toBe(true)
  })

  it('uses the highest active tug tier as the manual-rate threshold', () => {
    const params = defaultParameterValues('HCM')
    const activeMinimumLoas = params.tugTiers
      .filter((tier) => tier.amount > 0)
      .map((tier) => tier.minLoa)
    const maximum = Math.max(...activeMinimumLoas)

    expect(isLoaAtOrAboveTugMaximum(String(maximum - 1), params)).toBe(false)
    expect(isLoaAtOrAboveTugMaximum(String(maximum), params)).toBe(true)
    expect(isLoaAtOrAboveTugMaximum('', params)).toBe(false)
  })

  it('preserves an inquiry Commodity independently when Type is missing', () => {
    const cargo = {
      cargoType: 'IN_BAGS',
      cargoName: 'Rice',
      cargoNameOther: null,
    }
    const catalog = [
      {
        id: 1,
        name: 'Rice',
        displayName: 'Rice',
        cargoType: 'IN_BAG_PACK',
        serviceTypeId: 1,
        requiredImageCount: 0,
      },
    ]

    expect(resolveInquiryCargo(cargo, catalog)).toEqual({
      commodityTypeId: null,
      cargoType: 'IN_BAGS',
      cargoName: 'Rice',
    })
    expect(resolveInquiryCargo(cargo, [])).toEqual({
      commodityTypeId: null,
      cargoType: 'IN_BAGS',
      cargoName: 'Rice',
    })
  })
})
