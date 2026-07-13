'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { commodityService, type Commodity } from '@/modules/gallery/services/commodityService'
import { serviceTypeService } from '@/modules/service-types/services/serviceTypeService'
import { portService, type Port } from '@/modules/logistics/services/portService'
import { shippingAgencyEpdaService } from '@/modules/inquiries/services/shippingAgencyEpdaService'
import {
  SHIPPING_AGENCY_CARGO_TYPES,
  isTallyFeeEligibleCargoType,
  legacyCargoTypeToCode,
} from '@/modules/gallery/shippingAgencyCargoCatalog'
import { renderQuoteHtmlForVariant } from '@/modules/inquiries/components/common/quoteVariantRenderer'
import { PdfPreviewDialog } from '@/shared/components/PdfPreviewDialog'
import { toast } from '@/shared/utils/toast'
import { buildInvoiceQuoteData } from '@/features/admin/components/invoice/buildInvoiceQuoteData'
import { QUARANTINE_CARGO_OPTIONS } from '@/features/admin/components/invoice/epdaFormParameters'
import { EpdaFieldChangeHistory } from '@/features/admin/components/invoice/epda/EpdaFieldChangeHistory'
import { useEpdaTariff } from './hooks/useEpdaTariff'
import { buildCreateEpdaPayload, buildPatchEpdaPayload } from './model/epdaPayload'
import { createInitialEpdaState, epdaFormReducer } from './model/epdaFormReducer'
import { validateEpdaState, type EpdaValidationErrors } from './model/epdaFormSchema'
import {
  TARIFF_SEEDED_FIELDS,
  type EpdaAreaCode,
  type EpdaFormField,
} from './model/epdaForm.types'
import { EpdaSemanticForm } from './sections/EpdaSemanticForm'
import { lockEpdaDraft } from './workflows/lockEpdaDraft'
import { getEpdaVariantConfig } from '@/features/admin/components/invoice/epda/quoteFormFromArea'

function isFreightRateDeclared(value: string) {
  return value.toUpperCase().includes('DECLARATION')
}

export function CreateEpdaScreen() {
  const [state, dispatch] = useReducer(epdaFormReducer, undefined, createInitialEpdaState)
  const [ports, setPorts] = useState<Port[]>([])
  const [commodities, setCommodities] = useState<Commodity[]>([])
  const [customerUserId, setCustomerUserId] = useState<number | null>(null)
  const [customerLabel, setCustomerLabel] = useState<string | null>(null)
  const [linkedInquiryId, setLinkedInquiryId] = useState<number | null>(null)
  const [lockedAt, setLockedAt] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<EpdaValidationErrors>({})
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewName, setPreviewName] = useState('EPDA-preview.html')
  const [historyKey, setHistoryKey] = useState(0)
  const errorSummaryRef = useRef<HTMLElement>(null)
  const retryTariff = useEpdaTariff(state.identity, dispatch)

  useEffect(() => {
    let cancelled = false
    void serviceTypeService.getAllServiceTypes()
      .then(async (serviceTypes) => {
        const shippingAgency = serviceTypes.find((service) =>
          service.name.toUpperCase().replace(/[\s-]+/g, '_') === 'SHIPPING_AGENCY',
        )
        if (!shippingAgency) throw new Error('Shipping Agency service type was not found.')
        return commodityService.getCommoditiesByServiceType(shippingAgency.id)
      })
      .then((items) => { if (!cancelled) setCommodities(items) })
      .catch((error: unknown) => {
        if (!cancelled) setStatusMessage(error instanceof Error ? error.message : 'Cargo catalog could not be loaded.')
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!state.identity.areaCode) return
    let cancelled = false
    void portService.getPortsByArea(state.identity.areaCode)
      .then((items) => { if (!cancelled) setPorts(items) })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPorts([])
          setStatusMessage(error instanceof Error ? error.message : 'Ports could not be loaded.')
        }
      })
    return () => { cancelled = true }
  }, [state.identity.areaCode])

  const focusErrors = useCallback(() => {
    requestAnimationFrame(() => errorSummaryRef.current?.focus())
  }, [])

  const cargoNameRequired = useMemo(() => {
    const selectedType = legacyCargoTypeToCode(state.fields.cargoType)
    return Boolean(selectedType) && commodities.some(
      (item) => legacyCargoTypeToCode(item.cargoType) === selectedType,
    )
  }, [commodities, state.fields.cargoType])

  const validationFor = useCallback((mode: 'draft' | 'complete') => {
    const errors = validateEpdaState(state, { mode, cargoNameRequired })
    if (!customerUserId) errors.customerUserId = 'Select the external customer for this EPDA.'
    return errors
  }, [cargoNameRequired, customerUserId, state])

  const validate = useCallback((mode: 'draft' | 'complete' = 'complete') => {
    const errors = validationFor(mode)
    setValidationErrors(errors)
    if (Object.keys(errors).length) {
      setStatusMessage('Complete the required fields before continuing.')
      focusErrors()
      return false
    }
    if (mode === 'complete' && (state.tariff.status !== 'ready' || !state.tariff.values)) {
      setStatusMessage('Wait for the effective port tariff, or retry if loading failed.')
      focusErrors()
      return false
    }
    setStatusMessage(null)
    return true
  }, [focusErrors, state.tariff.status, state.tariff.values, validationFor])

  const confirmDiscardPortEdits = useCallback(() => {
    const hasPortEdits = TARIFF_SEEDED_FIELDS.some((field) => state.dirtyFields[field])
    if (!state.identity.portId || !hasPortEdits) return true
    return window.confirm(
      'Changing the port will discard your manually edited tariff-derived values. Continue?',
    )
  }, [state.dirtyFields, state.identity.portId])

  const filteredCargoNames = useMemo(
    () => commodities.filter(
      (item) => legacyCargoTypeToCode(item.cargoType) === legacyCargoTypeToCode(state.fields.cargoType),
    ),
    [commodities, state.fields.cargoType],
  )

  const quoteInput = useCallback(() => {
    const { fields, identity, tariff } = state
    const variantConfig = getEpdaVariantConfig(identity.quoteForm)
    if (!tariff.values) throw new Error('Effective port tariff is unavailable.')
    const tugMinLoas = tariff.values.tugTiers
      .filter((tier) => Number(tier.amount) > 0)
      .map((tier) => Number(tier.minLoa))
      .filter(Number.isFinite)
    const isLoaOverTugMax = tugMinLoas.length > 0 && Number(fields.loa) >= Math.max(...tugMinLoas)
    return {
      quoteForm: identity.quoteForm,
      formCreatedDate: fields.formCreatedDate,
      toShipowner: fields.toShipowner,
      shipownerNationality: fields.shipownerNationality,
      mv: fields.mv,
      dwt: fields.dwt,
      grt: fields.grt,
      loa: fields.loa,
      eta: fields.eta,
      cargoQty: fields.cargoQty,
      cargoName: fields.cargoName,
      cargoType: fields.cargoType,
      cargoTypeOptions: SHIPPING_AGENCY_CARGO_TYPES,
      filteredCargoNames,
      shipType: fields.shipType,
      port: identity.portOfCall,
      frtTaxType: fields.frtTaxType,
      shouldIncludeOceanFrtRate: isFreightRateDeclared(fields.frtTaxType),
      oceanFrtRateUsdPerMt: fields.oceanFrtRateUsdPerMt,
      garbageUsdRate: fields.garbageUsdRate,
      garbageCbmAmount: fields.garbageCbmAmount,
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
      isTallyFeeEligible: isTallyFeeEligibleCargoType(fields.cargoType),
      tallyFeeAmount: fields.tallyFeeAmount,
      isLoaOverTugMax,
      tugAssistanceAmount: fields.tugAssistanceAmount,
      otherExpenseType: fields.otherExpenseType,
      shorecraneHireUsdPerMt: fields.shorecraneHireUsdPerMt,
      berthHours: fields.berthHours,
      buoyDueHours: variantConfig.chargeLayout === 'HCM' && fields.dischargeLoadingLocation === 'Anchorage' ? fields.berthHours : '',
      anchorageHours: fields.anchorageHours,
      qnPilotageMiles: fields.qnPilotageMiles,
      pilotageThirdMiles: fields.pilotageThirdMiles,
      params: tariff.values,
    }
  }, [filteredCargoNames, state])

  const buildQuoteData = useCallback(
    () => buildInvoiceQuoteData(quoteInput()),
    [quoteInput],
  )

  const buildSnapshot = useCallback(
    () => buildQuoteData() as unknown as Record<string, unknown>,
    [buildQuoteData],
  )

  const saveDraft = useCallback(async () => {
    if (!validate('draft')) return
    if (!customerUserId && !linkedInquiryId) {
      setStatusMessage('Your signed-in user could not be resolved. Sign in again before saving.')
      focusErrors()
      return
    }
    setBusy(true)
    try {
      const isComplete =
        Object.keys(validationFor('complete')).length === 0 &&
        state.tariff.status === 'ready' &&
        Boolean(state.tariff.values)
      if (linkedInquiryId) {
        await shippingAgencyEpdaService.updateEpda(linkedInquiryId, {
          ...buildPatchEpdaPayload(state),
          isComplete,
        })
        setHistoryKey((key) => key + 1)
        toast.success(isComplete ? 'Completed EPDA draft saved.' : 'Partial EPDA draft saved as Processing.')
      } else {
        const created = await shippingAgencyEpdaService.createInternalInquiry({
          ...buildCreateEpdaPayload(customerUserId as number, state),
          isComplete,
        })
        setLinkedInquiryId(created.id)
        toast.success(`Inquiry #${created.id} created with an EPDA draft.`)
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'The EPDA draft could not be saved.')
      focusErrors()
    } finally {
      setBusy(false)
    }
  }, [customerUserId, focusErrors, linkedInquiryId, state, validate, validationFor])

  const preview = useCallback(async () => {
    if (!validate()) return
    setBusy(true)
    setPreviewHtml(null)
    setPreviewOpen(true)
    try {
      const response = await fetch('/templates/quote.html')
      if (!response.ok) throw new Error('EPDA preview template was not found.')
      const template = await response.text()
      setPreviewHtml(renderQuoteHtmlForVariant(state.identity.quoteForm, template, buildQuoteData()))
      setPreviewName(linkedInquiryId ? `EPDA-inquiry-${linkedInquiryId}.html` : `EPDA-${state.identity.quoteForm}.html`)
    } catch (error) {
      setPreviewOpen(false)
      setStatusMessage(error instanceof Error ? error.message : 'Preview could not be generated.')
      focusErrors()
    } finally {
      setBusy(false)
    }
  }, [buildQuoteData, focusErrors, linkedInquiryId, state.identity.quoteForm, validate])

  const issue = useCallback(async () => {
    if (!linkedInquiryId || !validate()) return
    setBusy(true)
    try {
      if (!lockedAt) {
        await shippingAgencyEpdaService.updateEpda(linkedInquiryId, buildPatchEpdaPayload(state))
      }
      const saved = await shippingAgencyEpdaService.issueEpda(linkedInquiryId, buildSnapshot())
      setLockedAt(saved.epdaLockedAt ? String(saved.epdaLockedAt) : new Date().toISOString())
      setHistoryKey((key) => key + 1)
      toast.success('EPDA issued and locked for the customer.')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'EPDA could not be issued.')
      focusErrors()
    } finally {
      setBusy(false)
    }
  }, [buildSnapshot, focusErrors, linkedInquiryId, lockedAt, state, validate])

  const lock = useCallback(async () => {
    if (!linkedInquiryId || !validate()) return
    setBusy(true)
    try {
      const saved = await lockEpdaDraft(
        {
          inquiryId: linkedInquiryId,
          patch: buildPatchEpdaPayload(state),
          snapshot: buildSnapshot(),
        },
        {
          updateEpda: shippingAgencyEpdaService.updateEpda,
          lockEpda: shippingAgencyEpdaService.lockEpda,
        },
      )
      setLockedAt(saved.epdaLockedAt ? String(saved.epdaLockedAt) : new Date().toISOString())
      toast.success('EPDA tariff snapshot locked.')
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'EPDA could not be locked.')
      focusErrors()
    } finally {
      setBusy(false)
    }
  }, [buildSnapshot, focusErrors, linkedInquiryId, state, validate])

  const handleFieldChange = useCallback((field: EpdaFormField, value: string) => {
    dispatch({ type: 'change-field', field, value })
    if (field === 'cargoType') {
      dispatch({ type: 'change-field', field: 'cargoName', value: '' })
    }
    setValidationErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  return (
    <article aria-labelledby='create-epda-title' className='space-y-4'>
      <header>
        <h1 id='create-epda-title' className='text-2xl font-bold tracking-tight sm:text-3xl'>Create EPDA</h1>
        <p className='mt-1 max-w-3xl text-sm text-muted-foreground'>
          Build the estimate from the effective area and port override. Port identity remains numeric in every API request.
        </p>
      </header>
      {linkedInquiryId ? (
        <aside aria-label='EPDA record actions' className='flex justify-end'>
          <EpdaFieldChangeHistory inquiryId={linkedInquiryId} refreshKey={historyKey} />
        </aside>
      ) : null}
      <EpdaSemanticForm
        state={state}
        ports={ports}
        commodities={commodities}
        validationErrors={validationErrors as Record<string, string>}
        statusMessage={statusMessage}
        linkedInquiryId={linkedInquiryId}
        customerUserId={customerUserId}
        customerLabel={customerLabel}
        locked={Boolean(lockedAt)}
        busy={busy}
        errorSummaryRef={errorSummaryRef}
        onAreaChange={(areaCode: EpdaAreaCode | '') => {
          if (areaCode !== state.identity.areaCode && !confirmDiscardPortEdits()) return
          setPorts([])
          setStatusMessage(null)
          dispatch({
            type: 'select-area',
            areaCode,
            discardTariffEdits: areaCode !== state.identity.areaCode,
          })
          setValidationErrors({})
        }}
        onCustomerChange={(customerId, option) => {
          setCustomerUserId(customerId)
          setCustomerLabel(option?.label ?? null)
          setValidationErrors((current) => {
            const next = { ...current }
            delete next.customerUserId
            return next
          })
        }}
        onPortChange={(portId) => {
          if (!portId) {
            if (state.identity.areaCode) {
              if (!confirmDiscardPortEdits()) return
              dispatch({
                type: 'select-area',
                areaCode: state.identity.areaCode,
                discardTariffEdits: true,
              })
            }
            return
          }
          const selected = ports.find((port) => port.id === portId)
          if (!selected || !state.identity.areaCode) return
          if (selected.id !== state.identity.portId && !confirmDiscardPortEdits()) return
          dispatch({
            type: 'select-port',
            areaCode: state.identity.areaCode,
            portId: selected.id,
            portOfCall: selected.portOfCall || selected.name,
            discardTariffEdits: selected.id !== state.identity.portId,
          })
        }}
        onFieldChange={handleFieldChange}
        onRetryTariff={retryTariff}
        onResetTariff={() => dispatch({ type: 'reset-tariff-fields' })}
        onReset={() => {
          dispatch({ type: 'reset-form' })
          setLinkedInquiryId(null)
          setCustomerUserId(null)
          setCustomerLabel(null)
          setLockedAt(null)
          setValidationErrors({})
          setStatusMessage(null)
        }}
        onPreview={() => { void preview() }}
        onIssue={() => { void issue() }}
        onLock={() => { void lock() }}
        onSubmit={() => { void saveDraft() }}
      />
      <PdfPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        html={previewHtml}
        fileName={previewName}
        isGenerating={busy && previewOpen}
      />
    </article>
  )
}
