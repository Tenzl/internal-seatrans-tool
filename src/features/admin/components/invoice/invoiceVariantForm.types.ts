import type {
  CargoType,
  Commodity,
} from '@/modules/gallery/services/commodityService'
import type { EpdaCargoTypeOption } from '@/modules/gallery/shippingAgencyCargoCatalog'
import type { EpdaCustomerTrackedField } from '@/modules/inquiries/components/common/epdaCustomerFieldTracking'
import type { EpdaParameterValues } from '@/modules/inquiries/components/common/quoteParameters'
import type { EpdaSectionId } from './epdaFormLayout.config'
import type {
  OtherExpenseOption,
  ShipownerNationalityOption,
  TugAssistanceTripsOption,
} from './epdaFormParameters'

export type FormVariant = 'QN' | 'HCM' | 'HN'

export type PurposeOption =
  | 'NHAP_XUAT'
  | 'NHAP_CHUYEN_CANG'
  | 'CHUYEN_CANG_XUAT'
  | 'CHUYEN_CANG_CHUYEN_CANG'
  | 'MUC_DICH_KHAC'

export type ShipTypeOption = 'BULK_SHIP' | 'TANKER_SHIP'

export type FrtTaxTypeOption =
  'Import' | 'Export - Pls Advise' | 'Export - Freight rate declaration'

export type QuarantineCargoOption = 'ONE_LEG' | 'BOTH_LEGS' | 'OTHER'
export type AgencyFeeModeOption = 'TARRIF_AGENCY' | 'AGENCY_IN_LUMPSUM'

/** Client-side row for agency in-lumpsum "other expense" lines. */
export type AgencyOtherExpenseFormRow = {
  id: string
  name: string
  amount: string
}

export interface SelectOption {
  value: string
  label: string
}

export interface InvoiceVariantFormValues {
  toShipowner: string
  shipownerNationality: ShipownerNationalityOption
  eta: string
  mv: string
  dischargeLoadingLocation: string
  dwt: string
  grt: string
  loa: string
  cargoQty: string
  commodityTypeId: number | null
  cargoType: CargoType | ''
  cargoName: string
  shipType: ShipTypeOption
  berthHours: string
  anchorageHours: string
  qnPilotageMiles: string
  pilotageThirdMiles: string
  garbageUsdRate: string
  purposeOfCalling: PurposeOption | ''
  quarantineCargoMode: QuarantineCargoOption
  frtTaxType: FrtTaxTypeOption | ''
  tallyFeeAmount: string
  tugAssistanceAmount: string
  tugAssistanceTrips: TugAssistanceTripsOption
  otherExpenseType: OtherExpenseOption | ''
  shorecraneHireUsdPerMt: string
  oceanFrtRateUsdPerMt: string
  transportLs: string
  boatHireAmount: string
  boatHireQuarantineAmount: string
  agencyFeeMode: AgencyFeeModeOption
  agencyDiscountPercent: string
  agencyLumpsumAmount: string
  agencyOtherExpenses: AgencyOtherExpenseFormRow[]
}

export interface InvoiceVariantFormHandlers {
  setToShipowner: (value: string) => void
  setShipownerNationality: (value: ShipownerNationalityOption) => void
  setEta: (value: string) => void
  setMv: (value: string) => void
  setDischargeLoadingLocation: (value: string) => void
  setDwt: (value: string) => void
  setGrt: (value: string) => void
  setLoa: (value: string) => void
  setCargoQty: (value: string) => void
  setCargoType: (selectionValue: string) => void
  setCargoName: (value: string) => void
  setShipType: (value: ShipTypeOption) => void
  setBerthHours: (value: string) => void
  setAnchorageHours: (value: string) => void
  setQnPilotageMiles: (value: string) => void
  setPilotageThirdMiles: (value: string) => void
  setGarbageUsdRate: (value: string) => void
  setPurposeOfCalling: (value: PurposeOption) => void
  setQuarantineCargoMode: (value: QuarantineCargoOption) => void
  setFrtTaxType: (value: FrtTaxTypeOption) => void
  setTallyFeeAmount: (value: string) => void
  setTugAssistanceAmount: (value: string) => void
  setTugAssistanceTrips: (value: TugAssistanceTripsOption) => void
  setOtherExpenseType: (value: OtherExpenseOption | '') => void
  setShorecraneHireUsdPerMt: (value: string) => void
  setOceanFrtRateUsdPerMt: (value: string) => void
  setTransportLs: (value: string) => void
  setBoatHireAmount: (value: string) => void
  setBoatHireQuarantineAmount: (value: string) => void
  setAgencyFeeMode: (value: AgencyFeeModeOption) => void
  setAgencyDiscountPercent: (value: string) => void
  setAgencyLumpsumAmount: (value: string) => void
  setAgencyOtherExpenses: (value: AgencyOtherExpenseFormRow[]) => void
  addAgencyOtherExpense: () => void
  updateAgencyOtherExpense: (
    id: string,
    patch: Partial<Pick<AgencyOtherExpenseFormRow, 'name' | 'amount'>>
  ) => void
  removeAgencyOtherExpense: (id: string) => void
}

export interface InvoiceVariantFormOptions {
  cargoTypeOptions: EpdaCargoTypeOption[]
  filteredCargoNames: Commodity[]
  shipTypeOptions: SelectOption[]
  purposeOptions: SelectOption[]
  quarantineCargoOptions: SelectOption[]
  frtTaxTypeOptions: SelectOption[]
  agencyFeeModeOptions: SelectOption[]
}

export interface InvoiceVariantFormComputed {
  isLoadingCargoCatalog: boolean
  /** The chosen cargo category has no cargo-name dimension. */
  cargoNameDisabled: boolean
  isTallyFeeEligibleCargo: boolean
  /** LOA exceeds the configured tug bands, so the charge is entered manually. */
  isLoaOverTugMax: boolean
  shipQuarantineFee: string
  cargoQuarantineFee: string
  canEnableFreightTaxDeclaration: boolean
  isImportFrtTaxType: boolean
  isExportPlsAdviseMode: boolean
  isOceanFreightInputDisabled: boolean
  frtHint: string
}

export interface InvoiceVariantFormProps {
  variant: FormVariant
  values: InvoiceVariantFormValues
  handlers: InvoiceVariantFormHandlers
  options: InvoiceVariantFormOptions
  computed: InvoiceVariantFormComputed
  getRequiredState: (
    value: string | null | undefined,
    field?: EpdaCustomerTrackedField
  ) => {
    labelClass: string
    fieldClass: string
  }
  getCustomerFieldClass?: (field: EpdaCustomerTrackedField) => string
  /** Resolved parameter set for the selected area and port. */
  params?: EpdaParameterValues
  /** Rail mode renders only the active section; otherwise every section is visible. */
  activeSection?: EpdaSectionId
}

export type InvoiceVariantSectionProps = Omit<InvoiceVariantFormProps, 'params'>
