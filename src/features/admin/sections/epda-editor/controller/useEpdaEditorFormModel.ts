import { useCallback, useMemo } from 'react'
import type { Commodity } from '@/modules/gallery/services/commodityService'
import type { EpdaCargoTypeOption } from '@/modules/gallery/shippingAgencyCargoCatalog'
import type { BuildInvoiceQuoteDataParams } from '@/modules/inquiries/components/common/buildInvoiceQuoteData'
import { getDefaultGarbageUsdRate } from '@/modules/inquiries/components/common/garbageFeeDefaults'
import { isHcmWorksheet } from '@/modules/inquiries/components/common/quoteForm'
import type { EpdaParameterValues } from '@/modules/inquiries/services/epdaParametersService'
import { parseFiniteNumber } from '@/shared/utils/parseNumber'
import type {
  InvoiceVariantFormComputed,
  InvoiceVariantFormHandlers,
  InvoiceVariantFormOptions,
  InvoiceVariantFormValues,
} from '@/features/admin/components/invoice/CreateInvoiceVariantForm'
import {
  canEnableFreightTaxByPurpose,
  formatUsdAmount,
  getShipQuarantineTrips,
  hasCargoQuarantineFee,
  isExportPlsAdviseMode,
  isExportTotalAmountMode,
  isImportFrtTaxType,
  isLoaAtOrAboveTugMaximum,
  isTallyFeeEligibleCargo,
} from '@/features/admin/components/invoice/epda/epdaBusinessRules'
import { QUARANTINE_CARGO_OPTIONS } from '@/features/admin/components/invoice/epdaFormParameters'
import {
  buildRequiredFields,
  getMissingRequiredFields,
  getRequiredFieldState,
} from '@/features/admin/components/invoice/invoiceValidation'
import { EPDA_STATIC_FORM_OPTIONS } from './epdaEditorOptions'
import type { EpdaQuoteForm } from './epdaPreviewRules'
import {
  resolveEpdaCatalogIds,
  resolveEpdaCargoTypeSelection,
} from './epdaReferenceDataRules'
import type {
  EpdaEditorFormFields,
  useEpdaEditorFormState,
} from './useEpdaEditorFormState'

type EpdaFormSetters = ReturnType<typeof useEpdaEditorFormState>['setters']

type UseEpdaEditorFormModelOptions = {
  fields: EpdaEditorFormFields
  setters: EpdaFormSetters
  showValidationErrors: boolean
  quoteForm: EpdaQuoteForm
  effectiveParams: EpdaParameterValues
  selectedPortId: number | null
  cargoTypeOptions: EpdaCargoTypeOption[]
  filteredCargoNames: Commodity[]
  cargoNameDisabled: boolean
  isLoadingCargoCatalog: boolean
}

export function useEpdaEditorFormModel({
  fields,
  setters,
  showValidationErrors,
  quoteForm,
  effectiveParams,
  selectedPortId,
  cargoTypeOptions,
  filteredCargoNames,
  cargoNameDisabled,
  isLoadingCargoCatalog,
}: UseEpdaEditorFormModelOptions) {
  const canEnableFreightTaxDeclaration = useMemo(
    () => canEnableFreightTaxByPurpose(fields.purposeOfCalling),
    [fields.purposeOfCalling]
  )
  const isLoaOverTugMax = useMemo(
    () => isLoaAtOrAboveTugMaximum(fields.loa, effectiveParams),
    [fields.loa, effectiveParams]
  )

  const requiredFields = useMemo(
    () =>
      buildRequiredFields(fields, {
        requireFrtTaxType: canEnableFreightTaxDeclaration,
        requireCargoName: !cargoNameDisabled,
      }),
    [fields, cargoNameDisabled, canEnableFreightTaxDeclaration]
  )
  const missingRequiredFields = useMemo(
    () => getMissingRequiredFields(requiredFields),
    [requiredFields]
  )

  const shipQuarantineFee = useMemo(() => {
    const grt = parseFiniteNumber(fields.grt)
    const trips = getShipQuarantineTrips(fields.purposeOfCalling)
    if (!grt || trips <= 0) return 0
    const quarantine = effectiveParams.quarantine
    const unitRate =
      grt >= quarantine.shipThresholdGrt
        ? quarantine.shipUnitHighGrt
        : quarantine.shipUnitLowGrt
    return unitRate * trips
  }, [fields.grt, fields.purposeOfCalling, effectiveParams])

  const cargoQuarantineFee = useMemo(() => {
    if (!hasCargoQuarantineFee(fields.purposeOfCalling)) return 0
    const cargoQuantity = parseFiniteNumber(fields.cargoQty)
    if (!cargoQuantity || cargoQuantity <= 0) return 0
    const trips =
      QUARANTINE_CARGO_OPTIONS.find(
        (option) => option.value === fields.quarantineCargoMode
      )?.trips ?? 1
    return effectiveParams.quarantine.cargoPerTrip * trips
  }, [
    fields.cargoQty,
    fields.purposeOfCalling,
    fields.quarantineCargoMode,
    effectiveParams,
  ])

  const buildQuoteInput = useCallback(
    (): BuildInvoiceQuoteDataParams & {
      commodityTypeId?: number
      commodityId?: number
    } => ({
      quoteForm,
      formCreatedDate: fields.formCreatedDate,
      toShipowner: fields.toShipowner,
      shipownerNationality: fields.shipownerNationality,
      mv: fields.mv,
      dwt: fields.dwt,
      grt: fields.grt,
      loa: fields.loa,
      eta: fields.eta,
      cargoQty: fields.cargoQty,
      cargoName: cargoNameDisabled ? '' : fields.cargoName,
      cargoType: fields.cargoType,
      ...resolveEpdaCatalogIds(
        fields.commodityTypeId,
        filteredCargoNames,
        fields.cargoName
      ),
      filteredCargoNames,
      shipType: fields.shipType,
      portId: selectedPortId,
      port: fields.port,
      frtTaxType: fields.frtTaxType,
      shouldIncludeOceanFrtRate: isExportTotalAmountMode(fields.frtTaxType),
      oceanFrtRateUsdPerMt: fields.oceanFrtRateUsdPerMt,
      garbageUsdRate:
        fields.garbageUsdRate || getDefaultGarbageUsdRate(quoteForm),
      purposeOfCalling: fields.purposeOfCalling,
      dischargeLoadingLocation: fields.dischargeLoadingLocation,
      transportLs: fields.transportLs,
      boatHireQuarantineAmount: fields.boatHireQuarantineAmount,
      quarantineCargoMode: fields.quarantineCargoMode,
      quarantineCargoOptions: QUARANTINE_CARGO_OPTIONS,
      boatHireAmount: fields.boatHireAmount,
      agencyFeeMode: fields.agencyFeeMode,
      agencyDiscountPercent: fields.agencyDiscountPercent,
      agencyLumpsumAmount: fields.agencyLumpsumAmount,
      agencyOtherExpenses: fields.agencyOtherExpenses,
      isTallyFeeEligible: Boolean(
        fields.cargoType && isTallyFeeEligibleCargo(fields.cargoType)
      ),
      tallyFeeAmount: fields.tallyFeeAmount,
      isLoaOverTugMax,
      tugAssistanceAmount: fields.tugAssistanceAmount,
      tugAssistanceTrips: fields.tugAssistanceTrips,
      otherExpenseType: fields.otherExpenseType,
      shorecraneHireUsdPerMt: fields.shorecraneHireUsdPerMt,
      berthHours: fields.berthHours,
      buoyDueHours:
        isHcmWorksheet(quoteForm) &&
        fields.dischargeLoadingLocation === 'Anchorage'
          ? fields.berthHours
          : '',
      anchorageHours: fields.anchorageHours,
      qnPilotageMiles: fields.qnPilotageMiles,
      pilotageThirdMiles: fields.pilotageThirdMiles,
      params: effectiveParams,
    }),
    [
      quoteForm,
      fields,
      cargoNameDisabled,
      filteredCargoNames,
      selectedPortId,
      isLoaOverTugMax,
      effectiveParams,
    ]
  )

  const formValues = useMemo<InvoiceVariantFormValues>(
    () => ({
      toShipowner: fields.toShipowner,
      shipownerNationality: fields.shipownerNationality,
      eta: fields.eta,
      mv: fields.mv,
      dischargeLoadingLocation: fields.dischargeLoadingLocation,
      dwt: fields.dwt,
      grt: fields.grt,
      loa: fields.loa,
      cargoQty: fields.cargoQty,
      commodityTypeId: fields.commodityTypeId,
      cargoType: fields.cargoType,
      cargoName: fields.cargoName,
      shipType: fields.shipType,
      berthHours: fields.berthHours,
      anchorageHours: fields.anchorageHours,
      qnPilotageMiles: fields.qnPilotageMiles,
      pilotageThirdMiles: fields.pilotageThirdMiles,
      garbageUsdRate:
        fields.garbageUsdRate || getDefaultGarbageUsdRate(quoteForm),
      purposeOfCalling: fields.purposeOfCalling,
      quarantineCargoMode: fields.quarantineCargoMode,
      frtTaxType: fields.frtTaxType,
      tallyFeeAmount: fields.tallyFeeAmount,
      tugAssistanceAmount: fields.tugAssistanceAmount,
      tugAssistanceTrips: fields.tugAssistanceTrips,
      otherExpenseType: fields.otherExpenseType,
      shorecraneHireUsdPerMt: fields.shorecraneHireUsdPerMt,
      oceanFrtRateUsdPerMt: fields.oceanFrtRateUsdPerMt,
      transportLs: fields.transportLs,
      boatHireAmount: fields.boatHireAmount,
      boatHireQuarantineAmount: fields.boatHireQuarantineAmount,
      agencyFeeMode: fields.agencyFeeMode,
      agencyDiscountPercent: fields.agencyDiscountPercent,
      agencyLumpsumAmount: fields.agencyLumpsumAmount,
      agencyOtherExpenses: fields.agencyOtherExpenses,
    }),
    [fields, quoteForm]
  )

  const formHandlers = useMemo<InvoiceVariantFormHandlers>(
    () => ({
      ...setters,
      setDischargeLoadingLocation: (value) => {
        // Area 2 (QN) has berth only — no buoy / anchorage discharge location.
        const nextLocation =
          !isHcmWorksheet(quoteForm) && value === 'Anchorage' ? 'Berth' : value
        setters.setDischargeLoadingLocation(nextLocation)
        const garbageRate =
          isHcmWorksheet(quoteForm) && nextLocation === 'Anchorage'
            ? effectiveParams.garbage.atBuoyUsd
            : effectiveParams.garbage.atBerthUsd
        setters.setGarbageUsdRate(String(garbageRate))
        if (nextLocation !== 'Anchorage') setters.setBoatHireAmount('')
      },
      setLoa: (value) => {
        setters.setLoa(value)
        if (!isLoaAtOrAboveTugMaximum(value, effectiveParams)) {
          setters.setTugAssistanceAmount('')
        }
      },
      setCargoType: (selectionValue: string) => {
        const selected = resolveEpdaCargoTypeSelection(
          cargoTypeOptions,
          selectionValue
        )
        if (!selected) return
        setters.setCommodityTypeId(selected.commodityTypeId)
        setters.setCargoType(selected.cargoType)
        if (!isTallyFeeEligibleCargo(selected.tallyEligibilityKey)) {
          setters.setTallyFeeAmount('')
        }
      },
      setPurposeOfCalling: (value) => {
        setters.setPurposeOfCalling(value)
        if (!canEnableFreightTaxByPurpose(value)) {
          setters.setFrtTaxType('')
          setters.setOceanFrtRateUsdPerMt('')
        }
      },
      setFrtTaxType: (value) => {
        setters.setFrtTaxType(value)
        if (
          !value ||
          isImportFrtTaxType(value) ||
          isExportPlsAdviseMode(value)
        ) {
          setters.setOceanFrtRateUsdPerMt('')
        }
      },
      setAgencyFeeMode: (value) => {
        setters.setAgencyFeeMode(value)
        if (value === 'AGENCY_IN_LUMPSUM') {
          setters.setTransportLs('')
          setters.setBoatHireAmount('')
        } else {
          setters.setAgencyLumpsumAmount('')
          setters.setAgencyOtherExpenses([])
        }
      },
      addAgencyOtherExpense: () => {
        const id =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `agency-other-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        setters.setAgencyOtherExpenses([
          ...fields.agencyOtherExpenses,
          { id, name: '', amount: '' },
        ])
      },
      updateAgencyOtherExpense: (id, patch) => {
        setters.setAgencyOtherExpenses(
          fields.agencyOtherExpenses.map((row) =>
            row.id === id ? { ...row, ...patch } : row
          )
        )
      },
      removeAgencyOtherExpense: (id) => {
        setters.setAgencyOtherExpenses(
          fields.agencyOtherExpenses.filter((row) => row.id !== id)
        )
      },
    }),
    [
      setters,
      effectiveParams,
      fields.agencyOtherExpenses,
      quoteForm,
      cargoTypeOptions,
    ]
  )

  const formOptions = useMemo<InvoiceVariantFormOptions>(
    () => ({
      ...EPDA_STATIC_FORM_OPTIONS,
      cargoTypeOptions,
      filteredCargoNames,
    }),
    [cargoTypeOptions, filteredCargoNames]
  )

  const formComputed = useMemo<InvoiceVariantFormComputed>(
    () => ({
      isLoadingCargoCatalog,
      cargoNameDisabled,
      isTallyFeeEligibleCargo: Boolean(
        fields.cargoType && isTallyFeeEligibleCargo(fields.cargoType)
      ),
      isLoaOverTugMax,
      shipQuarantineFee: formatUsdAmount(shipQuarantineFee),
      cargoQuarantineFee: formatUsdAmount(cargoQuarantineFee),
      isImportFrtTaxType: isImportFrtTaxType(fields.frtTaxType),
      isExportPlsAdviseMode: isExportPlsAdviseMode(fields.frtTaxType),
      canEnableFreightTaxDeclaration,
      isOceanFreightInputDisabled:
        !canEnableFreightTaxDeclaration ||
        isExportPlsAdviseMode(fields.frtTaxType) ||
        isImportFrtTaxType(fields.frtTaxType),
      frtHint: !canEnableFreightTaxDeclaration
        ? 'N/A'
        : isImportFrtTaxType(fields.frtTaxType)
          ? '0'
          : isExportPlsAdviseMode(fields.frtTaxType)
            ? 'pls advise'
            : `Frt USD${fields.oceanFrtRateUsdPerMt || '16'}/mt x abt ${fields.cargoQty || '0'}mts x 2%`,
    }),
    [
      isLoadingCargoCatalog,
      cargoNameDisabled,
      fields,
      isLoaOverTugMax,
      shipQuarantineFee,
      cargoQuarantineFee,
      canEnableFreightTaxDeclaration,
    ]
  )

  const getRequiredState = useCallback(
    (value: string | null | undefined) =>
      getRequiredFieldState(value, showValidationErrors),
    [showValidationErrors]
  )

  return {
    buildQuoteInput,
    requiredFields,
    missingRequiredFields,
    formValues,
    formHandlers,
    formOptions,
    formComputed,
    getRequiredState,
  }
}
