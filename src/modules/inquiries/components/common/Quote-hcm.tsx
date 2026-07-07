import React from 'react'
import { formatCargoNameWithType, normalizeInvoiceNumericFields } from '@/shared/utils/invoiceFormatters'
import { legacyCargoTypeToCode } from '@/modules/gallery/shippingAgencyCargoCatalog'
import {
  defaultParameterValues,
  resolveGrtTier,
  resolveLoaTier,
  type EpdaParameterValues,
} from './quoteParameters'

export type QuoteRow = {
  no?: string | number
  item?: string
  details?: string
  add?: string
  remark?: string
  amount?: string | number
  mergeItemDetails?: boolean
}

export type QuoteData = {
  to_shipowner?: string
  date?: string
  ref?: string
  mv?: string
  dwt?: string
  grt?: string
  loa?: string
  eta?: string
  cargo_qty_mt?: string
  cargo_name_upper?: string
  cargo_type?: string
  ship_type?: string
  purpose_of_calling?: string
  port_upper?: string
  loading_term?: string
  ocean_frt_rate_usd_per_mt?: string | number
  garbage_usd_rate?: string | number
  garbage_cbm_amount?: string | number
  at_anchorage?: string
  at_berth?: string
  total_a?: string
  total_b?: string
  grand_total?: string
  bank_name?: string
  bank_address?: string
  beneficiary?: string
  usd_account?: string
  swift?: string
  berth_hours?: string | number
  buoy_due_hours?: string | number
  anchorage_hours?: string | number
  transport_quarantine?: string | number
  quarantine_cargo_trips?: string | number
  transport_ls?: string | number
  boat_hire_entry?: string | number
  agency_fee_mode?: string
  agency_discount_percent?: string | number
  agency_lumpsum_amount?: string | number
  tally_fee?: string | number
  /** Manual tug-assistance amount — used when LOA is above the highest tug band. */
  tug_assistance?: string | number
  pilotage_third_miles?: string | number
  /** Resolved EPDA parameter set for the selected area/port. Falls back to HCM defaults. */
  params?: EpdaParameterValues
  AA_ROWS?: QuoteRow[]
  BB_ROWS?: QuoteRow[]
}

const escapeHtml = (value: unknown) => {
  const raw = value === undefined || value === null || value === '' ? '' : String(value)
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '')
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const formatAmount = (value: unknown) => {
  const num = toNumber(value)
  if (num === null) return escapeHtml(value)
  const rounded = Math.ceil(num * 100) / 100
  return rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const formatCbm = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

const formatLoaDisplay = (value: unknown) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/[a-zA-Z]$/.test(raw)) return raw.toUpperCase()
  return `${raw}M`
}

const hasText = (value: unknown) => {
  if (value === undefined || value === null) return false
  return String(value).trim() !== ''
}

const isMeaningfulQuoteRow = (row: QuoteRow) => {
  return [row.item, row.details, row.add, row.remark, row.amount].some(hasText)
}

const shouldIncludeFeeRow = (row: QuoteRow) => {
  const amountNumeric = toNumber(row.amount)
  if (amountNumeric !== null && amountNumeric <= 0) return false
  return true
}

const normalizeCustomRows = (rows: QuoteRow[]) => {
  return rows
    .filter(isMeaningfulQuoteRow)
    .filter(shouldIncludeFeeRow)
    .map((row, index) => ({ ...row, no: index + 1 }))
}

const reindexNumberedRows = (rows: QuoteRow[]) => {
  let currentNo = 1
  return rows.map((row) => {
    if (row.no === '') return row
    return { ...row, no: currentNo++ }
  })
}

const normalizePurpose = (value: unknown) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

const normalizeFrtTaxType = (value: unknown) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

const normalizeAgencyFeeMode = (value: unknown) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

const isExportPlsAdviseMode = (frtTaxType?: string) => normalizeFrtTaxType(frtTaxType) === 'EXPORT_PLS_ADVISE'

const isExportTotalAmountMode = (frtTaxType?: string) => {
  const normalized = normalizeFrtTaxType(frtTaxType)
  return (
    normalized === 'EXPORT' ||
    normalized === 'EXPORT_FREIGHT_RATE_DECLARATION'
  )
}

const shouldShowOceanFrtTax = (purposeOfCalling?: string, frtTaxType?: string) => {
  const normalizedFrtTaxType = normalizeFrtTaxType(frtTaxType)
  if (normalizedFrtTaxType === 'IMPORT') return false

  const normalizedPurpose = normalizePurpose(purposeOfCalling)
  if (normalizedPurpose === 'NHAP_XUAT' || normalizedPurpose === 'CHUYEN_CANG_XUAT') {
    return true
  }
  return isExportTotalAmountMode(frtTaxType) || isExportPlsAdviseMode(frtTaxType)
}

const normalizeCargoType = (value: unknown) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

const isTallyFeeEligibleCargo = (cargoType?: string) => {
  // Bag/Pack and Equipment incur a tally fee; Bulk does not. Canonicalize first so
  // both legacy ("IN_BAGS", "EQUIPMENT") and current codes (IN_BAG_PACK / IN_EQUIPMENT)
  // match — the canonical bag code IN_BAG_PACK does NOT contain the substring "IN_BAGS".
  const code = legacyCargoTypeToCode(cargoType)
  return code === 'IN_BAG_PACK' || code === 'IN_EQUIPMENT'
}

const isTankerShip = (value?: string) => {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
  return normalized === 'TANKER_SHIP'
}

const getShipQuarantineTrips = (purposeOfCalling?: string) => {
  const normalized = normalizePurpose(purposeOfCalling)
  if (normalized === 'NHAP_XUAT') return 2
  if (normalized === 'NHAP_CHUYEN_CANG' || normalized === 'CHUYEN_CANG_XUAT') return 1
  return 0
}

const buildAARows = (
  rows: QuoteRow[],
  grt?: string | number,
  options?: {
    berthHours?: string | number
    buoyDueHours?: string | number
    anchorageHours?: string | number
    frtTaxType?: string
    purposeOfCalling?: string
    shipType?: string
    transportQuarantine?: string | number
    tallyFee?: string | number
    tugAssistanceOverride?: string | number
    cargoType?: string
    loa?: string | number
    mooringLocation?: 'berth' | 'anchorage'
    pilotageThirdMiles?: string | number
    cargoQtyMt?: string | number
    quarantineCargoTrips?: string | number
    oceanFrtRateUsdPerMt?: string | number
    garbageUsdRate?: string | number
    garbageCbmAmount?: string | number
    params?: EpdaParameterValues
  },
): { html: string; total?: string } => {
  const customRows = normalizeCustomRows(rows)
  const P = options?.params ?? defaultParameterValues('HCM')

  const renderRow = (row: QuoteRow, index: number) => {
    const no = escapeHtml(row.no ?? index + 1)
    if (row.mergeItemDetails) {
      return `
      <tr>
        <td class="col-no">${no}</td>
        <td class="col-item" colspan="2"><span class="bold">${escapeHtml(row.item)}</span></td>
        <td class="col-add">${escapeHtml(row.add)}</td>
        <td class="col-remark">${escapeHtml(row.remark)}</td>
        <td class="col-amount">${formatAmount(row.amount)}</td>
      </tr>`
    }

    return `
      <tr>
        <td class="col-no">${no}</td>
        <td class="col-item"><span class="bold">${escapeHtml(row.item)}</span></td>
        <td class="col-details">${escapeHtml(row.details)}</td>
        <td class="col-add">${escapeHtml(row.add)}</td>
        <td class="col-remark">${escapeHtml(row.remark)}</td>
        <td class="col-amount">${formatAmount(row.amount)}</td>
      </tr>`
  }

  if (!customRows.length) {
    const grtDisplay = escapeHtml(grt ?? 'GRT')
    const grtNumeric = toNumber(grt)

    const berthHoursNumeric = toNumber(options?.berthHours)
    const berthHoursValue = berthHoursNumeric === null ? 96 : berthHoursNumeric
    const berthHoursText = `${berthHoursValue} hrs`
    const berthDays = berthHoursValue > 0 ? Math.ceil(berthHoursValue / 24).toFixed(1) : '0.0'
    const berthRemark = `abt. ${berthDays} days`

    const anchorageHoursNumeric = toNumber(options?.anchorageHours)
    const anchorageHoursValue = anchorageHoursNumeric === null ? 24 : anchorageHoursNumeric
    const anchorageHoursText = `${anchorageHoursValue} hrs`
    const anchorageDays = anchorageHoursValue > 0 ? Math.ceil(anchorageHoursValue / 24).toFixed(1) : '0.0'
    const anchorageRemark = anchorageHoursValue ? `abt. ${anchorageDays} days` : ''

    const shipRateFactor = isTankerShip(options?.shipType) ? P.coeff.tankerFactor : (P.coeff.bulkFactor ?? 1)
    const tankerRemark = shipRateFactor !== 1 ? '(x85% for tanker)' : ''

    const tonnageValue = grtNumeric === null ? null : P.coeff.tonnagePerGrt * grtNumeric * 2 * shipRateFactor
    const tonnage = tonnageValue === null ? `${P.coeff.tonnagePerGrt}*${grtDisplay}*2` : formatAmount(tonnageValue)

    const navigationDueValue =
      grtNumeric === null ? null : P.coeff.navigationPerGrt * grtNumeric * 2 * shipRateFactor
    const navigationDue =
      navigationDueValue === null ? `${P.coeff.navigationPerGrt}*${grtDisplay}*2` : formatAmount(navigationDueValue)

    // Admin enters the total distance to the buoy/berth position.
    // Legs 1 & 2 are flat tariff bands: each charges its full miles once the
    // position reaches into it (not prorated). Leg 3 is the remainder beyond
    // (leg1 + leg2). E.g. position 17 → leg1 (10) + leg2 (20); position 37 →
    // leg1 (10) + leg2 (20) + leg3 (7).
    const leg1Width = P.coeff.pilotageLeg1Miles
    const leg2Width = P.coeff.pilotageLeg2Miles
    const buoyPositionNumeric = toNumber(options?.pilotageThirdMiles)
    const buoyPosition =
      buoyPositionNumeric === null ? P.hours.pilotageThirdMiles : buoyPositionNumeric
    const pilotageFirstMiles = buoyPosition > 0 ? leg1Width : 0
    const pilotageSecondMiles = buoyPosition > leg1Width ? leg2Width : 0
    const pilotageThirdMiles = Math.max(buoyPosition - leg1Width - leg2Width, 0)

    const pilotageFirstValue =
      grtNumeric === null ? null : P.coeff.pilotageLeg1Rate * grtNumeric * 2 * pilotageFirstMiles * shipRateFactor
    const pilotageFirst =
      pilotageFirstValue === null
        ? `${P.coeff.pilotageLeg1Rate}*${grtDisplay}*2*${pilotageFirstMiles}`
        : formatAmount(pilotageFirstValue)

    const pilotageSecondValue =
      grtNumeric === null ? null : P.coeff.pilotageLeg2Rate * grtNumeric * 2 * pilotageSecondMiles * shipRateFactor
    const pilotageSecond =
      pilotageSecondValue === null
        ? `${P.coeff.pilotageLeg2Rate}*${grtDisplay}*2*${pilotageSecondMiles}`
        : formatAmount(pilotageSecondValue)

    const pilotageThirdValue =
      grtNumeric === null ? null : P.coeff.pilotageLeg3Rate * grtNumeric * 2 * pilotageThirdMiles * shipRateFactor
    const pilotageThird =
      pilotageThirdValue === null
        ? `${P.coeff.pilotageLeg3Rate}*${grtDisplay}*2*${pilotageThirdMiles}`
        : formatAmount(pilotageThirdValue)

    const loaNumeric = toNumber(options?.loa)
    const tugRate = resolveLoaTier(loaNumeric, P.tugTiers)
    // Above the highest tug band, the charge is entered manually (negotiable).
    const tugOverride = toNumber(options?.tugAssistanceOverride)
    const tugAssistance =
      tugOverride !== null
        ? formatAmount(tugOverride)
        : tugRate === undefined
          ? ''
          : formatAmount(tugRate.amount * 2)
    const mooringLocation = (options?.mooringLocation || '').toLowerCase() === 'anchorage' ? 'anchorage' : 'berth'
    const moorUnmoorRate = resolveGrtTier(
      grtNumeric,
      mooringLocation === 'anchorage' ? P.moorUnmoorBuoyTiers : P.moorUnmoorBerthTiers,
    )
    const moorUnmoor = moorUnmoorRate === undefined ? '' : formatAmount(moorUnmoorRate.amount)

    const berthDueValue =
      grtNumeric === null ? null : P.coeff.berthDuePerGrtHour * berthHoursValue * grtNumeric * shipRateFactor
    const berthDue =
      berthDueValue === null ? `${P.coeff.berthDuePerGrtHour}*${grtDisplay}*${berthHoursValue}` : formatAmount(berthDueValue)

    const buoyDueHoursNumeric = toNumber(options?.buoyDueHours)
    const buoyDueHoursValue = buoyDueHoursNumeric === null ? anchorageHoursValue : buoyDueHoursNumeric
    const buoyDueHoursText = `${buoyDueHoursValue} hrs`
    const buoyDueDays = buoyDueHoursValue > 0 ? Math.ceil(buoyDueHoursValue / 24).toFixed(1) : '0.0'
    const buoyDueRemark = buoyDueHoursValue ? `abt. ${buoyDueDays} days` : ''
    const buoyDueValue =
      grtNumeric === null ? null : P.coeff.buoyDuePerGrtHour * buoyDueHoursValue * grtNumeric * shipRateFactor
    const buoyDue =
      buoyDueValue === null ? `${P.coeff.buoyDuePerGrtHour}*${grtDisplay}*${buoyDueHoursValue}` : formatAmount(buoyDueValue)

    const anchorageFeesValue =
      grtNumeric === null ? null : P.coeff.anchoragePerGrtHour * anchorageHoursValue * grtNumeric * shipRateFactor
    const anchorageFees =
      anchorageFeesValue === null
        ? `${P.coeff.anchoragePerGrtHour}*${grtDisplay}*${anchorageHoursValue}`
        : formatAmount(anchorageFeesValue)

    const shipQuarantineTrips = getShipQuarantineTrips(options?.purposeOfCalling)
    const shipQuarantineUnit =
      grtNumeric !== null && grtNumeric >= P.quarantine.shipThresholdGrt
        ? P.quarantine.shipUnitHighGrt
        : P.quarantine.shipUnitLowGrt
    const shipQuarantineFeeValue = shipQuarantineTrips * shipQuarantineUnit

    const purposeNormalized = normalizePurpose(options?.purposeOfCalling)
    const cargoQtyNumeric = toNumber(options?.cargoQtyMt)
    const cargoTripsNumeric = toNumber(options?.quarantineCargoTrips)
    const cargoQuarantineTrips = cargoTripsNumeric !== null && cargoTripsNumeric >= 0 ? cargoTripsNumeric : 1
    const cargoQuarantineFeeValue =
      purposeNormalized === 'MUC_DICH_KHAC' || cargoQtyNumeric === null || cargoQtyNumeric <= 0
        ? 0
        : P.quarantine.cargoPerTrip * cargoQuarantineTrips

    const quarantineFeeValue = shipQuarantineFeeValue + cargoQuarantineFeeValue
    const quarantineFee = formatAmount(quarantineFeeValue)
    
    const showOceanFrtTax = shouldShowOceanFrtTax(options?.purposeOfCalling, options?.frtTaxType)
    const oceanFrtRateInput = toNumber(options?.oceanFrtRateUsdPerMt)
    const oceanFrtRate =
      oceanFrtRateInput !== null && oceanFrtRateInput > 0 ? oceanFrtRateInput : P.coeff.oceanFrtDefaultRate
    const cargoQtyForFrtTax = cargoQtyNumeric !== null && cargoQtyNumeric > 0 ? cargoQtyNumeric : 0
    const oceanFrtTaxValue = oceanFrtRate * cargoQtyForFrtTax * P.coeff.oceanFrtTaxRate
    const oceanFrtRateText = oceanFrtRate.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
    const oceanFrtQtyText = cargoQtyForFrtTax.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })
    const isExportPlsAdvise = isExportPlsAdviseMode(options?.frtTaxType)
    const oceanFrtTaxDetail = isExportPlsAdvise
      ? 'Total Frt x 2% tax rate'
      : `Frt USD${oceanFrtRateText}/mt x abt ${oceanFrtQtyText}mts x 2%`
    const oceanFrtTaxRemark = isExportPlsAdvise ? 'PLS ADVICE' : ''
    const oceanFrtTaxAmount: string | number = isExportPlsAdvise ? 'xxx' : oceanFrtTaxValue

    const transportQuarantineNumeric = toNumber(options?.transportQuarantine)
    const hasTransportQuarantine = transportQuarantineNumeric !== null && transportQuarantineNumeric > 0
    const transportQuarantineAmount = hasTransportQuarantine ? transportQuarantineNumeric : undefined

    const tallyFeeNumeric = toNumber(options?.tallyFee)
    const hasTallyFee =
      isTallyFeeEligibleCargo(options?.cargoType) && tallyFeeNumeric !== null && tallyFeeNumeric > 0
    const tallyFeeAmount = hasTallyFee ? tallyFeeNumeric : undefined

    const clearanceFeesValue = P.coeff.clearanceFee
    const clearanceFees = formatAmount(clearanceFeesValue)

    // Garbage = rate/cbm × ceil(days / 2) × cbm. Days follow the stay location:
    // at buoy/anchorage use buoy-due hours, otherwise berth-due hours.
    const garbageHoursValue = mooringLocation === 'anchorage' ? buoyDueHoursValue : berthHoursValue
    const garbageDaysNumeric = garbageHoursValue / 24
    const garbageUsdNumeric = toNumber(options?.garbageUsdRate)
    const garbageDefaultRate =
      mooringLocation === 'anchorage' ? P.garbage.atBuoyUsd : P.garbage.atBerthUsd
    const garbageUsdRate =
      garbageUsdNumeric !== null && garbageUsdNumeric > 0 ? garbageUsdNumeric : garbageDefaultRate
    const garbageCbmNumeric = toNumber(options?.garbageCbmAmount)
    const garbageCbmAmount = garbageCbmNumeric !== null && garbageCbmNumeric > 0 ? garbageCbmNumeric : 1
    const garbageRemovalValueFinal =
      garbageUsdRate * Math.ceil(garbageDaysNumeric / 2) * garbageCbmAmount
    const garbageCbmAddText = garbageCbmAmount > 1 ? `${formatCbm(garbageCbmAmount)} cbm` : ''
    const garbageRemoval = formatAmount(garbageRemovalValueFinal)
    
    const defaultRows: QuoteRow[] = []
    let currentNo = 1
    const nextNo = () => currentNo++
    const pushNumbered = (row: QuoteRow) => defaultRows.push({ ...row, no: row.no ?? nextNo() })
    const pushUnnumbered = (row: QuoteRow) => defaultRows.push({ ...row, no: '' })

    pushNumbered({
      item: 'Tonnage',
      details: `USD ${P.coeff.tonnagePerGrt} / GRT x 2 (in & out)`,
      remark: tankerRemark,
      amount: tonnage,
    })
    pushNumbered({
      item: 'Navigation due',
      details: `USD ${P.coeff.navigationPerGrt} / GRT x 2 (in & out)`,
      remark: tankerRemark,
      amount: navigationDue,
    })
    pushNumbered({
      item: 'Pilotage',
      details: `USD${P.coeff.pilotageLeg1Rate} / GRT (in+out)`,
      add: `${pilotageFirstMiles} miles`,
      remark: tankerRemark || `1st ${pilotageFirstMiles} miles`,
      amount: pilotageFirst,
    })
    pushUnnumbered({
      item: '',
      details: `USD${P.coeff.pilotageLeg2Rate} / GRT (in+out)`,
      add: `${pilotageSecondMiles} miles`,
      remark: tankerRemark || `2nd ${pilotageSecondMiles} miles`,
      amount: pilotageSecond,
    })
    pushUnnumbered({
      item: '',
      details: `USD${P.coeff.pilotageLeg3Rate} / GRT (in+out)`,
      add: `${pilotageThirdMiles} miles`,
      remark: tankerRemark || `3rd ${pilotageThirdMiles} miles`,
      amount: pilotageThird,
    })
    pushNumbered({ item: 'Tug assistance charge', details: '(in & out)', amount: tugAssistance })
    pushNumbered({ item: 'Moor / Unmooring', details: '', amount: moorUnmoor })

    if (mooringLocation === 'anchorage') {
      pushNumbered({
        item: 'Buoy due',
        details: 'USD 0.0013 / GRT / hour x',
        add: buoyDueHoursText,
        remark: tankerRemark || buoyDueRemark,
        amount: buoyDue,
      })
    } else {
      pushNumbered({
        item: 'Berth due',
        details: 'USD 0.0031 / GRT / hour x',
        add: berthHoursText,
        remark: tankerRemark || berthRemark,
        amount: berthDue,
      })
    }

    pushNumbered({
      item: 'Anchorage fees if any',
      details: 'USD 0.0005 / GRT / hour x',
      add: anchorageHoursText,
      remark: tankerRemark || anchorageRemark,
      amount: anchorageFees,
    })

    pushNumbered({ item: 'Quarantine fee', details: '', amount: quarantineFee })

    if (showOceanFrtTax) {
      pushNumbered({
        item: 'Ocean Frt Tax',
        details: oceanFrtTaxDetail,
        remark: oceanFrtTaxRemark,
        amount: oceanFrtTaxAmount,
      })
    }

    if (hasTransportQuarantine && transportQuarantineAmount !== undefined) {
      pushNumbered({
        item: 'Boat hired for quarantine',
        details: '',
        amount: transportQuarantineAmount,
        mergeItemDetails: true,
      })
    }

    if (hasTallyFee && tallyFeeAmount !== undefined) {
      pushNumbered({
        item: "Ship's side tally fee",
        details: '',
        amount: tallyFeeAmount,
      })
    }

    pushNumbered({ item: 'Clearance fees', details: '(outward clearance)', amount: clearanceFees })
    pushNumbered({
      item: 'Garbage removal fee',
      details: `USD ${garbageUsdRate}/cbm/2 days/time`,
      add: garbageCbmAddText,
      amount: garbageRemoval,
    })

    const visibleRows = reindexNumberedRows(defaultRows.filter(shouldIncludeFeeRow))

    const totalNumeric = visibleRows.reduce((sum, row) => {
      const n = toNumber(row.amount)
      return n === null ? sum : sum + n
    }, 0)

    const html = visibleRows.map(renderRow).join('\n')

    return { html, total: totalNumeric ? formatAmount(totalNumeric) : undefined }
  }

  const totalNumeric = customRows.reduce((sum, row) => {
    const n = toNumber(row.amount)
    return n === null ? sum : sum + n
  }, 0)

  const html = customRows.map(renderRow).join('\n')

  return { html, total: totalNumeric ? formatAmount(totalNumeric) : undefined }
}

const buildBBRows = (
  rows: QuoteRow[],
  grt?: string | number,
  cargoQtyMt?: string | number,
  cargoName?: string,
  cargoType?: string,
  transportLs?: string | number,
  boatHire?: string | number,
  agencyFeeMode?: string,
  agencyDiscountPercent?: string | number,
  agencyLumpsumAmount?: string | number,
  params?: EpdaParameterValues,
): { html: string; total?: string } => {
  const customRows = normalizeCustomRows(rows)
  const P = params ?? defaultParameterValues('HCM')

  const formatUsd = (value?: number) =>
    value === undefined
      ? ''
      : `USD ${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

  const formatPercent = (value: number) =>
    value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

  const pickCargoFee = (value?: string) => {
    // Agency fee on cargo comes solely from the per-cargo-type rates configured on
    // the Parameter screen. Map both the cargo type and the configured rate code to
    // the 3 canonical codes (IN_BULK / IN_EQUIPMENT / IN_BAG_PACK) so legacy variants
    // (e.g. "BULK", "EQUIPMENT", "IN BAGS") still match their rate in the PDF.
    const code = legacyCargoTypeToCode(value)
    if (!code) return undefined
    return (P.cargoAgencyRates ?? []).find((r) => legacyCargoTypeToCode(r.code) === code)?.rate
  }

  const renderRow = (row: QuoteRow, index: number) => {
    const itemHtml = row.item ? `<span class="bold">${escapeHtml(row.item)}</span>` : ''
    const detailsHtml = row.details ? escapeHtml(row.details) : ''
    const detailText = [itemHtml, detailsHtml].filter(Boolean).join(itemHtml && detailsHtml ? ': ' : '')
    return `
      <tr>
        <td class="bb-no">${index + 1}</td>
        <td class="bb-details"><span class="bold">${detailText}</span></td>
        <td class="bb-amount">${formatAmount(row.amount)}</td>
      </tr>`
  }

  
  const cargoRate = pickCargoFee(cargoType || cargoName)
  const cargoQty = toNumber(cargoQtyMt)
  const cargoBaseAmount = cargoRate !== undefined && cargoQty !== null ? cargoRate * cargoQty : undefined
  const agencyDiscountNumeric = toNumber(agencyDiscountPercent)
  const normalizedAgencyDiscount =
    agencyDiscountNumeric === null ? 0 : Math.min(100, Math.max(0, agencyDiscountNumeric))
  const agencyDiscountFactor = (100 - normalizedAgencyDiscount) / 100
  const subAgencyPercent = 100 - normalizedAgencyDiscount
  const subAgencyText =
    normalizedAgencyDiscount === 0 ? '' : `${formatPercent(subAgencyPercent)}%(sub-agency)`
  const cargoAmount = cargoBaseAmount === undefined ? undefined : cargoBaseAmount * agencyDiscountFactor

  const transportLsAmount = toNumber(transportLs)
  const boatHireAmount = toNumber(boatHire)
  const agencyLumpsumNumeric = toNumber(agencyLumpsumAmount)
  const isAgencyInLumpsumMode = normalizeAgencyFeeMode(agencyFeeMode) === 'AGENCY_IN_LUMPSUM'

  if (isAgencyInLumpsumMode) {
    const lumpsumAmount = agencyLumpsumNumeric ?? 0
    const lumpsumRow: QuoteRow = {
      details: `USD ${lumpsumAmount.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })} in LUMPSUM including transportation`,
      amount: lumpsumAmount,
    }

    return {
      html: [lumpsumRow].map(renderRow).join('\n'),
      total: formatAmount(lumpsumAmount),
    }
  }

  const grtNumeric = toNumber(grt)
  const agencyFee = resolveGrtTier(grtNumeric, P.agencyFeeTiers) ?? { amount: undefined as number | undefined, label: '' }
  const agencyFeeAmount = agencyFee.amount === undefined ? undefined : agencyFee.amount * agencyDiscountFactor
  const detailParts = [] as string[]
  if (agencyFee.label) detailParts.push(`On GRT: ${agencyFee.label}`)
  const agencyAmountText = agencyFee.amount === undefined
    ? ''
    : `${formatUsd(agencyFee.amount)}${subAgencyText ? ` x ${subAgencyText}` : ''}`
  if (agencyAmountText) detailParts.push(agencyAmountText)
  const detail = detailParts.join(': ')

  const cargoRateText = cargoRate !== undefined ? `USD${cargoRate.toFixed(2)}/mt` : ''
  const cargoQtyText = cargoQty !== null ? `${cargoQty.toLocaleString('en-US')}mts` : ''
  const isEquipmentCargoForAgency = normalizeCargoType(cargoType || cargoName).includes('EQUIPMENT')
  const cargoBasisText = [cargoRateText, cargoQtyText].filter(Boolean).join(' x ')
  const cargoSubAgencyText = cargoBasisText && subAgencyText ? ` x ${subAgencyText}` : ''
  const cargoDetail = isEquipmentCargoForAgency
    ? `${cargoBasisText ? `Equipment: ${cargoBasisText}` : ''}${cargoSubAgencyText}`
    : `${cargoBasisText ? `On cargo: ${cargoBasisText}` : ''}${cargoSubAgencyText}`

  if (!customRows.length) {
    const autoRows: QuoteRow[] = []

    if (agencyFeeAmount !== undefined || detail) {
      autoRows.push({
        details: detail,
        amount: agencyFeeAmount,
      })
    }

    if (cargoRateText || cargoQtyText) {
      autoRows.push({
        details: cargoDetail,
        amount: cargoAmount,
      })
    }

    if (transportLsAmount !== null && transportLsAmount > 0) {
      autoRows.push({
        item: 'Taxi/Courrier/Communication for agency service',
        details: '',
        amount: transportLsAmount,
      })
    }

    if (boatHireAmount !== null && boatHireAmount > 0) {
      autoRows.push({
        item: 'Boat-hire for agency service',
        details: '',
        amount: boatHireAmount,
      })
    }

    const totalNumeric = autoRows.reduce((sum, row) => {
      const n = toNumber(row.amount)
      return n === null ? sum : sum + n
    }, 0)

    return { html: autoRows.map(renderRow).join('\n'), total: totalNumeric ? formatAmount(totalNumeric) : undefined }
  }

  const adjustedRows = customRows.map((row) => {
    const isCargoFee = (row.item || '').toLowerCase().includes('agency fee on cargo')
    const isGrtFee = (row.item || '').toLowerCase().includes('agency fee on grt')
    const isTransportLs = (row.item || '').toLowerCase().includes('transport')
    const isBoatHire = (row.item || '').toLowerCase().includes('boat-hire for agency service')
    if (isCargoFee && (row.amount === undefined || row.amount === '')) {
      return { ...row, details: cargoDetail || row.details, amount: cargoAmount ?? row.amount }
    }
    if (isGrtFee && (row.amount === undefined || row.amount === '')) {
      return {
        ...row,
        details: row.details || detail,
        amount: agencyFeeAmount ?? row.amount,
      }
    }
    if (isGrtFee && (row.details === undefined || row.details === '')) {
      return { ...row, details: detail || row.details }
    }
    if (isTransportLs && (row.amount === undefined || row.amount === '') && transportLsAmount !== null && transportLsAmount > 0) {
      return { ...row, amount: transportLsAmount }
    }
    if (isBoatHire && (row.amount === undefined || row.amount === '') && boatHireAmount !== null && boatHireAmount > 0) {
      return { ...row, amount: boatHireAmount }
    }
    return row
  })

  const finalRows = adjustedRows
    .filter(isMeaningfulQuoteRow)
    .filter(shouldIncludeFeeRow)
    .map((row, index) => ({ ...row, no: index + 1 }))

  const totalNumeric = finalRows.reduce((sum, row) => {
    const n = toNumber(row.amount)
    return n === null ? sum : sum + n
  }, 0)

  return { html: finalRows.map(renderRow).join('\n'), total: totalNumeric ? formatAmount(totalNumeric) : undefined }
}

export const renderQuoteHtml = (template: string, data: QuoteData) => {
  const normalizedData = normalizeInvoiceNumericFields(data)
  const params = data.params ?? defaultParameterValues('HCM')

  const aa = buildAARows(normalizedData.AA_ROWS || [], normalizedData.grt, {
    berthHours: normalizedData.berth_hours,
    buoyDueHours: normalizedData.buoy_due_hours,
    anchorageHours: normalizedData.anchorage_hours,
    frtTaxType: normalizedData.loading_term,
    purposeOfCalling: normalizedData.purpose_of_calling,
    shipType: normalizedData.ship_type,
    transportQuarantine: normalizedData.transport_quarantine,
    tallyFee: normalizedData.tally_fee,
    tugAssistanceOverride: normalizedData.tug_assistance,
    cargoType: normalizedData.cargo_type,
    loa: normalizedData.loa,
    mooringLocation: (normalizedData.at_anchorage || '').trim() ? 'anchorage' : 'berth',
    pilotageThirdMiles: normalizedData.pilotage_third_miles,
    cargoQtyMt: normalizedData.cargo_qty_mt,
    quarantineCargoTrips: normalizedData.quarantine_cargo_trips,
    oceanFrtRateUsdPerMt: normalizedData.ocean_frt_rate_usd_per_mt,
    garbageUsdRate: normalizedData.garbage_usd_rate,
    garbageCbmAmount: normalizedData.garbage_cbm_amount,
    params,
  })

  const bb = buildBBRows(
    normalizedData.BB_ROWS || [],
    normalizedData.grt,
    normalizedData.cargo_qty_mt,
    normalizedData.cargo_name_upper,
    normalizedData.cargo_type,
    normalizedData.transport_ls,
    normalizedData.boat_hire_entry,
    normalizedData.agency_fee_mode,
    normalizedData.agency_discount_percent,
    normalizedData.agency_lumpsum_amount,
    params,
  )

  const totalAValue = escapeHtml(normalizedData.total_a || aa.total)
  const totalBValue = escapeHtml(normalizedData.total_b || bb.total)
  const totalANum = toNumber(normalizedData.total_a || aa.total)
  const totalBNum = toNumber(normalizedData.total_b || bb.total)
  const grandNumeric =
    totalANum !== null && totalBNum !== null ? totalANum + totalBNum : totalANum !== null ? totalANum : totalBNum
  const grandTotal = normalizedData.grand_total || (grandNumeric ? formatAmount(grandNumeric) : undefined)

  const replacements: Record<string, string> = {
    to_shipowner: escapeHtml(normalizedData.to_shipowner),
    date: escapeHtml(normalizedData.date),
    fm_department: 'SEATRANS - SHIPPING AGENCY',
    ref: escapeHtml(normalizedData.ref),
    mv: escapeHtml(normalizedData.mv),
    dwt: escapeHtml(normalizedData.dwt),
    grt: escapeHtml(normalizedData.grt),
    loa: escapeHtml(formatLoaDisplay(normalizedData.loa)),
    eta: escapeHtml(normalizedData.eta || 'TBN'),
    cargo_qty_mt: escapeHtml(normalizedData.cargo_qty_mt),
    cargo_name_upper: escapeHtml(formatCargoNameWithType(normalizedData.cargo_name_upper, normalizedData.cargo_type)),
    cargo_type: escapeHtml(normalizedData.cargo_type),
    port_upper: escapeHtml(normalizedData.port_upper),
    loading_term: escapeHtml(normalizedData.loading_term),
    at_anchorage: escapeHtml(normalizedData.at_anchorage),
    at_berth: escapeHtml(normalizedData.at_berth),
    total_a: totalAValue,
    total_b: totalBValue,
    grand_total: escapeHtml(grandTotal),
    bank_name: escapeHtml(normalizedData.bank_name),
    bank_address: escapeHtml(normalizedData.bank_address),
    beneficiary: escapeHtml(normalizedData.beneficiary),
    usd_account: escapeHtml(normalizedData.usd_account),
    swift: escapeHtml(normalizedData.swift),
    AA_ROWS: aa.html,
    BB_ROWS: bb.html,
  }

  return template.replace(/{{\s*([A-Za-z0-9_]+)\s*}}/g, (match, key) => {
    const value = replacements[key]
    return value === undefined ? '—' : value
  })
}

interface QuotePreviewProps {
  html: string
  className?: string
}

export function QuotePreview({ html, className }: QuotePreviewProps) {
  return (
    <iframe
      srcDoc={html}
      className={`w-full h-full rounded-lg border bg-white ${className || ''}`}
      title="Quote preview"
    />
  )
}
