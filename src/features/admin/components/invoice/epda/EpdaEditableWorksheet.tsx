'use client'

import type { KeyboardEventHandler, ReactNode, RefObject } from 'react'
import type { ShippingAgencyAdminInquiry } from '@/modules/inquiries/components/common/epdaApiMappers'
import type { EpdaParameterValues } from '@/modules/inquiries/services/epdaParametersService'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CreateInvoiceVariantForm,
  type FormVariant,
  type InvoiceVariantFormProps,
} from '../CreateInvoiceVariantForm'
import {
  EpdaFormSection,
  EpdaFormSkeleton,
  EpdaSectionRail,
} from '../EpdaFormLayout'
import type { EpdaSectionId } from '../epdaFormLayout.config'
import { EpdaInquiryMetaPanel } from './EpdaInquiryMetaPanel'
import { EpdaPortSelector, type EpdaArea } from './EpdaPortSelector'

interface PortOption {
  id: number
  portOfCall?: string | null
}

interface EpdaEditableWorksheetProps {
  variant: FormVariant
  embedded: boolean
  isInquiryDetailFlow: boolean
  isLoadingInquiry: boolean
  linkedInquiryId: number | null | undefined
  creatorLabel: string | null
  actions: ReactNode
  backNavigation: ReactNode
  area: EpdaArea | ''
  port: string
  ports: PortOption[]
  portPickerCollapsed: boolean
  isLoadingPorts: boolean
  areaLocked: boolean
  onAreaChange: (area: EpdaArea) => void
  onPortChange: (port: string, portId: number | null) => void
  onPortPickerCollapsedChange: (collapsed: boolean) => void
  activeSection: EpdaSectionId
  onActiveSectionChange: (section: EpdaSectionId) => void
  showCreatorSection: boolean
  inquiry: ShippingAgencyAdminInquiry | null
  formNavigationRef: RefObject<HTMLDivElement | null>
  onFormKeyDown: KeyboardEventHandler<HTMLDivElement>
  isLoadingCargoCatalog: boolean
  hasCargoTypeOptions: boolean
  formValues: InvoiceVariantFormProps['values']
  formHandlers: InvoiceVariantFormProps['handlers']
  formOptions: InvoiceVariantFormProps['options']
  formComputed: InvoiceVariantFormProps['computed']
  params: EpdaParameterValues
  getRequiredState: InvoiceVariantFormProps['getRequiredState']
  isLastSection: boolean
  onNextSection: () => void
  isReadOnly: boolean
  showValidationErrors: boolean
  missingRequiredFieldLabels: string[]
}

/** Presentational EPDA editor; state and persistence remain in its controller. */
export function EpdaEditableWorksheet({
  variant,
  embedded,
  isInquiryDetailFlow,
  isLoadingInquiry,
  linkedInquiryId,
  creatorLabel,
  actions,
  backNavigation,
  area,
  port,
  ports,
  portPickerCollapsed,
  isLoadingPorts,
  areaLocked,
  onAreaChange,
  onPortChange,
  onPortPickerCollapsedChange,
  activeSection,
  onActiveSectionChange,
  showCreatorSection,
  inquiry,
  formNavigationRef,
  onFormKeyDown,
  isLoadingCargoCatalog,
  hasCargoTypeOptions,
  formValues,
  formHandlers,
  formOptions,
  formComputed,
  params,
  getRequiredState,
  isLastSection,
  onNextSection,
  isReadOnly,
  showValidationErrors,
  missingRequiredFieldLabels,
}: EpdaEditableWorksheetProps) {
  const { t } = useI18n()
  const canShowForm = isInquiryDetailFlow || Boolean(area && port)

  return (
    <div className='min-h-0'>
      <div className='min-w-0 space-y-6 [&_[role=combobox]]:w-full'>
        {isInquiryDetailFlow ? (
          <h2 className='text-2xl font-bold tracking-tight sm:text-3xl'>
            {t('epda.editTitle')}
          </h2>
        ) : null}

        {backNavigation}
        <div
          className={cn(
            'space-y-4',
            !embedded &&
              'sticky top-0 z-10 -mx-1 border-b border-border/60 bg-background/95 px-1 pt-1 pb-4 supports-[backdrop-filter]:bg-background/80 max-md:backdrop-blur-none md:backdrop-blur'
          )}
        >
          {isLoadingInquiry ? (
            <p className='text-xs text-muted-foreground'>
              Loading inquiry EPDA...
            </p>
          ) : null}

          <div className='flex flex-wrap items-center justify-between gap-2'>
            {linkedInquiryId ? (
              <Badge variant='outline' className='w-fit font-mono text-xs'>
                {t('epda.inquiryNo', { id: linkedInquiryId })}
              </Badge>
            ) : (
              <div className='flex items-center gap-2.5'>
                <span className='text-sm text-muted-foreground'>
                  {t('epda.creator')}
                </span>
                <Badge variant='secondary' className='text-sm font-medium'>
                  {creatorLabel || '—'}
                </Badge>
              </div>
            )}
            {actions}
          </div>

          <EpdaPortSelector
            area={area}
            port={port}
            ports={ports}
            collapsed={portPickerCollapsed}
            isLoading={isLoadingPorts}
            areaLocked={areaLocked}
            onAreaChange={onAreaChange}
            onPortChange={onPortChange}
            onCollapsedChange={onPortPickerCollapsedChange}
          />

          {canShowForm ? (
            <EpdaSectionRail
              active={activeSection}
              onSelect={onActiveSectionChange}
              includeCustomer={showCreatorSection}
              className='md:hidden'
            />
          ) : null}
        </div>

        {!canShowForm ? (
          <div className='rounded-lg border border-dashed border-border/70 bg-muted/20 px-6 py-12 text-center'>
            <p className='text-base font-medium'>{t('epda.chooseStart')}</p>
            <p className='mx-auto mt-1 max-w-md text-sm text-muted-foreground'>
              {t('epda.chooseStartHint')}
            </p>
          </div>
        ) : (
          <div className='grid gap-8 md:grid-cols-[15rem_1fr]'>
            <EpdaSectionRail
              active={activeSection}
              onSelect={onActiveSectionChange}
              includeCustomer={showCreatorSection}
              className='hidden md:sticky md:top-36 md:block md:self-start'
            />

            <div
              ref={formNavigationRef}
              onKeyDownCapture={onFormKeyDown}
              className='min-w-0 space-y-2 pb-6 [&_[role=combobox]]:font-medium [&_input]:font-medium'
            >
              {showCreatorSection && inquiry ? (
                <EpdaFormSection
                  id='epda-customer'
                  title={t('epda.secCustomer')}
                  activeId={activeSection}
                >
                  <EpdaInquiryMetaPanel inquiry={inquiry} showCustomerAccount />
                </EpdaFormSection>
              ) : null}

              {isLoadingCargoCatalog && !hasCargoTypeOptions ? (
                <EpdaFormSkeleton rows={4} />
              ) : null}

              <CreateInvoiceVariantForm
                variant={variant}
                values={formValues}
                handlers={formHandlers}
                options={formOptions}
                computed={formComputed}
                params={params}
                activeSection={activeSection}
                getRequiredState={getRequiredState}
              />

              <div className='pt-2 md:hidden'>
                {isLastSection ? (
                  <Button
                    type='button'
                    className='h-11 w-full active:scale-[0.98]'
                    onClick={() =>
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }
                  >
                    {t('epda.done')}
                  </Button>
                ) : (
                  <Button
                    type='button'
                    className='h-11 w-full gap-2 active:scale-[0.98]'
                    onClick={onNextSection}
                  >
                    {t('epda.next')}
                    <ArrowRight className='h-4 w-4' />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {!isReadOnly &&
        showValidationErrors &&
        missingRequiredFieldLabels.length > 0 ? (
          <p className='text-sm text-destructive' role='alert'>
            {t('epda.requiredFields')}: {missingRequiredFieldLabels.join(', ')}
          </p>
        ) : null}
      </div>
    </div>
  )
}
