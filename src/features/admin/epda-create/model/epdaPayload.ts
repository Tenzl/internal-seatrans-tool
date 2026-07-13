import type { EpdaCreateState } from './epdaForm.types'

export type EpdaPayload = Record<string, unknown>

const nullableText = (value: string): string | null => {
  const normalized = value.trim()
  return normalized ? normalized : null
}

const nullableNumber = (value: string): number | null => {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function sharedPayload(state: EpdaCreateState): EpdaPayload {
  const { fields, identity } = state
  return {
    shipownerTo: nullableText(fields.toShipowner),
    vesselName: nullableText(fields.mv),
    dwt: nullableNumber(fields.dwt),
    grt: nullableNumber(fields.grt),
    loa: nullableNumber(fields.loa),
    portId: identity.portId,
    portOfCall: nullableText(identity.portOfCall),
    quoteForm: identity.quoteForm,
    eta: nullableText(fields.eta),
    cargoType: nullableText(fields.cargoType),
    cargoName: nullableText(fields.cargoName),
    quantityTons: nullableNumber(fields.cargoQty),
    frtTaxType: nullableText(fields.frtTaxType),
    purposeOfCalling: nullableText(fields.purposeOfCalling),
    dischargeLoadingLocation: nullableText(fields.dischargeLoadingLocation),
    boatHireAmount: nullableNumber(fields.boatHireAmount),
    tallyFeeAmount: nullableNumber(fields.tallyFeeAmount),
    tugAssistanceAmount: nullableNumber(fields.tugAssistanceAmount),
    transportLs: nullableText(fields.transportLs),
    transportQuarantine: nullableText(fields.boatHireQuarantineAmount),
    epdaDocumentDate: nullableText(fields.formCreatedDate),
    shipType: nullableText(fields.shipType),
    shipownerNationality: nullableText(fields.shipownerNationality),
    berthHours: nullableNumber(fields.berthHours),
    anchorageHours: nullableNumber(fields.anchorageHours),
    pilotage3rdMiles: nullableNumber(
      identity.quoteForm === 'HCM'
        ? fields.pilotageThirdMiles
        : fields.qnPilotageMiles,
    ),
    oceanFrtRateUsdPerMt: nullableNumber(fields.oceanFrtRateUsdPerMt),
    garbageCbmAmount: nullableNumber(fields.garbageCbmAmount),
    garbageUsdRate: nullableNumber(fields.garbageUsdRate),
    quarantineCargoMode:
      fields.quarantineCargoMode === 'BOTH_LEGS'
        ? 'TWO_LEG'
        : fields.quarantineCargoMode === 'OTHER'
          ? 'THREE_LEG'
          : fields.quarantineCargoMode,
    agencyFeeMode:
      fields.agencyFeeMode === 'AGENCY_IN_LUMPSUM'
        ? 'LUMPSUM'
        : fields.agencyFeeMode,
    agencyDiscountPercent: nullableNumber(fields.agencyDiscountPercent),
    agencyLumpsumAmount: nullableNumber(fields.agencyLumpsumAmount),
    shorecraneHireUsdPerMt:
      fields.otherExpenseType === 'SHORECRANE_HIRE'
        ? nullableNumber(fields.shorecraneHireUsdPerMt)
        : null,
  }
}

export function buildPatchEpdaPayload(state: EpdaCreateState): EpdaPayload {
  return sharedPayload(state)
}

export function buildCreateEpdaPayload(
  customerUserId: number,
  state: EpdaCreateState,
): EpdaPayload {
  return Object.fromEntries(
    Object.entries({ customerUserId, ...sharedPayload(state) }).filter(
      ([, value]) => value !== null,
    ),
  )
}
