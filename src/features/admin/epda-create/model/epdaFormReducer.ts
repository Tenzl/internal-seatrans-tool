import {
  defaultParameterValues,
  type EpdaParameterValues,
} from '@/modules/inquiries/components/common/quoteParameters'
import {
  TARIFF_SEEDED_FIELDS,
  type EpdaAreaCode,
  type EpdaCreateState,
  type EpdaFormField,
  type EpdaFormFields,
  type TariffSeededField,
} from './epdaForm.types'
import { quoteFormFromArea } from '@/features/admin/components/invoice/epda/quoteFormFromArea'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function createInitialEpdaFields(): EpdaFormFields {
  const defaults = defaultParameterValues('HCM')
  return {
    formCreatedDate: today(),
    toShipowner: '',
    shipownerNationality: 'OVERSEAS',
    mv: '',
    dwt: '',
    grt: '',
    loa: '',
    eta: '',
    cargoQty: '',
    cargoType: '',
    cargoName: '',
    shipType: 'BULK_SHIP',
    frtTaxType: '',
    oceanFrtRateUsdPerMt: '',
    garbageUsdRate: String(defaults.garbage.atBerthUsd),
    garbageCbmAmount: String(defaults.garbage.cbmAmount),
    purposeOfCalling: '',
    dischargeLoadingLocation: '',
    transportLs: '',
    boatHireQuarantineAmount: '',
    quarantineCargoMode: 'ONE_LEG',
    boatHireAmount: '',
    agencyFeeMode: 'TARRIF_AGENCY',
    agencyDiscountPercent: '',
    agencyLumpsumAmount: '',
    tallyFeeAmount: '',
    tugAssistanceAmount: '',
    otherExpenseType: '',
    shorecraneHireUsdPerMt: '',
    berthHours: String(defaults.hours.berthHours),
    anchorageHours: String(defaults.hours.anchorageHours),
    qnPilotageMiles: String(defaults.hours.qnPilotageMiles),
    pilotageThirdMiles: String(defaults.hours.pilotageThirdMiles),
  }
}

export function createInitialEpdaState(): EpdaCreateState {
  return {
    identity: {
      areaCode: '',
      portId: null,
      portOfCall: '',
      quoteForm: 'HCM',
    },
    fields: createInitialEpdaFields(),
    dirtyFields: {},
    tariff: { status: 'idle', requestId: 0, values: null, error: null },
  }
}

function tariffSeed(
  values: EpdaParameterValues,
  location: string,
): Pick<EpdaFormFields, TariffSeededField> {
  return {
    berthHours: String(values.hours.berthHours),
    anchorageHours: String(values.hours.anchorageHours),
    pilotageThirdMiles: String(values.hours.pilotageThirdMiles),
    qnPilotageMiles: String(values.hours.qnPilotageMiles),
    garbageUsdRate: String(
      location === 'Anchorage'
        ? values.garbage.atBuoyUsd
        : values.garbage.atBerthUsd,
    ),
    garbageCbmAmount: String(values.garbage.cbmAmount),
  }
}

function seedPristineTariffFields(
  state: EpdaCreateState,
  values: EpdaParameterValues,
): EpdaFormFields {
  const seed = tariffSeed(values, state.fields.dischargeLoadingLocation)
  const fields = { ...state.fields }
  for (const field of Object.keys(seed) as TariffSeededField[]) {
    if (!state.dirtyFields[field]) fields[field] = seed[field]
  }
  return fields
}

function discardPortSpecificEdits(state: EpdaCreateState) {
  const fields = { ...state.fields }
  const dirtyFields = { ...state.dirtyFields }
  for (const field of TARIFF_SEEDED_FIELDS) {
    fields[field] = ''
    delete dirtyFields[field]
  }
  return { fields, dirtyFields }
}

export type EpdaFormAction =
  | { type: 'select-area'; areaCode: EpdaAreaCode | ''; discardTariffEdits?: boolean }
  | {
      type: 'select-port'
      areaCode: EpdaAreaCode
      portId: number
      portOfCall: string
      discardTariffEdits?: boolean
    }
  | { type: 'tariff-requested'; requestId: number }
  | {
      type: 'tariff-loaded'
      requestId: number
      values: EpdaParameterValues
    }
  | { type: 'tariff-failed'; requestId: number; error: string }
  | { type: 'change-field'; field: EpdaFormField; value: string }
  | { type: 'reset-tariff-fields' }
  | { type: 'reset-form' }
  | { type: 'hydrate'; state: EpdaCreateState }

export function epdaFormReducer(
  state: EpdaCreateState,
  action: EpdaFormAction,
): EpdaCreateState {
  switch (action.type) {
    case 'select-area': {
      const cleared = action.discardTariffEdits ? discardPortSpecificEdits(state) : {}
      return {
        ...state,
        ...cleared,
        identity: {
          areaCode: action.areaCode,
          portId: null,
          portOfCall: '',
          quoteForm: quoteFormFromArea(action.areaCode),
        },
        tariff: { status: 'idle', requestId: state.tariff.requestId, values: null, error: null },
      }
    }
    case 'select-port': {
      const cleared = action.discardTariffEdits ? discardPortSpecificEdits(state) : {}
      return {
        ...state,
        ...cleared,
        identity: {
          areaCode: action.areaCode,
          portId: action.portId,
          portOfCall: action.portOfCall,
          quoteForm: quoteFormFromArea(action.areaCode),
        },
        tariff: { status: 'idle', requestId: state.tariff.requestId, values: null, error: null },
      }
    }
    case 'tariff-requested':
      return {
        ...state,
        tariff: {
          status: 'loading',
          requestId: action.requestId,
          values: null,
          error: null,
        },
      }
    case 'tariff-loaded':
      if (action.requestId !== state.tariff.requestId) return state
      return {
        ...state,
        fields: seedPristineTariffFields(state, action.values),
        tariff: {
          status: 'ready',
          requestId: action.requestId,
          values: action.values,
          error: null,
        },
      }
    case 'tariff-failed':
      if (action.requestId !== state.tariff.requestId) return state
      return {
        ...state,
        tariff: {
          status: 'error',
          requestId: action.requestId,
          values: null,
          error: action.error,
        },
      }
    case 'change-field': {
      const fields = { ...state.fields, [action.field]: action.value }
      if (
        action.field === 'dischargeLoadingLocation' &&
        state.tariff.values &&
        !state.dirtyFields.garbageUsdRate
      ) {
        fields.garbageUsdRate = tariffSeed(
          state.tariff.values,
          action.value,
        ).garbageUsdRate
      }
      return {
        ...state,
        fields,
        dirtyFields: { ...state.dirtyFields, [action.field]: true },
      }
    }
    case 'reset-tariff-fields': {
      if (!state.tariff.values) return state
      const seed = tariffSeed(
        state.tariff.values,
        state.fields.dischargeLoadingLocation,
      )
      const dirtyFields = { ...state.dirtyFields }
      for (const field of Object.keys(seed) as TariffSeededField[]) {
        delete dirtyFields[field]
      }
      return {
        ...state,
        fields: { ...state.fields, ...seed },
        dirtyFields,
      }
    }
    case 'reset-form':
      return createInitialEpdaState()
    case 'hydrate':
      return action.state
  }
}
