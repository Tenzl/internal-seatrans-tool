import { useCallback, useMemo, useReducer } from 'react'
import type { CargoType } from '@/modules/gallery/services/commodityService'
import { getDefaultGarbageUsdRate } from '@/modules/inquiries/components/common/garbageFeeDefaults'
import { getEpdaVariantConfig } from '@/modules/inquiries/components/common/quoteForm'
import type { InvoiceVariantFormValues } from '@/features/admin/components/invoice/CreateInvoiceVariantForm'
import {
  DEFAULT_ANCHORAGE_HOURS,
  DEFAULT_BERTH_HOURS,
  DEFAULT_PILOTAGE_THIRD_MILES,
  DEFAULT_QN_PILOTAGE_MILES,
  DEFAULT_SHIPOWNER_NATIONALITY,
  DEFAULT_TUG_ASSISTANCE_TRIPS,
} from '@/features/admin/components/invoice/epdaFormParameters'
import type { EpdaQuoteForm } from './epdaPreviewRules'

export type EpdaEditorFormFields = InvoiceVariantFormValues & {
  formCreatedDate: string
  port: string
}

type FormPatch = Partial<EpdaEditorFormFields>

const today = () => new Date().toISOString().split('T')[0]

export function createInitialEpdaEditorFormFields(): EpdaEditorFormFields {
  return {
    formCreatedDate: today(),
    toShipowner: '',
    shipownerNationality: DEFAULT_SHIPOWNER_NATIONALITY,
    eta: '',
    mv: '',
    dischargeLoadingLocation: '',
    dwt: '',
    grt: '',
    loa: '',
    cargoQty: '',
    cargoType: '',
    cargoName: '',
    shipType: 'BULK_SHIP',
    berthHours: DEFAULT_BERTH_HOURS,
    anchorageHours: DEFAULT_ANCHORAGE_HOURS,
    qnPilotageMiles: DEFAULT_QN_PILOTAGE_MILES,
    pilotageThirdMiles: DEFAULT_PILOTAGE_THIRD_MILES,
    garbageUsdRate: getDefaultGarbageUsdRate('HCM'),
    purposeOfCalling: '',
    quarantineCargoMode: 'ONE_LEG',
    frtTaxType: '',
    tallyFeeAmount: '',
    tugAssistanceAmount: '',
    tugAssistanceTrips: DEFAULT_TUG_ASSISTANCE_TRIPS,
    otherExpenseType: '',
    shorecraneHireUsdPerMt: '',
    oceanFrtRateUsdPerMt: '',
    transportLs: '',
    port: '',
    boatHireAmount: '',
    boatHireQuarantineAmount: '',
    agencyFeeMode: 'TARRIF_AGENCY',
    agencyDiscountPercent: '',
    agencyLumpsumAmount: '',
    agencyOtherExpenses: [],
  }
}

export function createResetEpdaEditorFormFields(
  quoteForm: EpdaQuoteForm
): EpdaEditorFormFields {
  const miles = String(getEpdaVariantConfig(quoteForm).defaultPilotageMiles)
  return {
    ...createInitialEpdaEditorFormFields(),
    garbageUsdRate: getDefaultGarbageUsdRate(quoteForm),
    berthHours: '96',
    anchorageHours: '24',
    pilotageThirdMiles: miles,
    qnPilotageMiles: miles,
  }
}

function formReducer(
  state: EpdaEditorFormFields,
  patch: FormPatch
): EpdaEditorFormFields {
  return { ...state, ...patch }
}

export function useEpdaEditorFormState() {
  const [fields, patchFields] = useReducer(
    formReducer,
    undefined,
    createInitialEpdaEditorFormFields
  )

  const setField = useCallback(
    <Key extends keyof EpdaEditorFormFields>(
      field: Key,
      value: EpdaEditorFormFields[Key]
    ) => {
      patchFields({ [field]: value } as FormPatch)
    },
    []
  )

  const setters = useMemo(
    () => ({
      setFormCreatedDate: (value: string) => setField('formCreatedDate', value),
      setToShipowner: (value: string) => setField('toShipowner', value),
      setShipownerNationality: (
        value: InvoiceVariantFormValues['shipownerNationality']
      ) => setField('shipownerNationality', value),
      setEta: (value: string) => setField('eta', value),
      setMv: (value: string) => setField('mv', value),
      setDischargeLoadingLocation: (value: string) =>
        setField('dischargeLoadingLocation', value),
      setDwt: (value: string) => setField('dwt', value),
      setGrt: (value: string) => setField('grt', value),
      setLoa: (value: string) => setField('loa', value),
      setCargoQty: (value: string) => setField('cargoQty', value),
      setCargoType: (value: CargoType) => setField('cargoType', value),
      setCargoName: (value: string) => setField('cargoName', value),
      setShipType: (value: InvoiceVariantFormValues['shipType']) =>
        setField('shipType', value),
      setBerthHours: (value: string) => setField('berthHours', value),
      setAnchorageHours: (value: string) => setField('anchorageHours', value),
      setQnPilotageMiles: (value: string) => setField('qnPilotageMiles', value),
      setPilotageThirdMiles: (value: string) =>
        setField('pilotageThirdMiles', value),
      setGarbageUsdRate: (value: string) => setField('garbageUsdRate', value),
      setPurposeOfCalling: (
        value: InvoiceVariantFormValues['purposeOfCalling']
      ) => setField('purposeOfCalling', value),
      setQuarantineCargoMode: (
        value: InvoiceVariantFormValues['quarantineCargoMode']
      ) => setField('quarantineCargoMode', value),
      setFrtTaxType: (value: InvoiceVariantFormValues['frtTaxType']) =>
        setField('frtTaxType', value),
      setTallyFeeAmount: (value: string) => setField('tallyFeeAmount', value),
      setTugAssistanceAmount: (value: string) =>
        setField('tugAssistanceAmount', value),
      setTugAssistanceTrips: (
        value: InvoiceVariantFormValues['tugAssistanceTrips']
      ) => setField('tugAssistanceTrips', value),
      setOtherExpenseType: (
        value: InvoiceVariantFormValues['otherExpenseType']
      ) => setField('otherExpenseType', value),
      setShorecraneHireUsdPerMt: (value: string) =>
        setField('shorecraneHireUsdPerMt', value),
      setOceanFrtRateUsdPerMt: (value: string) =>
        setField('oceanFrtRateUsdPerMt', value),
      setTransportLs: (value: string) => setField('transportLs', value),
      setPort: (value: string) => setField('port', value),
      setBoatHireAmount: (value: string) => setField('boatHireAmount', value),
      setBoatHireQuarantineAmount: (value: string) =>
        setField('boatHireQuarantineAmount', value),
      setAgencyFeeMode: (value: InvoiceVariantFormValues['agencyFeeMode']) =>
        setField('agencyFeeMode', value),
      setAgencyDiscountPercent: (value: string) =>
        setField('agencyDiscountPercent', value),
      setAgencyLumpsumAmount: (value: string) =>
        setField('agencyLumpsumAmount', value),
      setAgencyOtherExpenses: (
        value: InvoiceVariantFormValues['agencyOtherExpenses']
      ) => setField('agencyOtherExpenses', value),
    }),
    [setField]
  )

  const normalizedSetters = useMemo(
    () => ({
      ...setters,
      setShipownerNationality: (value: string) =>
        setField(
          'shipownerNationality',
          value === 'VIETNAMESE' ? 'VIETNAMESE' : 'OVERSEAS'
        ),
      setCargoType: (value: string) =>
        setField('cargoType', value as CargoType),
      setShipType: (value: string) =>
        setField('shipType', value as InvoiceVariantFormValues['shipType']),
      setPurposeOfCalling: (value: string) =>
        setField(
          'purposeOfCalling',
          value as InvoiceVariantFormValues['purposeOfCalling']
        ),
      setFrtTaxType: (value: string) =>
        setField('frtTaxType', value as InvoiceVariantFormValues['frtTaxType']),
      setQuarantineCargoMode: (value: string) =>
        setField(
          'quarantineCargoMode',
          value as InvoiceVariantFormValues['quarantineCargoMode']
        ),
      setAgencyFeeMode: (value: string) =>
        setField(
          'agencyFeeMode',
          value as InvoiceVariantFormValues['agencyFeeMode']
        ),
      setTugAssistanceTrips: (value: string) =>
        setField('tugAssistanceTrips', value === '1' ? '1' : '2'),
      setOtherExpenseType: (value: string) =>
        setField(
          'otherExpenseType',
          value === 'SHORECRANE_HIRE' ? 'SHORECRANE_HIRE' : ''
        ),
    }),
    [setField, setters]
  )

  const reset = useCallback((quoteForm: EpdaQuoteForm) => {
    patchFields(createResetEpdaEditorFormFields(quoteForm))
  }, [])

  return {
    fields,
    setField,
    setters: normalizedSetters,
    reset,
  }
}
