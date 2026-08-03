import { mergeEpdaFieldClasses } from '@/modules/inquiries/components/common/epdaCustomerFieldTracking'
import { getEpdaVariantConfig } from '@/modules/inquiries/components/common/quoteForm'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { EpdaFormSection } from '../EpdaFormLayout'
import { InvoiceFormFieldLabel as FieldLabel } from '../InvoiceFormFieldLabel'
import { epdaFieldGridClass } from '../epdaFormLayout.config'
import {
  OTHER_EXPENSE_OPTIONS,
  TUG_ASSISTANCE_TRIP_OPTIONS,
  type OtherExpenseOption,
  type TugAssistanceTripsOption,
} from '../epdaFormParameters'
import type {
  FrtTaxTypeOption,
  InvoiceVariantSectionProps,
} from '../invoiceVariantForm.types'
import { resolveQnCargoQuarantineMode } from '../qnCargoQuarantine'
import { createCustomerFieldStyles } from './customerFieldStyles'

type PortDuesSectionProps = Pick<
  InvoiceVariantSectionProps,
  | 'variant'
  | 'values'
  | 'handlers'
  | 'options'
  | 'computed'
  | 'getRequiredState'
  | 'getCustomerFieldClass'
  | 'activeSection'
>

const disabledFieldTextClass =
  'disabled:text-muted-foreground disabled:placeholder:text-muted-foreground'

export function PortDuesSection({
  variant,
  values,
  handlers,
  options,
  computed,
  getRequiredState,
  getCustomerFieldClass,
  activeSection,
}: PortDuesSectionProps) {
  const { t } = useI18n()
  const variantConfig = getEpdaVariantConfig(variant)
  const isHcmAnchorage =
    variantConfig.chargeLayout === 'HCM' &&
    values.dischargeLoadingLocation === 'Anchorage'
  const isQnCargoQuarantineEnabled =
    variant === 'QN' && values.quarantineCargoMode !== 'OTHER'
  const { fieldClass: customerClass, labelClass: customerLabelClass } =
    createCustomerFieldStyles(getRequiredState, getCustomerFieldClass)

  const handleQnCargoQuarantineToggle = (enabled: boolean) => {
    handlers.setQuarantineCargoMode(
      resolveQnCargoQuarantineMode(enabled, values.purposeOfCalling)
    )
  }

  return (
    <EpdaFormSection
      id='epda-dues'
      activeId={activeSection}
      title={t('epda.secDues')}
      description={t('epda.secDuesDesc')}
    >
      <div className={epdaFieldGridClass()}>
        <div className='grid gap-2'>
          <FieldLabel htmlFor='berthHours'>
            {isHcmAnchorage ? t('epda.buoyHours') : t('epda.berthHours')}
          </FieldLabel>
          <Input
            id='berthHours'
            type='number'
            value={values.berthHours}
            onChange={(event) => handlers.setBerthHours(event.target.value)}
            min='0'
          />
        </div>

        <div className='grid gap-2'>
          <FieldLabel htmlFor='anchorageHours'>
            {t('epda.anchorageHours')}
          </FieldLabel>
          <Input
            id='anchorageHours'
            type='number'
            value={values.anchorageHours}
            onChange={(event) => handlers.setAnchorageHours(event.target.value)}
            min='0'
          />
        </div>

        {variantConfig.pilotageMode === 'SINGLE_RATE' ? (
          <div className='grid gap-2'>
            <FieldLabel htmlFor='qnPilotageMiles'>
              {t('epda.buoyPosition')}
            </FieldLabel>
            <Input
              id='qnPilotageMiles'
              type='number'
              value={values.qnPilotageMiles}
              onChange={(event) =>
                handlers.setQnPilotageMiles(event.target.value)
              }
              min='0'
            />
          </div>
        ) : (
          <div className='grid gap-2'>
            <FieldLabel htmlFor='pilotageThirdMiles'>
              {t('epda.buoyPosition')}
            </FieldLabel>
            <Input
              id='pilotageThirdMiles'
              type='number'
              value={values.pilotageThirdMiles}
              onChange={(event) =>
                handlers.setPilotageThirdMiles(event.target.value)
              }
              min='0'
            />
          </div>
        )}

        <div className='grid gap-2'>
          <FieldLabel
            htmlFor='frtTaxType'
            className={
              computed.canEnableFreightTaxDeclaration
                ? customerLabelClass('frtTaxType', values.frtTaxType)
                : 'text-muted-foreground'
            }
          >
            {t('epda.frtTax')}
          </FieldLabel>
          <Select
            value={values.frtTaxType}
            onValueChange={(value) =>
              handlers.setFrtTaxType(value as FrtTaxTypeOption)
            }
            disabled={!computed.canEnableFreightTaxDeclaration}
          >
            <SelectTrigger
              id='frtTaxType'
              className={mergeEpdaFieldClasses(
                customerClass('frtTaxType', values.frtTaxType),
                'disabled:text-muted-foreground'
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
                        : 'opt.frt.declaration'
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='grid gap-2'>
          <FieldLabel htmlFor='tugAssistanceTrips'>
            {t('epda.tugTrips')}
          </FieldLabel>
          <Select
            value={values.tugAssistanceTrips}
            onValueChange={(value) =>
              handlers.setTugAssistanceTrips(value as TugAssistanceTripsOption)
            }
          >
            <SelectTrigger id='tugAssistanceTrips'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TUG_ASSISTANCE_TRIP_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.value === '1'
                    ? t('epda.tugTripsOne')
                    : t('epda.tugTripsTwo')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {variant === 'QN' && (
          <div className='grid gap-2'>
            <FieldLabel htmlFor='qnCargoQuarantine'>
              {t('epda.includeCargoQuarantine')}
            </FieldLabel>
            <div className='flex min-h-10 items-center justify-between gap-3 rounded-md border px-3 py-2'>
              <span className='text-sm text-muted-foreground'>
                {t(
                  isQnCargoQuarantineEnabled
                    ? 'epda.cargoQuarantineIncluded'
                    : 'epda.cargoQuarantineExcluded'
                )}
              </span>
              <Switch
                id='qnCargoQuarantine'
                checked={isQnCargoQuarantineEnabled}
                onCheckedChange={handleQnCargoQuarantineToggle}
                aria-label={t('epda.includeCargoQuarantine')}
              />
            </div>
          </div>
        )}

        {computed.isLoaOverTugMax && (
          <div className='grid gap-2'>
            <FieldLabel htmlFor='tugAssistanceAmount'>
              {t('epda.tugAssistance')}
            </FieldLabel>
            <Input
              id='tugAssistanceAmount'
              type='number'
              value={values.tugAssistanceAmount}
              onChange={(event) =>
                handlers.setTugAssistanceAmount(event.target.value)
              }
              placeholder='0'
              min='0'
              step='any'
            />
            <p className='text-xs text-muted-foreground'>
              {t('epda.tugAssistanceHint')}
            </p>
          </div>
        )}
      </div>

      <div className={epdaFieldGridClass(3)}>
        <div className='grid gap-2 sm:col-span-2 lg:col-span-1'>
          <FieldLabel htmlFor='oceanFrtRateUsdPerMt'>
            {t('epda.oceanFrt')}
          </FieldLabel>
          <Input
            id='oceanFrtRateUsdPerMt'
            type='number'
            value={values.oceanFrtRateUsdPerMt}
            onChange={(event) =>
              handlers.setOceanFrtRateUsdPerMt(event.target.value)
            }
            placeholder={
              computed.isExportPlsAdviseMode
                ? t('ph.plsAdvise')
                : computed.isImportFrtTaxType
                  ? '0'
                  : 'e.g. 16'
            }
            min='0'
            aria-label='Ocean freight rate USD per metric ton'
            disabled={computed.isOceanFreightInputDisabled}
            className={disabledFieldTextClass}
          />
        </div>

        <div className='grid gap-2'>
          <FieldLabel htmlFor='boatHireQuarantineAmount'>
            {t('epda.boatHireQuarantine')}
          </FieldLabel>
          <Input
            id='boatHireQuarantineAmount'
            type='number'
            value={values.boatHireQuarantineAmount}
            onChange={(event) =>
              handlers.setBoatHireQuarantineAmount(event.target.value)
            }
            placeholder='0'
            min='0'
            step='any'
          />
        </div>

        <div className='grid gap-2'>
          <FieldLabel
            htmlFor='tallyFeeAmount'
            className={
              computed.isTallyFeeEligibleCargo ? '' : 'text-muted-foreground'
            }
          >
            {t('epda.tallyFee')}
          </FieldLabel>
          <Input
            id='tallyFeeAmount'
            type='number'
            value={values.tallyFeeAmount}
            onChange={(event) => handlers.setTallyFeeAmount(event.target.value)}
            placeholder={computed.isTallyFeeEligibleCargo ? '0' : t('ph.nil')}
            min='0'
            step='any'
            disabled={!computed.isTallyFeeEligibleCargo}
            className={disabledFieldTextClass}
          />
        </div>
      </div>

      <div className={epdaFieldGridClass(3)}>
        <div className='grid gap-2'>
          <FieldLabel htmlFor='otherExpenseType'>
            {t('epda.otherExpense')}
          </FieldLabel>
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
            <SelectTrigger id='otherExpenseType'>
              <SelectValue placeholder={t('epda.otherExpenseNone')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='NONE'>{t('epda.otherExpenseNone')}</SelectItem>
              {OTHER_EXPENSE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.value === 'SHORECRANE_HIRE'
                    ? t('epda.shorecraneHire')
                    : option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {values.otherExpenseType === 'SHORECRANE_HIRE' && (
          <div className='grid gap-2 sm:col-span-2'>
            <FieldLabel htmlFor='shorecraneHireUsdPerMt'>
              {t('epda.shorecraneRate')}
            </FieldLabel>
            <Input
              id='shorecraneHireUsdPerMt'
              type='number'
              value={values.shorecraneHireUsdPerMt}
              onChange={(event) =>
                handlers.setShorecraneHireUsdPerMt(event.target.value)
              }
              placeholder='e.g. 2.5'
              min='0'
              step='any'
            />
          </div>
        )}
      </div>
    </EpdaFormSection>
  )
}
