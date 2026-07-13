'use client'

import React, { type RefObject } from 'react'
import type { Port } from '@/modules/logistics/services/portService'
import type { Commodity } from '@/modules/gallery/services/commodityService'
import type { ExternalCustomerOption } from '@/features/admin/services/externalCustomerService'
import { EpdaCustomerSelect } from '@/features/admin/components/invoice/epda/EpdaCustomerSelect'
import {
  SHIPPING_AGENCY_CARGO_TYPES,
  legacyCargoTypeToCode,
} from '@/modules/gallery/shippingAgencyCargoCatalog'
import {
  AGENCY_FEE_MODE_OPTIONS,
  AREA_OPTIONS,
  FRT_TAX_TYPE_OPTIONS,
  OTHER_EXPENSE_OPTIONS,
  PURPOSE_OPTIONS,
  QUARANTINE_CARGO_OPTIONS,
  SHIP_TYPE_OPTIONS,
  SHIPOWNER_NATIONALITY_OPTIONS,
} from '@/features/admin/components/invoice/epdaFormParameters'
import type {
  EpdaCreateState,
  EpdaFormField,
  EpdaAreaCode,
} from '../model/epdaForm.types'
import { getEpdaVariantConfig } from '@/features/admin/components/invoice/epda/quoteFormFromArea'

export interface EpdaSemanticFormProps {
  state: EpdaCreateState
  ports: Port[]
  commodities: Commodity[]
  validationErrors: Record<string, string>
  statusMessage?: string | null
  linkedInquiryId?: number | null
  customerUserId: number | null
  customerLabel?: string | null
  locked?: boolean
  busy?: boolean
  errorSummaryRef?: RefObject<HTMLElement | null>
  onAreaChange: (area: EpdaAreaCode | '') => void
  onCustomerChange: (customerId: number | null, option?: ExternalCustomerOption) => void
  onPortChange: (portId: number | null) => void
  onFieldChange: (field: EpdaFormField, value: string) => void
  onRetryTariff: () => void
  onResetTariff: () => void
  onReset: () => void
  onPreview: () => void
  onIssue: () => void
  onLock: () => void
  onSubmit: () => void
}

const inputClass =
  'mt-1 min-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60'
const labelClass = 'block text-sm font-medium'
const fieldsetClass = 'scroll-mt-28 rounded-lg border bg-card p-4 sm:p-6'
const legendClass = 'px-2 text-lg font-semibold tracking-tight'
const gridClass = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'

const focusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

function fieldError(errors: Record<string, string>, name: string) {
  const error = errors[name]
  return error ? <small id={`${name}-error`} className='mt-1 block text-destructive'>{error}</small> : null
}

function requiredProps(name: string, error?: string) {
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${name}-error` : undefined,
  }
}

export function EpdaSemanticForm({
  state,
  ports,
  commodities,
  validationErrors,
  statusMessage,
  linkedInquiryId,
  customerUserId,
  customerLabel,
  locked = false,
  busy = false,
  errorSummaryRef,
  onAreaChange,
  onCustomerChange,
  onPortChange,
  onFieldChange,
  onRetryTariff,
  onResetTariff,
  onReset,
  onPreview,
  onIssue,
  onLock,
  onSubmit,
}: EpdaSemanticFormProps) {
  const { fields, identity, tariff } = state
  const variantConfig = getEpdaVariantConfig(identity.quoteForm)
  const quoteActionsDisabled =
    busy || tariff.status !== 'ready' || !identity.portId
  const mutationDisabled = quoteActionsDisabled || locked
  const cargoNames = commodities.filter(
    (item) => legacyCargoTypeToCode(item.cargoType) === legacyCargoTypeToCode(fields.cargoType),
  )
  const errors = Object.entries(validationErrors)

  return (
    <form
      aria-labelledby='epda-form-title'
      className='space-y-6'
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <header className='flex flex-wrap items-start justify-between gap-3 border-b pb-4'>
        <section aria-labelledby='epda-form-title'>
          <h2 id='epda-form-title' className='text-xl font-semibold'>
            Electronic proforma disbursement account
          </h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            {linkedInquiryId
              ? `Draft linked to inquiry #${linkedInquiryId}.`
              : 'Create a port-specific EPDA draft.'}
          </p>
        </section>
        <p className='rounded-full border px-3 py-1 text-xs font-medium' role='status'>
          {locked ? 'Locked' : tariff.status === 'ready' ? 'Tariff ready' : 'Draft'}
        </p>
      </header>

      <nav aria-label='EPDA form sections' className='overflow-x-auto'>
        <ol className='flex min-w-max gap-2 text-sm'>
          <li><a className={`rounded-md border px-3 py-2 hover:bg-muted ${focusClass}`} href='#epda-customer'>1. Customer</a></li>
          <li><a className={`rounded-md border px-3 py-2 hover:bg-muted ${focusClass}`} href='#epda-port'>2. Port</a></li>
          <li><a className={`rounded-md border px-3 py-2 hover:bg-muted ${focusClass}`} href='#epda-vessel'>3. Vessel</a></li>
          <li><a className={`rounded-md border px-3 py-2 hover:bg-muted ${focusClass}`} href='#epda-cargo'>4. Cargo</a></li>
          <li><a className={`rounded-md border px-3 py-2 hover:bg-muted ${focusClass}`} href='#epda-charges'>5. Charges</a></li>
        </ol>
      </nav>

      {(tariff.status === 'error' || errors.length > 0 || statusMessage) && (
        <aside
          ref={errorSummaryRef}
          aria-live='assertive'
          aria-atomic='true'
          tabIndex={-1}
          className='rounded-lg border border-destructive/40 bg-destructive/5 p-4 outline-none focus:ring-2 focus:ring-ring'
        >
          <h3 className='font-semibold'>Form status</h3>
          {tariff.status === 'error' ? (
            <p className='mt-1 text-sm'>
              Effective tariff could not be loaded: {tariff.error}. Preview and issue are disabled.
            </p>
          ) : null}
          {statusMessage ? <p className='mt-1 text-sm'>{statusMessage}</p> : null}
          {errors.length ? (
            <ul className='mt-2 list-disc space-y-1 pl-5 text-sm'>
              {errors.map(([field, message]) => (
                <li key={field}><a className={`underline ${focusClass}`} href={`#${field}`}>{message}</a></li>
              ))}
            </ul>
          ) : null}
          {tariff.status === 'error' ? (
            <button className={`mt-3 rounded-md border bg-background px-3 py-2 text-sm font-medium ${focusClass}`} type='button' onClick={onRetryTariff}>
              Retry tariff
            </button>
          ) : null}
        </aside>
      )}

      <fieldset id='epda-customer' className={fieldsetClass} disabled={busy || locked}>
        <legend className={legendClass}>1. Customer account</legend>
        <EpdaCustomerSelect
          id='customerUserId'
          required
          value={customerUserId}
          selectedLabel={customerLabel}
          error={validationErrors.customerUserId}
          disabled={busy || locked || Boolean(linkedInquiryId)}
          suggestName={fields.toShipowner}
          onChange={onCustomerChange}
        />
      </fieldset>

      <fieldset id='epda-port' className={fieldsetClass} disabled={busy || locked}>
        <legend className={legendClass}>2. Effective port tariff</legend>
        <section className={gridClass} aria-label='Port selection'>
          <label className={labelClass} htmlFor='areaCode'>
            Port area <span aria-hidden='true'>*</span>
            <select
              className={inputClass}
              id='areaCode'
              name='areaCode'
              required
              {...requiredProps('areaCode', validationErrors.areaCode)}
              value={identity.areaCode}
              onChange={(event) => onAreaChange(event.target.value as EpdaAreaCode | '')}
            >
              <option value=''>Select an area</option>
              {AREA_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            {fieldError(validationErrors, 'areaCode')}
          </label>
          <label className={labelClass} htmlFor='portId'>
            Port of call <span aria-hidden='true'>*</span>
            <select
              className={inputClass}
              id='portId'
              name='portId'
              required
              {...requiredProps('portId', validationErrors.portId)}
              value={identity.portId ?? ''}
              disabled={!identity.areaCode || busy || locked}
              onChange={(event) => onPortChange(event.target.value ? Number(event.target.value) : null)}
            >
              <option value=''>Select a port</option>
              {ports.map((port) => <option key={port.id} value={port.id}>{port.portOfCall || port.name}</option>)}
            </select>
            {fieldError(validationErrors, 'portId')}
          </label>
          <dl className='rounded-md bg-muted/40 p-3 text-sm'>
            <dt className='text-muted-foreground'>Worksheet</dt>
            <dd className='font-semibold'>{identity.quoteForm}</dd>
            <dt className='mt-2 text-muted-foreground'>Effective source</dt>
            <dd className='font-semibold'>{tariff.status === 'loading' ? 'Loading port override…' : identity.portOfCall || 'Not selected'}</dd>
          </dl>
        </section>
      </fieldset>

      <fieldset id='epda-vessel' className={fieldsetClass} disabled={busy || locked}>
        <legend className={legendClass}>3. Document and vessel</legend>
        <section className={gridClass} aria-label='Vessel particulars'>
          <label className={labelClass} htmlFor='formCreatedDate'>Document date
            <input className={inputClass} id='formCreatedDate' name='formCreatedDate' type='date' value={fields.formCreatedDate} onChange={(e) => onFieldChange('formCreatedDate', e.target.value)} />
          </label>
          <label className={labelClass} htmlFor='toShipowner'>To shipowner <span aria-hidden='true'>*</span>
            <input className={inputClass} id='toShipowner' name='toShipowner' autoComplete='organization' required value={fields.toShipowner} {...requiredProps('toShipowner', validationErrors.toShipowner)} onChange={(e) => onFieldChange('toShipowner', e.target.value)} />
            {fieldError(validationErrors, 'toShipowner')}
          </label>
          <label className={labelClass} htmlFor='shipownerNationality'>Shipowner nationality
            <select className={inputClass} id='shipownerNationality' name='shipownerNationality' value={fields.shipownerNationality} onChange={(e) => onFieldChange('shipownerNationality', e.target.value)}>
              {SHIPOWNER_NATIONALITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className={labelClass} htmlFor='mv'>M/V <span aria-hidden='true'>*</span>
            <input className={inputClass} id='mv' name='mv' autoComplete='off' required value={fields.mv} {...requiredProps('mv', validationErrors.mv)} onChange={(e) => onFieldChange('mv', e.target.value)} />
            {fieldError(validationErrors, 'mv')}
          </label>
          {(['dwt', 'grt', 'loa'] as const).map((field) => (
            <label className={labelClass} htmlFor={field} key={field}>{field.toUpperCase()} <span aria-hidden='true'>*</span>
              <input className={inputClass} id={field} name={field} type='number' min='0' step='any' inputMode='decimal' required value={fields[field]} {...requiredProps(field, validationErrors[field])} onChange={(e) => onFieldChange(field, e.target.value)} />
              {fieldError(validationErrors, field)}
            </label>
          ))}
          <label className={labelClass} htmlFor='eta'>ETA
            <input className={inputClass} id='eta' name='eta' type='datetime-local' value={fields.eta} onChange={(e) => onFieldChange('eta', e.target.value)} />
          </label>
          <label className={labelClass} htmlFor='shipType'>Ship type
            <select className={inputClass} id='shipType' name='shipType' value={fields.shipType} onChange={(e) => onFieldChange('shipType', e.target.value)}>
              {SHIP_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </section>
      </fieldset>

      <fieldset id='epda-cargo' className={fieldsetClass} disabled={busy || locked}>
        <legend className={legendClass}>4. Cargo and call</legend>
        <section className={gridClass} aria-label='Cargo and call details'>
          <label className={labelClass} htmlFor='cargoType'>Cargo type <span aria-hidden='true'>*</span>
            <select className={inputClass} id='cargoType' name='cargoType' required value={fields.cargoType} {...requiredProps('cargoType', validationErrors.cargoType)} onChange={(e) => onFieldChange('cargoType', e.target.value)}>
              <option value=''>Select cargo type</option>
              {SHIPPING_AGENCY_CARGO_TYPES.map((option) => <option key={option.code} value={option.code}>{option.displayLabel}</option>)}
            </select>
            {fieldError(validationErrors, 'cargoType')}
          </label>
          <label className={labelClass} htmlFor='cargoName'>Cargo name
            <select className={inputClass} id='cargoName' name='cargoName' required={cargoNames.length > 0} value={fields.cargoName} {...requiredProps('cargoName', validationErrors.cargoName)} disabled={!fields.cargoType || cargoNames.length === 0 || busy || locked} onChange={(e) => onFieldChange('cargoName', e.target.value)}>
              <option value=''>Select cargo</option>
              {cargoNames.map((item) => <option key={item.id} value={item.name}>{item.displayName || item.name}</option>)}
            </select>
            {fieldError(validationErrors, 'cargoName')}
          </label>
          <label className={labelClass} htmlFor='cargoQty'>Quantity (MT) <span aria-hidden='true'>*</span>
            <input className={inputClass} id='cargoQty' name='cargoQty' type='number' min='0' step='any' inputMode='decimal' required value={fields.cargoQty} {...requiredProps('cargoQty', validationErrors.cargoQty)} onChange={(e) => onFieldChange('cargoQty', e.target.value)} />
            {fieldError(validationErrors, 'cargoQty')}
          </label>
          <label className={labelClass} htmlFor='purposeOfCalling'>Purpose of calling <span aria-hidden='true'>*</span>
            <select className={inputClass} id='purposeOfCalling' name='purposeOfCalling' required value={fields.purposeOfCalling} {...requiredProps('purposeOfCalling', validationErrors.purposeOfCalling)} onChange={(e) => onFieldChange('purposeOfCalling', e.target.value)}>
              <option value=''>Select purpose</option>
              {PURPOSE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            {fieldError(validationErrors, 'purposeOfCalling')}
          </label>
          <label className={labelClass} htmlFor='dischargeLoadingLocation'>Working location <span aria-hidden='true'>*</span>
            <select className={inputClass} id='dischargeLoadingLocation' name='dischargeLoadingLocation' required value={fields.dischargeLoadingLocation} {...requiredProps('dischargeLoadingLocation', validationErrors.dischargeLoadingLocation)} onChange={(e) => onFieldChange('dischargeLoadingLocation', e.target.value)}>
              <option value=''>Select location</option><option value='Berth'>Berth</option><option value='Anchorage'>Anchorage</option>
            </select>
            {fieldError(validationErrors, 'dischargeLoadingLocation')}
          </label>
          <label className={labelClass} htmlFor='frtTaxType'>Freight tax mode
            <select className={inputClass} id='frtTaxType' name='frtTaxType' value={fields.frtTaxType} onChange={(e) => onFieldChange('frtTaxType', e.target.value)}>
              <option value=''>Select tax mode</option>
              {FRT_TAX_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className={labelClass} htmlFor='oceanFrtRateUsdPerMt'>Ocean freight (USD/MT)
            <input className={inputClass} id='oceanFrtRateUsdPerMt' name='oceanFrtRateUsdPerMt' type='number' min='0' step='any' inputMode='decimal' value={fields.oceanFrtRateUsdPerMt} onChange={(e) => onFieldChange('oceanFrtRateUsdPerMt', e.target.value)} />
          </label>
        </section>
      </fieldset>

      <fieldset id='epda-charges' className={fieldsetClass} disabled={busy || locked}>
        <legend className={legendClass}>5. Operational charges</legend>
        <section className={gridClass} aria-label='Time and service charges'>
          {(['berthHours', 'anchorageHours', variantConfig.pilotageMode === 'THREE_LEG' ? 'pilotageThirdMiles' : 'qnPilotageMiles'] as const).map((field) => (
            <label className={labelClass} htmlFor={field} key={field}>{field.replace(/([A-Z])/g, ' $1')}
              <input className={inputClass} id={field} name={field} type='number' min='0' step='any' inputMode='decimal' value={fields[field]} onChange={(e) => onFieldChange(field, e.target.value)} />
            </label>
          ))}
          {(['garbageUsdRate', 'garbageCbmAmount', 'transportLs', 'boatHireQuarantineAmount', 'boatHireAmount', 'tallyFeeAmount', 'tugAssistanceAmount'] as const).map((field) => (
            <label className={labelClass} htmlFor={field} key={field}>{field.replace(/([A-Z])/g, ' $1')}
              <input className={inputClass} id={field} name={field} type='number' min='0' step='any' inputMode='decimal' value={fields[field]} onChange={(e) => onFieldChange(field, e.target.value)} />
            </label>
          ))}
          <label className={labelClass} htmlFor='quarantineCargoMode'>Cargo quarantine
            <select className={inputClass} id='quarantineCargoMode' name='quarantineCargoMode' value={fields.quarantineCargoMode} onChange={(e) => onFieldChange('quarantineCargoMode', e.target.value)}>
              {QUARANTINE_CARGO_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className={labelClass} htmlFor='agencyFeeMode'>Agency fee
            <select className={inputClass} id='agencyFeeMode' name='agencyFeeMode' value={fields.agencyFeeMode} onChange={(e) => onFieldChange('agencyFeeMode', e.target.value)}>
              {AGENCY_FEE_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className={labelClass} htmlFor='agencyDiscountPercent'>Agency discount (%)
            <input className={inputClass} id='agencyDiscountPercent' name='agencyDiscountPercent' type='number' min='0' max='100' step='any' inputMode='decimal' value={fields.agencyDiscountPercent} onChange={(e) => onFieldChange('agencyDiscountPercent', e.target.value)} />
          </label>
          <label className={labelClass} htmlFor='agencyLumpsumAmount'>Agency lumpsum (USD)
            <input className={inputClass} id='agencyLumpsumAmount' name='agencyLumpsumAmount' type='number' min='0' step='any' inputMode='decimal' value={fields.agencyLumpsumAmount} onChange={(e) => onFieldChange('agencyLumpsumAmount', e.target.value)} />
          </label>
          <label className={labelClass} htmlFor='otherExpenseType'>Other expense
            <select className={inputClass} id='otherExpenseType' name='otherExpenseType' value={fields.otherExpenseType} onChange={(e) => onFieldChange('otherExpenseType', e.target.value)}>
              <option value=''>None</option>{OTHER_EXPENSE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className={labelClass} htmlFor='shorecraneHireUsdPerMt'>Shorecrane (USD/MT)
            <input className={inputClass} id='shorecraneHireUsdPerMt' name='shorecraneHireUsdPerMt' type='number' min='0' step='any' inputMode='decimal' disabled={fields.otherExpenseType !== 'SHORECRANE_HIRE' || busy || locked} value={fields.shorecraneHireUsdPerMt} onChange={(e) => onFieldChange('shorecraneHireUsdPerMt', e.target.value)} />
          </label>
        </section>
        <button className={`mt-4 rounded-md border px-3 py-2 text-sm font-medium ${focusClass}`} type='button' disabled={!state.tariff.values} onClick={onResetTariff}>Reset tariff-derived fields</button>
      </fieldset>

      <article aria-labelledby='epda-summary-title' className='rounded-lg border bg-muted/20 p-4 sm:p-6'>
        <header><h2 id='epda-summary-title' className='text-lg font-semibold'>Submission summary</h2></header>
        <dl className='mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-4'>
          <dt className='text-muted-foreground'>Port</dt><dd className='font-medium'>{identity.portOfCall || 'Not selected'}</dd>
          <dt className='text-muted-foreground'>Port ID</dt><dd className='font-medium'>{identity.portId ?? '—'}</dd>
          <dt className='text-muted-foreground'>Worksheet</dt><dd className='font-medium'>{identity.quoteForm}</dd>
          <dt className='text-muted-foreground'>Berth hours</dt><dd className='font-medium'>{fields.berthHours || '—'}</dd>
        </dl>
      </article>

      <footer className='flex flex-wrap items-center justify-end gap-2 border-t pt-4'>
        <button className={`rounded-md border px-4 py-2 text-sm font-medium ${focusClass}`} type='button' disabled={busy || locked} onClick={onReset}>Reset form</button>
        <button className={`rounded-md border px-4 py-2 text-sm font-medium ${focusClass}`} type='button' disabled={quoteActionsDisabled} onClick={onPreview}>Preview</button>
        <button className={`rounded-md border px-4 py-2 text-sm font-medium ${focusClass}`} type='button' disabled={quoteActionsDisabled || !linkedInquiryId} onClick={onIssue}>Issue</button>
        <button className={`rounded-md border px-4 py-2 text-sm font-medium ${focusClass}`} type='button' disabled={mutationDisabled || !linkedInquiryId} onClick={onLock}>Lock</button>
        <button className={`rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60 ${focusClass}`} type='submit' disabled={busy || locked}>Save draft</button>
      </footer>
    </form>
  )
}
