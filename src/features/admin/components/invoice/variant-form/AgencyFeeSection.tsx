import type { EpdaParameterValues } from '@/modules/inquiries/components/common/quoteParameters'
import { NumberInput } from '@/shared/components/NumberInput'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const isLumpsumMode = values.agencyFeeMode === 'AGENCY_IN_LUMPSUM'
  const summary = calculateAgencyFeeSummary(
    {
      grt: values.grt,
      cargoQty: values.cargoQty,
      commodityTypeId: values.commodityTypeId,
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

      {isLumpsumMode ? (
        <div className='flex flex-col gap-4'>
          <div className={epdaFieldGridClass(3)}>
            <div className='grid gap-2 sm:col-span-2 lg:col-span-3'>
              <FieldLabel htmlFor='agencyLumpsumAmount'>
                {t('epda.lumpsum')}
              </FieldLabel>
              <NumberInput
                id='agencyLumpsumAmount'
                value={values.agencyLumpsumAmount}
                onValueChange={(_value, canonical) =>
                  handlers.setAgencyLumpsumAmount(canonical)
                }
                placeholder='0'
              />
            </div>
          </div>

          <div className='flex flex-col gap-3'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <p className='text-sm font-medium text-foreground'>
                {t('epda.agencyOtherExpenses')}
              </p>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='transition-colors duration-200'
                onClick={handlers.addAgencyOtherExpense}
              >
                <Plus className='size-4' aria-hidden />
                {t('epda.addAgencyOtherExpense')}
              </Button>
            </div>

            {values.agencyOtherExpenses.length === 0 ? (
              <p className='text-sm text-muted-foreground'>
                {t('epda.agencyOtherExpensesEmpty')}
              </p>
            ) : (
              <ul className='flex flex-col gap-2'>
                {values.agencyOtherExpenses.map((row, index) => (
                  <li
                    key={row.id}
                    className='grid grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)_auto]'
                  >
                    <div className='grid gap-2'>
                      <FieldLabel htmlFor={`agencyOtherExpenseName-${row.id}`}>
                        {t('epda.agencyOtherExpenseName')}
                        <span className='sr-only'> {index + 1}</span>
                      </FieldLabel>
                      <Input
                        id={`agencyOtherExpenseName-${row.id}`}
                        value={row.name}
                        maxLength={255}
                        placeholder={t('ph.agencyOtherExpenseName')}
                        onChange={(event) =>
                          handlers.updateAgencyOtherExpense(row.id, {
                            name: event.target.value,
                          })
                        }
                      />
                    </div>
                    <div className='grid gap-2'>
                      <FieldLabel
                        htmlFor={`agencyOtherExpenseAmount-${row.id}`}
                      >
                        {t('epda.agencyOtherExpenseAmount')}
                      </FieldLabel>
                      <NumberInput
                        id={`agencyOtherExpenseAmount-${row.id}`}
                        value={row.amount}
                        onValueChange={(_value, canonical) =>
                          handlers.updateAgencyOtherExpense(row.id, {
                            amount: canonical,
                          })
                        }
                        placeholder='0'
                      />
                    </div>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='text-muted-foreground transition-colors duration-200 hover:text-destructive'
                      aria-label={t('epda.removeAgencyOtherExpense')}
                      onClick={() => handlers.removeAgencyOtherExpense(row.id)}
                    >
                      <X className='size-4' aria-hidden />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
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
              <NumberInput
                id='agencyDiscountPercent'
                max={100}
                value={values.agencyDiscountPercent}
                onValueChange={(_value, canonical) =>
                  handlers.setAgencyDiscountPercent(canonical)
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
              <NumberInput
                id='boatHireAmount'
                value={values.boatHireAmount}
                onValueChange={(_value, canonical) =>
                  handlers.setBoatHireAmount(canonical)
                }
                placeholder={isBoatHireEnabled ? '0' : t('ph.boatHireAvail')}
                disabled={!isBoatHireEnabled}
                className={disabledFieldTextClass}
              />
            </div>

            <div className='grid gap-2'>
              <FieldLabel htmlFor='transportLs'>
                {t('epda.transportLs')}
              </FieldLabel>
              <NumberInput
                id='transportLs'
                value={values.transportLs}
                onValueChange={(_value, canonical) =>
                  handlers.setTransportLs(canonical)
                }
                placeholder='0'
              />
            </div>
          </div>
        </>
      )}
    </EpdaFormSection>
  )
}
