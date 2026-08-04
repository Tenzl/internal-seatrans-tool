import type { CargoType } from '@/modules/gallery/services/commodityService'
import { mergeEpdaFieldClasses } from '@/modules/inquiries/components/common/epdaCustomerFieldTracking'
import { DateTimePicker } from '@/shared/components/DateTimePicker'
import { NumberInput } from '@/shared/components/NumberInput'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EpdaFormSection } from '../EpdaFormLayout'
import { InvoiceFormFieldLabel as FieldLabel } from '../InvoiceFormFieldLabel'
import { epdaFieldGridClass } from '../epdaFormLayout.config'
import {
  SHIPOWNER_NATIONALITY_OPTIONS,
  type ShipownerNationalityOption,
} from '../epdaFormParameters'
import type {
  InvoiceVariantSectionProps,
  PurposeOption,
  QuarantineCargoOption,
  ShipTypeOption,
} from '../invoiceVariantForm.types'
import { resolveQnCargoQuarantineMode } from '../qnCargoQuarantine'
import { createCustomerFieldStyles } from './customerFieldStyles'

type GeneralInvoiceSectionProps = Pick<
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

export function GeneralInvoiceSection({
  variant,
  values,
  handlers,
  options,
  computed,
  getRequiredState,
  getCustomerFieldClass,
  activeSection,
}: GeneralInvoiceSectionProps) {
  const { t } = useI18n()
  const { fieldClass: customerClass, labelClass: customerLabelClass } =
    createCustomerFieldStyles(getRequiredState, getCustomerFieldClass)

  const handlePurposeChange = (purpose: PurposeOption) => {
    handlers.setPurposeOfCalling(purpose)
    if (variant === 'QN' && values.quarantineCargoMode !== 'OTHER') {
      // QN derives cargo-quarantine legs from the vessel purpose while enabled.
      handlers.setQuarantineCargoMode(
        resolveQnCargoQuarantineMode(true, purpose)
      )
    }
  }

  return (
    <EpdaFormSection
      id='epda-general'
      activeId={activeSection}
      title={t('epda.secGeneral')}
      description={t('epda.secGeneralDesc')}
    >
      <div className={epdaFieldGridClass()}>
        <div className='grid gap-2'>
          <FieldLabel
            htmlFor='toShipowner'
            className={customerLabelClass('toShipowner', values.toShipowner)}
          >
            {t('epda.toShipowner')}
          </FieldLabel>
          <Input
            id='toShipowner'
            value={values.toShipowner}
            onChange={(event) => handlers.setToShipowner(event.target.value)}
            placeholder={t('ph.shipowner')}
            className={customerClass('toShipowner', values.toShipowner)}
            required
          />
        </div>

        <div className='grid gap-2'>
          <FieldLabel htmlFor='shipownerNationality'>
            {t('epda.shipownerNationality')}
          </FieldLabel>
          <Select
            value={values.shipownerNationality}
            onValueChange={(value) =>
              handlers.setShipownerNationality(
                value as ShipownerNationalityOption
              )
            }
          >
            <SelectTrigger id='shipownerNationality'>
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
        <div className='grid gap-2'>
          <FieldLabel
            htmlFor='mv'
            className={customerLabelClass('mv', values.mv)}
          >
            {t('epda.mv')}
          </FieldLabel>
          <Input
            id='mv'
            value={values.mv}
            onChange={(event) => handlers.setMv(event.target.value)}
            placeholder={t('ph.vessel')}
            className={customerClass('mv', values.mv)}
            required
          />
        </div>

        <div className='grid gap-2'>
          <FieldLabel
            htmlFor='eta'
            className={
              getCustomerFieldClass?.('eta')
                ? 'text-emerald-700 dark:text-emerald-400'
                : undefined
            }
          >
            {t('epda.eta')}
          </FieldLabel>
          <DateTimePicker
            id='eta'
            value={values.eta}
            onValueChange={handlers.setEta}
            placeholder='TBN'
            className={getCustomerFieldClass?.('eta') ?? ''}
          />
        </div>

        <div className='grid gap-2'>
          <FieldLabel htmlFor='shipType'>{t('epda.shipType')}</FieldLabel>
          <Select
            value={values.shipType}
            onValueChange={(value) =>
              handlers.setShipType(value as ShipTypeOption)
            }
          >
            <SelectTrigger id='shipType'>
              <SelectValue placeholder={t('ph.shipType')} />
            </SelectTrigger>
            <SelectContent>
              {options.shipTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(`opt.shipType.${option.value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={epdaFieldGridClass()}>
        <div className='grid gap-2'>
          <FieldLabel
            htmlFor='purposeOfCalling'
            className={customerLabelClass(
              'purposeOfCalling',
              values.purposeOfCalling
            )}
          >
            {t('epda.purpose')}
          </FieldLabel>
          <Select
            value={values.purposeOfCalling}
            onValueChange={(value) =>
              handlePurposeChange(value as PurposeOption)
            }
          >
            <SelectTrigger
              id='purposeOfCalling'
              className={customerClass(
                'purposeOfCalling',
                values.purposeOfCalling
              )}
            >
              <SelectValue placeholder={t('ph.purpose')} />
            </SelectTrigger>
            <SelectContent>
              {options.purposeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(`opt.purpose.${option.value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {variant !== 'QN' && (
          <div className='grid gap-2'>
            <FieldLabel htmlFor='quarantineCargoMode'>
              {t('epda.quarantineCargo')}
            </FieldLabel>
            <Select
              value={values.quarantineCargoMode}
              onValueChange={(value) =>
                handlers.setQuarantineCargoMode(value as QuarantineCargoOption)
              }
            >
              <SelectTrigger id='quarantineCargoMode'>
                <SelectValue placeholder={t('ph.quarantineCargo')} />
              </SelectTrigger>
              <SelectContent>
                {options.quarantineCargoOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(`opt.quarantine.${option.value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className='grid gap-2'>
          <FieldLabel
            htmlFor='dischargeLoadingLocation'
            className={customerLabelClass(
              'dischargeLoadingLocation',
              values.dischargeLoadingLocation
            )}
          >
            {t('epda.discharge')}
          </FieldLabel>
          <Select
            value={values.dischargeLoadingLocation}
            onValueChange={handlers.setDischargeLoadingLocation}
          >
            <SelectTrigger
              id='dischargeLoadingLocation'
              className={customerClass(
                'dischargeLoadingLocation',
                values.dischargeLoadingLocation
              )}
            >
              <SelectValue placeholder={t('ph.location')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='Berth'>{t('epda.berth')}</SelectItem>
              <SelectItem value='Anchorage'>{t('epda.anchorage')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={epdaFieldGridClass()}>
        <div className='grid gap-2'>
          <FieldLabel
            htmlFor='dwt'
            className={customerLabelClass('dwt', values.dwt)}
          >
            {t('epda.dwt')}
          </FieldLabel>
          <NumberInput
            id='dwt'
            value={values.dwt}
            onValueChange={(_value, canonical) => handlers.setDwt(canonical)}
            placeholder={t('ph.dwt')}
            className={customerClass('dwt', values.dwt)}
          />
        </div>

        <div className='grid gap-2'>
          <FieldLabel
            htmlFor='grt'
            className={customerLabelClass('grt', values.grt)}
          >
            {t('epda.grt')}
          </FieldLabel>
          <NumberInput
            id='grt'
            value={values.grt}
            onValueChange={(_value, canonical) => handlers.setGrt(canonical)}
            placeholder={t('ph.grt')}
            className={customerClass('grt', values.grt)}
          />
        </div>

        <div className='grid gap-2'>
          <FieldLabel
            htmlFor='loa'
            className={customerLabelClass('loa', values.loa)}
          >
            {t('epda.loa')}
          </FieldLabel>
          <div className='relative'>
            <NumberInput
              id='loa'
              value={values.loa}
              onValueChange={(_value, canonical) => handlers.setLoa(canonical)}
              placeholder={t('ph.loa')}
              className={mergeEpdaFieldClasses(
                'pr-8',
                customerClass('loa', values.loa)
              )}
            />
            <span className='pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground'>
              m
            </span>
          </div>
        </div>
      </div>

      <div className={epdaFieldGridClass(3)}>
        <div className='grid gap-2'>
          <FieldLabel
            htmlFor='cargoType'
            className={customerLabelClass('cargoType', values.cargoType)}
          >
            {t('epda.cargoType')}
          </FieldLabel>
          <Select
            value={values.cargoType}
            onValueChange={(value) => handlers.setCargoType(value as CargoType)}
            disabled={
              computed.isLoadingCargoCatalog ||
              options.cargoTypeOptions.length === 0
            }
          >
            <SelectTrigger
              id='cargoType'
              className={mergeEpdaFieldClasses(
                customerClass('cargoType', values.cargoType),
                'disabled:text-muted-foreground'
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

        <div className='grid gap-2'>
          <FieldLabel
            htmlFor='cargoName'
            className={
              computed.cargoNameDisabled
                ? 'text-muted-foreground'
                : customerLabelClass('cargoName', values.cargoName)
            }
          >
            {t('epda.cargoName')}
          </FieldLabel>
          <Select
            value={values.cargoName}
            onValueChange={handlers.setCargoName}
            disabled={
              computed.cargoNameDisabled || computed.isLoadingCargoCatalog
            }
          >
            <SelectTrigger
              id='cargoName'
              className={mergeEpdaFieldClasses(
                computed.cargoNameDisabled
                  ? ''
                  : customerClass('cargoName', values.cargoName),
                'disabled:text-muted-foreground'
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

        <div className='grid gap-2'>
          <FieldLabel
            htmlFor='cargoQty'
            className={customerLabelClass('cargoQty', values.cargoQty)}
          >
            {t('epda.qty')}
          </FieldLabel>
          <NumberInput
            id='cargoQty'
            value={values.cargoQty}
            onValueChange={(_value, canonical) =>
              handlers.setCargoQty(canonical)
            }
            placeholder={t('ph.qty')}
            className={customerClass('cargoQty', values.cargoQty)}
            required
          />
        </div>
      </div>
    </EpdaFormSection>
  )
}
