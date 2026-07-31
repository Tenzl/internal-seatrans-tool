import type { EpdaParameterValues } from '@/modules/inquiries/components/common/quoteParameters'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  EpdaComputedSummary,
  EpdaFormSection,
  type EpdaSummaryItem,
} from '../EpdaFormLayout'
import { InvoiceFormFieldLabel as FieldLabel } from '../InvoiceFormFieldLabel'
import { epdaFieldGridClass } from '../epdaFormLayout.config'
import type {
  AgencyFeeModeOption,
  InvoiceVariantSectionProps,
} from '../invoiceVariantForm.types'
import { calculateAgencyFeeSummary } from './agencyFeeSummary'

type AgencyFeeSectionProps = Pick<
  InvoiceVariantSectionProps,
  'values' | 'handlers' | 'options' | 'activeSection'
> & {
  params: EpdaParameterValues
}

const disabledFieldTextClass =
  'disabled:text-muted-foreground disabled:placeholder:text-muted-foreground'

export function AgencyFeeSection({
  values,
  handlers,
  options,
  activeSection,
  params,
}: AgencyFeeSectionProps) {
  const { t } = useI18n()
  const isBoatHireEnabled = values.dischargeLoadingLocation === 'Anchorage'
  const summary = calculateAgencyFeeSummary(
    {
      grt: values.grt,
      cargoQty: values.cargoQty,
      cargoType: values.cargoType,
      discountPercent: values.agencyDiscountPercent,
    },
    params
  )
  const payablePercentDisplay = summary.payablePercent.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  const subAgencySuffix =
    summary.discountPercent === 0
      ? ''
      : ` x ${payablePercentDisplay}%(sub-agency)`
  const summaryItems: EpdaSummaryItem[] =
    values.agencyFeeMode === 'TARRIF_AGENCY'
      ? [
          {
            label: t('sum.onGrt', { label: summary.grtBand.label }),
            value: `USD ${summary.grtBand.amount.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}${subAgencySuffix}`,
          },
          {
            label: t('sum.onCargo', {
              rate: summary.cargoRate.toFixed(2),
              qty: summary.cargoQty,
            }),
            value: `USD ${summary.cargoBaseAmount.toLocaleString('en-US', {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}${subAgencySuffix}`,
          },
        ]
      : []

  return (
    <EpdaFormSection
      id='epda-agency'
      activeId={activeSection}
      title={t('epda.secAgency')}
      description={t('epda.secAgencyDesc')}
    >
      <div className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
        <div className='w-full sm:max-w-xs'>
          <FieldLabel htmlFor='agencyFeeMode'>{t('epda.feeMode')}</FieldLabel>
          <Select
            value={values.agencyFeeMode}
            onValueChange={(value) =>
              handlers.setAgencyFeeMode(value as AgencyFeeModeOption)
            }
          >
            <SelectTrigger id='agencyFeeMode' className='mt-2'>
              <SelectValue placeholder={t('ph.agencyMode')} />
            </SelectTrigger>
            <SelectContent>
              {options.agencyFeeModeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(`opt.agencyMode.${option.value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {values.agencyFeeMode === 'AGENCY_IN_LUMPSUM' ? (
        <div className={epdaFieldGridClass(3)}>
          <div className='grid gap-2 sm:col-span-2 lg:col-span-3'>
            <FieldLabel htmlFor='agencyLumpsumAmount'>
              {t('epda.lumpsum')}
            </FieldLabel>
            <Input
              id='agencyLumpsumAmount'
              type='number'
              value={values.agencyLumpsumAmount}
              onChange={(event) =>
                handlers.setAgencyLumpsumAmount(event.target.value)
              }
              placeholder='0'
              min='0'
              step='any'
            />
          </div>
        </div>
      ) : (
        <>
          <EpdaComputedSummary items={summaryItems} />
          <div className={epdaFieldGridClass(3)}>
            <div className='grid gap-2'>
              <FieldLabel htmlFor='agencyDiscountPercent'>
                {t('epda.discount')}
              </FieldLabel>
              <Input
                id='agencyDiscountPercent'
                type='number'
                min='0'
                max='100'
                step='any'
                value={values.agencyDiscountPercent}
                onChange={(event) =>
                  handlers.setAgencyDiscountPercent(event.target.value)
                }
                placeholder='0'
              />
            </div>

            <div className='grid gap-2'>
              <FieldLabel
                htmlFor='boatHireAmount'
                className={isBoatHireEnabled ? '' : 'text-muted-foreground'}
              >
                {t('epda.boatHireAgency')}
              </FieldLabel>
              <Input
                id='boatHireAmount'
                type='number'
                value={values.boatHireAmount}
                onChange={(event) =>
                  handlers.setBoatHireAmount(event.target.value)
                }
                placeholder={isBoatHireEnabled ? '0' : t('ph.boatHireAvail')}
                min='0'
                step='any'
                disabled={!isBoatHireEnabled}
                className={disabledFieldTextClass}
              />
            </div>

            <div className='grid gap-2'>
              <FieldLabel htmlFor='transportLs'>
                {t('epda.transportLs')}
              </FieldLabel>
              <Input
                id='transportLs'
                type='number'
                value={values.transportLs}
                onChange={(event) =>
                  handlers.setTransportLs(event.target.value)
                }
                placeholder='0'
                min='0'
                step='any'
              />
            </div>
          </div>
        </>
      )}
    </EpdaFormSection>
  )
}
