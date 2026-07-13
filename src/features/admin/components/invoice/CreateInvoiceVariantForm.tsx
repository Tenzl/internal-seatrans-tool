import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { DatePicker } from '@/shared/components/ui/date-picker'
import type { CargoType, CargoTypeCatalogItem, Commodity } from '@/modules/gallery/services/commodityService'
import { legacyCargoTypeToCode } from '@/modules/gallery/shippingAgencyCargoCatalog'
import {
  EpdaComputedSummary,
  EpdaFormSection,
  epdaFieldGridClass,
  type EpdaSectionId,
  type EpdaSummaryItem,
} from './EpdaFormLayout'
import type { EpdaCustomerTrackedField } from './epda/epdaCustomerFieldTracking'
import { mergeEpdaFieldClasses } from './epda/epdaCustomerFieldTracking'
import { DEFAULT_GARBAGE_CBM_AMOUNT } from './garbageFeeDefaults'
import {
  getAgencyFeeByGrt,
  SHIPOWNER_NATIONALITY_OPTIONS,
  OTHER_EXPENSE_OPTIONS,
  type ShipownerNationalityOption,
  type OtherExpenseOption,
} from './epdaFormParameters'
import {
  defaultParameterValues,
  type EpdaParameterValues,
} from '@/modules/inquiries/components/common/quoteParameters'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { isHcmWorksheet, usesQnPilotage } from './epda/quoteFormFromArea'

export type FormVariant = 'QN' | 'HCM' | 'HN'

export type PurposeOption =
  | 'NHAP_XUAT'
  | 'NHAP_CHUYEN_CANG'
  | 'CHUYEN_CANG_XUAT'
  | 'CHUYEN_CANG_CHUYEN_CANG'
  | 'MUC_DICH_KHAC'

export type ShipTypeOption = 'BULK_SHIP' | 'TANKER_SHIP'

export type FrtTaxTypeOption = 'Import' | 'Export - Pls Advise' | 'Export - Freight rate declaration'

export type QuarantineCargoOption = 'ONE_LEG' | 'BOTH_LEGS' | 'OTHER'
export type AgencyFeeModeOption = 'TARRIF_AGENCY' | 'AGENCY_IN_LUMPSUM'

export interface SelectOption {
  value: string
  label: string
}

export interface InvoiceVariantFormProps {
  variant: FormVariant
  values: {
    toShipowner: string
    shipownerNationality: ShipownerNationalityOption
    eta: string
    mv: string
    dischargeLoadingLocation: string
    dwt: string
    grt: string
    loa: string
    cargoQty: string
    cargoType: CargoType | ''
    cargoName: string
    shipType: ShipTypeOption
    berthHours: string
    anchorageHours: string
    qnPilotageMiles: string
    pilotageThirdMiles: string
    garbageUsdRate: string
    garbageCbmAmount: string
    purposeOfCalling: PurposeOption | ''
    quarantineCargoMode: QuarantineCargoOption
    frtTaxType: FrtTaxTypeOption | ''
    tallyFeeAmount: string
    tugAssistanceAmount: string
    otherExpenseType: OtherExpenseOption | ''
    shorecraneHireUsdPerMt: string
    oceanFrtRateUsdPerMt: string
    transportLs: string
    boatHireAmount: string
    boatHireQuarantineAmount: string
    agencyFeeMode: AgencyFeeModeOption
    agencyDiscountPercent: string
    agencyLumpsumAmount: string
  }
  handlers: {
    setToShipowner: (value: string) => void
    setShipownerNationality: (value: ShipownerNationalityOption) => void
    setEta: (value: string) => void
    setMv: (value: string) => void
    setDischargeLoadingLocation: (value: string) => void
    setDwt: (value: string) => void
    setGrt: (value: string) => void
    setLoa: (value: string) => void
    setCargoQty: (value: string) => void
    setCargoType: (value: CargoType) => void
    setCargoName: (value: string) => void
    setShipType: (value: ShipTypeOption) => void
    setBerthHours: (value: string) => void
    setAnchorageHours: (value: string) => void
    setQnPilotageMiles: (value: string) => void
    setPilotageThirdMiles: (value: string) => void
    setGarbageUsdRate: (value: string) => void
    setGarbageCbmAmount: (value: string) => void
    setPurposeOfCalling: (value: PurposeOption) => void
    setQuarantineCargoMode: (value: QuarantineCargoOption) => void
    setFrtTaxType: (value: FrtTaxTypeOption) => void
    setTallyFeeAmount: (value: string) => void
    setTugAssistanceAmount: (value: string) => void
    setOtherExpenseType: (value: OtherExpenseOption | '') => void
    setShorecraneHireUsdPerMt: (value: string) => void
    setOceanFrtRateUsdPerMt: (value: string) => void
    setTransportLs: (value: string) => void
    setBoatHireAmount: (value: string) => void
    setBoatHireQuarantineAmount: (value: string) => void
    setAgencyFeeMode: (value: AgencyFeeModeOption) => void
    setAgencyDiscountPercent: (value: string) => void
    setAgencyLumpsumAmount: (value: string) => void
  }
  options: {
    cargoTypeOptions: CargoTypeCatalogItem[]
    filteredCargoNames: Commodity[]
    shipTypeOptions: SelectOption[]
    purposeOptions: SelectOption[]
    quarantineCargoOptions: SelectOption[]
    frtTaxTypeOptions: SelectOption[]
    agencyFeeModeOptions: SelectOption[]
  }
  computed: {
    isLoadingCargoCatalog: boolean
    /** When true, the selected cargo type has no cargo name — disable the field. */
    cargoNameDisabled: boolean
    isTallyFeeEligibleCargo: boolean
    /** When true, LOA is above the highest tug band → tug charge is entered manually. */
    isLoaOverTugMax: boolean
    shipQuarantineFee: string
    cargoQuarantineFee: string
    canEnableFreightTaxDeclaration: boolean
    isImportFrtTaxType: boolean
    isExportPlsAdviseMode: boolean
    isOceanFreightInputDisabled: boolean
    frtHint: string
  }
  getRequiredState: (value: string | null | undefined) => { labelClass: string; fieldClass: string }
  getCustomerFieldClass?: (field: EpdaCustomerTrackedField) => string
  /** Resolved EPDA parameter set for the selected area/port (agency tiers + cargo rates). */
  params?: EpdaParameterValues
  /** When set, only the active section is shown (rail mode). Omit to show all sections. */
  activeSection?: EpdaSectionId
}

export function CreateInvoiceVariantForm({
  variant,
  values,
  handlers,
  options,
  computed,
  getRequiredState,
  getCustomerFieldClass,
  params,
  activeSection,
}: InvoiceVariantFormProps) {
  const { t } = useI18n()
  const resolvedParams = params ?? defaultParameterValues(variant)
  const disabledFieldTextClass = 'disabled:text-muted-foreground disabled:placeholder:text-muted-foreground'
  const customerClass = (field: EpdaCustomerTrackedField, value: string | null | undefined) =>
    mergeEpdaFieldClasses(
      getRequiredState(value).fieldClass,
      getCustomerFieldClass?.(field) ?? '',
    )
  const customerLabelClass = (field: EpdaCustomerTrackedField, value: string | null | undefined) =>
    mergeEpdaFieldClasses(
      getRequiredState(value).labelClass,
      getCustomerFieldClass?.(field) ? 'text-emerald-700 dark:text-emerald-400' : '',
    )
  const isBoatHireForAgencyEnabled = values.dischargeLoadingLocation === 'Anchorage'
  const isHcmAnchorage = isHcmWorksheet(variant) && values.dischargeLoadingLocation === 'Anchorage'
  const grtNumeric = Number(values.grt)
  const cargoQtyNumeric = Number(values.cargoQty)
  const discountNumeric = Number(values.agencyDiscountPercent)
  const agencyDiscountPercent = Number.isFinite(discountNumeric)
    ? Math.min(100, Math.max(0, discountNumeric))
    : 0
  const agencyDiscountFactor = (100 - agencyDiscountPercent) / 100
  const subAgencyPercent = agencyDiscountFactor * 100
  const subAgencyPercentDisplay = subAgencyPercent.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  const subAgencySuffix = agencyDiscountPercent === 0
    ? ''
    : ` x ${subAgencyPercentDisplay}%(sub-agency)`

  const agencyFeeByGrt = Number.isFinite(grtNumeric) && grtNumeric > 0
    ? getAgencyFeeByGrt(grtNumeric, resolvedParams.agencyFeeTiers)
    : { amount: 0, label: '0 - 1,000' }
  const cargoQtyForDisplay = Number.isFinite(cargoQtyNumeric) && cargoQtyNumeric > 0 ? cargoQtyNumeric : 0
  // Agency fee on cargo comes only from the per-cargo-type rates (Parameter screen).
  // Canonicalize both sides (same logic as the PDF) so the preview can't diverge.
  const normalizedCargoType = legacyCargoTypeToCode(values.cargoType || '')
  const onCargoRate =
    normalizedCargoType === ''
      ? 0
      : (resolvedParams.cargoAgencyRates ?? []).find(
          (r) => legacyCargoTypeToCode(r.code) === normalizedCargoType,
        )?.rate ?? 0
  const onCargoBaseAmount = onCargoRate * cargoQtyForDisplay

  const onGrtLabel = t('sum.onGrt', { label: agencyFeeByGrt.label })
  const onGrtAmountDisplay = `USD ${agencyFeeByGrt.amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}${subAgencySuffix}`
  const onCargoAmountDisplay = `USD ${onCargoBaseAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}${subAgencySuffix}`
  const onCargoLabel = t('sum.onCargo', { rate: onCargoRate.toFixed(2), qty: cargoQtyForDisplay })

  const agencySummaryItems: EpdaSummaryItem[] =
    values.agencyFeeMode === 'TARRIF_AGENCY'
      ? [
          { label: onGrtLabel, value: onGrtAmountDisplay },
          { label: onCargoLabel, value: onCargoAmountDisplay },
        ]
      : []

  return (
    <>
      <EpdaFormSection
        id="epda-general"
        activeId={activeSection}
        title={t('epda.secGeneral')}
        description={t('epda.secGeneralDesc')}
      >
        <div className={epdaFieldGridClass()}>
          <div className="grid gap-2">
            <Label htmlFor="toShipowner" className={customerLabelClass('toShipowner', values.toShipowner)}>
              {t('epda.toShipowner')}
            </Label>
            <Input
              id="toShipowner"
              value={values.toShipowner}
              onChange={(e) => handlers.setToShipowner(e.target.value)}
              placeholder={t('ph.shipowner')}
              className={customerClass('toShipowner', values.toShipowner)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="shipownerNationality">{t('epda.shipownerNationality')}</Label>
            <Select
              value={values.shipownerNationality}
              onValueChange={(value) =>
                handlers.setShipownerNationality(value as ShipownerNationalityOption)
              }
            >
              <SelectTrigger id="shipownerNationality">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHIPOWNER_NATIONALITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value === 'OVERSEAS'
                      ? t('epda.shipownerOverseas')
                      : t('epda.shipownerVietnamese')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className={epdaFieldGridClass()}>
          <div className="grid gap-2">
            <Label htmlFor="mv" className={customerLabelClass('mv', values.mv)}>
              {t('epda.mv')}
</Label>
            <Input
              id="mv"
              value={values.mv}
              onChange={(e) => handlers.setMv(e.target.value)}
              placeholder={t('ph.vessel')}
              className={customerClass('mv', values.mv)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label
              htmlFor="eta"
              className={getCustomerFieldClass?.('eta') ? 'text-emerald-700 dark:text-emerald-400' : undefined}
            >
              {t('epda.eta')}
            </Label>
            <DatePicker
              id="eta"
              value={values.eta}
              onChange={handlers.setEta}
              placeholder="TBN"
              className={getCustomerFieldClass?.('eta') ?? ''}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="shipType">{t('epda.shipType')}</Label>
            <Select value={values.shipType} onValueChange={(value) => handlers.setShipType(value as ShipTypeOption)}>
              <SelectTrigger id="shipType">
                <SelectValue placeholder={t('ph.shipType')} />
              </SelectTrigger>
              <SelectContent>
                {options.shipTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t('opt.shipType.' + option.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className={epdaFieldGridClass()}>
          <div className="grid gap-2">
            <Label htmlFor="purposeOfCalling" className={customerLabelClass('purposeOfCalling', values.purposeOfCalling)}>
              {t('epda.purpose')}
            </Label>
            <Select
              value={values.purposeOfCalling}
              onValueChange={(value) => handlers.setPurposeOfCalling(value as PurposeOption)}
            >
              <SelectTrigger id="purposeOfCalling" className={customerClass('purposeOfCalling', values.purposeOfCalling)}>
                <SelectValue placeholder={t('ph.purpose')} />
              </SelectTrigger>
              <SelectContent>
                {options.purposeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t('opt.purpose.' + option.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="quarantineCargoMode">{t('epda.quarantineCargo')}</Label>
            <Select
              value={values.quarantineCargoMode}
              onValueChange={(value) => handlers.setQuarantineCargoMode(value as QuarantineCargoOption)}
            >
              <SelectTrigger id="quarantineCargoMode">
                <SelectValue placeholder={t('ph.quarantineCargo')} />
              </SelectTrigger>
              <SelectContent>
                {options.quarantineCargoOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t('opt.quarantine.' + option.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label
              htmlFor="dischargeLoadingLocation"
              className={customerLabelClass('dischargeLoadingLocation', values.dischargeLoadingLocation)}
            >
              {t('epda.discharge')}
            </Label>
            <Select value={values.dischargeLoadingLocation} onValueChange={handlers.setDischargeLoadingLocation}>
              <SelectTrigger
                id="dischargeLoadingLocation"
                className={customerClass('dischargeLoadingLocation', values.dischargeLoadingLocation)}
              >
                <SelectValue placeholder={t('ph.location')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Berth">{t('epda.berth')}</SelectItem>
                <SelectItem value="Anchorage">{t('epda.anchorage')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className={epdaFieldGridClass()}>
          <div className="grid gap-2">
            <Label htmlFor="dwt" className={customerLabelClass('dwt', values.dwt)}>
              {t('epda.dwt')}
            </Label>
            <Input
              id="dwt"
              type="number"
              value={values.dwt}
              onChange={(e) => handlers.setDwt(e.target.value)}
              placeholder={t('ph.dwt')}
              min="0"
              step="any"
              className={customerClass('dwt', values.dwt)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="grt" className={customerLabelClass('grt', values.grt)}>
              {t('epda.grt')}
            </Label>
            <Input
              id="grt"
              type="number"
              value={values.grt}
              onChange={(e) => handlers.setGrt(e.target.value)}
              placeholder={t('ph.grt')}
              min="0"
              step="any"
              className={customerClass('grt', values.grt)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="loa" className={customerLabelClass('loa', values.loa)}>
              {t('epda.loa')}
            </Label>
            <div className="relative">
              <Input
                id="loa"
                type="number"
                value={values.loa}
                onChange={(e) => handlers.setLoa(e.target.value)}
                placeholder={t('ph.loa')}
                min="0"
                step="any"
                className={mergeEpdaFieldClasses('pr-8', customerClass('loa', values.loa))}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                m
              </span>
            </div>
          </div>

        </div>

        <div className={epdaFieldGridClass(3)}>
          <div className="grid gap-2">
            <Label htmlFor="cargoType" className={customerLabelClass('cargoType', values.cargoType)}>
              {t('epda.cargoType')}
            </Label>
            <Select
              value={values.cargoType}
              onValueChange={(value) => handlers.setCargoType(value as CargoType)}
              disabled={computed.isLoadingCargoCatalog || options.cargoTypeOptions.length === 0}
            >
              <SelectTrigger
                id="cargoType"
                className={mergeEpdaFieldClasses(
                  customerClass('cargoType', values.cargoType),
                  'disabled:text-muted-foreground',
                )}
              >
                <SelectValue
                  placeholder={
                    computed.isLoadingCargoCatalog
                      ? t('ph.cargoTypeLoading')
                      : options.cargoTypeOptions.length > 0
                        ? t('ph.cargoType')
                        : t('ph.cargoTypeNone')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {options.cargoTypeOptions.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    {option.displayLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label
              htmlFor="cargoName"
              className={
                computed.cargoNameDisabled
                  ? 'text-muted-foreground'
                  : customerLabelClass('cargoName', values.cargoName)
              }
            >
              {t('epda.cargoName')}
            </Label>
            <Select
              value={values.cargoName}
              onValueChange={handlers.setCargoName}
              disabled={computed.cargoNameDisabled || computed.isLoadingCargoCatalog}
            >
              <SelectTrigger
                id="cargoName"
                className={mergeEpdaFieldClasses(
                  computed.cargoNameDisabled ? '' : customerClass('cargoName', values.cargoName),
                  'disabled:text-muted-foreground',
                )}
              >
                <SelectValue
                  placeholder={
                    computed.cargoNameDisabled
                      ? t('ph.cargoNameNotApplicable')
                      : computed.isLoadingCargoCatalog
                        ? t('ph.cargoNameLoading')
                        : values.cargoType
                          ? t('ph.cargoName')
                          : t('ph.cargoTypeFirst')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {options.filteredCargoNames.map((item) => (
                  <SelectItem key={item.id} value={item.name}>
                    {item.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cargoQty" className={customerLabelClass('cargoQty', values.cargoQty)}>
              {t('epda.qty')}
            </Label>
            <Input
              id="cargoQty"
              type="number"
              value={values.cargoQty}
              onChange={(e) => handlers.setCargoQty(e.target.value)}
              placeholder={t('ph.qty')}
              min="0"
              step="any"
              className={customerClass('cargoQty', values.cargoQty)}
              required
            />
          </div>
        </div>
      </EpdaFormSection>

      <EpdaFormSection
        id="epda-dues"
        activeId={activeSection}
        title={t('epda.secDues')}
        description={t('epda.secDuesDesc')}
      >
        <div className={epdaFieldGridClass()}>
          <div className="grid gap-2">
            <Label htmlFor="berthHours">{isHcmAnchorage ? t('epda.buoyHours') : t('epda.berthHours')}</Label>
            <Input
              id="berthHours"
              type="number"
              value={values.berthHours}
              onChange={(e) => handlers.setBerthHours(e.target.value)}
              min="0"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="anchorageHours">{t('epda.anchorageHours')}</Label>
            <Input
              id="anchorageHours"
              type="number"
              value={values.anchorageHours}
              onChange={(e) => handlers.setAnchorageHours(e.target.value)}
              min="0"
            />
          </div>

          {usesQnPilotage(variant) ? (
            <div className="grid gap-2">
              <Label htmlFor="qnPilotageMiles">{t('epda.buoyPosition')}</Label>
              <Input
                id="qnPilotageMiles"
                type="number"
                value={values.qnPilotageMiles}
                onChange={(e) => handlers.setQnPilotageMiles(e.target.value)}
                min="0"
                disabled
                className={disabledFieldTextClass}
              />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="pilotageThirdMiles">{t('epda.buoyPosition')}</Label>
              <Input
                id="pilotageThirdMiles"
                type="number"
                value={values.pilotageThirdMiles}
                onChange={(e) => handlers.setPilotageThirdMiles(e.target.value)}
                min="0"
                disabled
                className={disabledFieldTextClass}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="garbageCbmAmount">{t('epda.garbageCbm')}</Label>
            <Input
              id="garbageCbmAmount"
              type="number"
              value={values.garbageCbmAmount || DEFAULT_GARBAGE_CBM_AMOUNT}
              onChange={(e) => handlers.setGarbageCbmAmount(e.target.value)}
              min="1"
              step="any"
            />
          </div>

          <div className="grid gap-2">
            <Label
              htmlFor="frtTaxType"
              className={
                computed.canEnableFreightTaxDeclaration
                  ? customerLabelClass('frtTaxType', values.frtTaxType)
                  : 'text-muted-foreground'
              }
            >
              {t('epda.frtTax')}
            </Label>
            <Select
              value={values.frtTaxType}
              onValueChange={(value) => handlers.setFrtTaxType(value as FrtTaxTypeOption)}
              disabled={!computed.canEnableFreightTaxDeclaration}
            >
              <SelectTrigger
                id="frtTaxType"
                className={mergeEpdaFieldClasses(
                  customerClass('frtTaxType', values.frtTaxType),
                  'disabled:text-muted-foreground',
                )}
              >
                <SelectValue placeholder={t('ph.frtType')} />
              </SelectTrigger>
              <SelectContent>
                {options.frtTaxTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(
                      option.value === 'Import'
                        ? 'opt.frt.import'
                        : option.value === 'Export - Pls Advise'
                          ? 'opt.frt.plsAdvise'
                          : 'opt.frt.declaration',
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className={epdaFieldGridClass(3)}>
          <div className="grid gap-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="oceanFrtRateUsdPerMt">{t('epda.oceanFrt')}</Label>
            <Input
              id="oceanFrtRateUsdPerMt"
              type="number"
              value={values.oceanFrtRateUsdPerMt}
              onChange={(e) => handlers.setOceanFrtRateUsdPerMt(e.target.value)}
              placeholder={
                computed.isExportPlsAdviseMode
                  ? t('ph.plsAdvise')
                  : computed.isImportFrtTaxType
                    ? '0'
                    : 'e.g. 16'
              }
              min="0"
              aria-label="Ocean freight rate USD per metric ton"
              disabled={computed.isOceanFreightInputDisabled}
              className={disabledFieldTextClass}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="boatHireQuarantineAmount">{t('epda.boatHireQuarantine')}</Label>
            <Input
              id="boatHireQuarantineAmount"
              type="number"
              value={values.boatHireQuarantineAmount}
              onChange={(e) => handlers.setBoatHireQuarantineAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="any"
            />
          </div>

          <div className="grid gap-2">
            <Label
              htmlFor="tallyFeeAmount"
              className={computed.isTallyFeeEligibleCargo ? '' : 'text-muted-foreground'}
            >
              {t('epda.tallyFee')}
            </Label>
            <Input
              id="tallyFeeAmount"
              type="number"
              value={values.tallyFeeAmount}
              onChange={(e) => handlers.setTallyFeeAmount(e.target.value)}
              placeholder={computed.isTallyFeeEligibleCargo ? '0' : t('ph.nil')}
              min="0"
              step="any"
              disabled={!computed.isTallyFeeEligibleCargo}
              className={disabledFieldTextClass}
            />
          </div>

          {computed.isLoaOverTugMax && (
            <div className="grid gap-2">
              <Label htmlFor="tugAssistanceAmount">{t('epda.tugAssistance')}</Label>
              <Input
                id="tugAssistanceAmount"
                type="number"
                value={values.tugAssistanceAmount}
                onChange={(e) => handlers.setTugAssistanceAmount(e.target.value)}
                placeholder="0"
                min="0"
                step="any"
              />
              <p className="text-xs text-muted-foreground">{t('epda.tugAssistanceHint')}</p>
            </div>
          )}
        </div>

        <div className={epdaFieldGridClass(3)}>
          <div className="grid gap-2">
            <Label htmlFor="otherExpenseType">{t('epda.otherExpense')}</Label>
            <Select
              value={values.otherExpenseType || 'NONE'}
              onValueChange={(value) => {
                if (value === 'NONE') {
                  handlers.setOtherExpenseType('')
                  handlers.setShorecraneHireUsdPerMt('')
                  return
                }
                handlers.setOtherExpenseType(value as OtherExpenseOption)
              }}
            >
              <SelectTrigger id="otherExpenseType">
                <SelectValue placeholder={t('epda.otherExpenseNone')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">{t('epda.otherExpenseNone')}</SelectItem>
                {OTHER_EXPENSE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.value === 'SHORECRANE_HIRE' ? t('epda.shorecraneHire') : option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {values.otherExpenseType === 'SHORECRANE_HIRE' && (
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="shorecraneHireUsdPerMt">{t('epda.shorecraneRate')}</Label>
              <Input
                id="shorecraneHireUsdPerMt"
                type="number"
                value={values.shorecraneHireUsdPerMt}
                onChange={(e) => handlers.setShorecraneHireUsdPerMt(e.target.value)}
                placeholder="e.g. 2.5"
                min="0"
                step="any"
              />
            </div>
          )}
        </div>

      </EpdaFormSection>

      <EpdaFormSection
        id="epda-agency"
        activeId={activeSection}
        title={t('epda.secAgency')}
        description={t('epda.secAgencyDesc')}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <Label htmlFor="agencyFeeMode">{t('epda.feeMode')}</Label>
            <Select
              value={values.agencyFeeMode}
              onValueChange={(value) => handlers.setAgencyFeeMode(value as AgencyFeeModeOption)}
            >
              <SelectTrigger id="agencyFeeMode" className="mt-2">
                <SelectValue placeholder={t('ph.agencyMode')} />
              </SelectTrigger>
              <SelectContent>
                {options.agencyFeeModeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t('opt.agencyMode.' + option.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {values.agencyFeeMode === 'AGENCY_IN_LUMPSUM' ? (
          <div className={epdaFieldGridClass(3)}>
            <div className="grid gap-2 sm:col-span-2 lg:col-span-3">
              <Label htmlFor="agencyLumpsumAmount">{t('epda.lumpsum')}</Label>
              <Input
                id="agencyLumpsumAmount"
                type="number"
                value={values.agencyLumpsumAmount}
                onChange={(e) => handlers.setAgencyLumpsumAmount(e.target.value)}
                placeholder="0"
                min="0"
                step="any"
              />
            </div>
          </div>
        ) : (
          <>
            <EpdaComputedSummary items={agencySummaryItems} />
            <div className={epdaFieldGridClass(3)}>
              <div className="grid gap-2">
                <Label htmlFor="agencyDiscountPercent">{t('epda.discount')}</Label>
                <Input
                  id="agencyDiscountPercent"
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={values.agencyDiscountPercent}
                  onChange={(e) => handlers.setAgencyDiscountPercent(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="grid gap-2">
                <Label
                  htmlFor="boatHireAmount"
                  className={isBoatHireForAgencyEnabled ? '' : 'text-muted-foreground'}
                >
                  {t('epda.boatHireAgency')}
                </Label>
                <Input
                  id="boatHireAmount"
                  type="number"
                  value={values.boatHireAmount}
                  onChange={(e) => handlers.setBoatHireAmount(e.target.value)}
                  placeholder={isBoatHireForAgencyEnabled ? '0' : t('ph.boatHireAvail')}
                  min="0"
                  step="any"
                  disabled={!isBoatHireForAgencyEnabled}
                  className={disabledFieldTextClass}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="transportLs">{t('epda.transportLs')}</Label>
                <Input
                  id="transportLs"
                  type="number"
                  value={values.transportLs}
                  onChange={(e) => handlers.setTransportLs(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="any"
                />
              </div>
            </div>
          </>
        )}
      </EpdaFormSection>
    </>
  )
}
