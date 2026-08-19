'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { isAdminRole } from '@/config/section-catalog'
import type { EpdaParameterValues } from '@/modules/inquiries/services/epdaParametersService'
import type { ShippingAgencyAdminInquiry } from '@/modules/inquiries/types/shippingAgencyEpda'
import { PdfPreviewDialog } from '@/shared/components/PdfPreviewDialog'
import { AdminSection } from '@/shared/components/layout/dashboard/admin'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { buildDashboardUrl } from '@/shared/utils/dashboardNavigation'
import { toast } from '@/shared/utils/toast'
import { ArrowLeft } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCurrentUser } from '@/hooks/use-current-user'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { EpdaEditableWorksheet } from '@/features/admin/components/invoice/epda/EpdaEditableWorksheet'
import { EpdaEditorActions } from '@/features/admin/components/invoice/epda/EpdaEditorActions'
import { EpdaReadOnlyWorksheet } from '@/features/admin/components/invoice/epda/EpdaReadOnlyWorksheet'
import {
  EPDA_SECTIONS,
  type EpdaSectionId,
} from '@/features/admin/components/invoice/epdaFormLayout.config'
import { EpdaParameterDiffDialog } from '@/features/admin/sections/epda-editor/EpdaParameterDiffDialog'
import { findFirstMissingEpdaSection } from '@/features/admin/sections/epda-editor/controller/epdaEditorRules'
import { useEpdaEditorFormModel } from '@/features/admin/sections/epda-editor/controller/useEpdaEditorFormModel'
import { useEpdaEditorFormState } from '@/features/admin/sections/epda-editor/controller/useEpdaEditorFormState'
import { useEpdaInquiryHydration } from '@/features/admin/sections/epda-editor/controller/useEpdaInquiryHydration'
import { useEpdaParameterApplySkip } from '@/features/admin/sections/epda-editor/controller/useEpdaParameterApplySkip'
import { useEpdaPersistence } from '@/features/admin/sections/epda-editor/controller/useEpdaPersistence'
import { useEpdaPreview } from '@/features/admin/sections/epda-editor/controller/useEpdaPreview'
import { useEpdaReferenceData } from '@/features/admin/sections/epda-editor/controller/useEpdaReferenceData'

function useLatest<T>(value: T) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref
}

/** EPDA change-history panel (full field audit). */
const CUSTOMER_FIELD_HISTORY_ENABLED = true

export type EpdaEditorFlow = 'create' | 'inquiry-detail'

export interface EpdaEditorScreenProps {
  /** When set, loads inquiry EPDA from API and saves drafts to this record. */
  inquiryId?: number
  /** `create` = Port Charge menu; `inquiry-detail` = opened from shipping agency inquiries. */
  flow?: EpdaEditorFlow
  /** View-only mode (inquiry detail dialog). */
  readOnly?: boolean
  /** Render without AdminSection chrome (inside a dialog). */
  embedded?: boolean
}

export function EpdaEditorScreen({
  inquiryId: inquiryIdProp,
  flow: flowProp,
  readOnly = false,
  embedded = false,
}: EpdaEditorScreenProps = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const currentUser = useCurrentUser()
  const canViewEditHistory =
    CUSTOMER_FIELD_HISTORY_ENABLED && isAdminRole(currentUser?.role)
  const flow: EpdaEditorFlow =
    flowProp ??
    (searchParams.get('section') === 'shipping-agency-inquiry-detail'
      ? 'inquiry-detail'
      : 'create')
  const isInquiryDetailFlow = flow === 'inquiry-detail'
  const inquiryIdFromQuery = useMemo(() => {
    const raw = searchParams.get('inquiryId')
    if (!raw) return undefined
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
  }, [searchParams])

  const resolvedInquiryId = isInquiryDetailFlow
    ? (inquiryIdProp ?? inquiryIdFromQuery)
    : inquiryIdProp

  const formNavRef = useRef<HTMLDivElement | null>(null)
  const autoPreviewTriggeredRef = useRef(false)
  const [createdInquiryId, setCreatedInquiryId] = useState<number | null>(null)
  const linkedInquiryId = resolvedInquiryId ?? createdInquiryId
  const creatorLabel =
    currentUser?.fullName ||
    currentUser?.email ||
    (currentUser?.id ? `User #${currentUser.id}` : null)
  /** When set, EPDA is frozen — quote uses snapshot params and Edit is hidden. */
  const [epdaLockedAt, setEpdaLockedAt] = useState<string | null>(null)
  const [workingParams, setWorkingParams] =
    useState<EpdaParameterValues | null>(null)
  const [workingParamsReady, setWorkingParamsReady] = useState(false)
  const [workingParamsInquiryId, setWorkingParamsInquiryId] =
    useState(linkedInquiryId)
  if (workingParamsInquiryId !== linkedInquiryId) {
    setWorkingParamsInquiryId(linkedInquiryId)
    if (!linkedInquiryId) {
      setWorkingParams(null)
      setWorkingParamsReady(true)
    } else {
      setWorkingParamsReady(false)
    }
  }
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [viewInquiryMeta, setViewInquiryMeta] =
    useState<ShippingAgencyAdminInquiry | null>(null)
  // Confirm dialog when saving a draft that still has empty required fields.
  const [incompleteSaveDialogOpen, setIncompleteSaveDialogOpen] =
    useState(false)
  const [fieldChangeHistoryKey, setFieldChangeHistoryKey] = useState(0)
  const formState = useEpdaEditorFormState()
  const { fields, setters: formSetters } = formState
  const {
    commodityTypeId,
    cargoType,
    cargoName,
    port,
    dischargeLoadingLocation,
    berthHours,
    anchorageHours,
    pilotageThirdMiles,
    qnPilotageMiles,
    garbageUsdRate,
  } = fields
  const {
    setCargoName,
    setGarbageUsdRate,
    setPort,
    setBerthHours,
    setAnchorageHours,
    setTallyFeeAmount,
  } = formSetters
  const [activeSection, setActiveSection] =
    useState<EpdaSectionId>('epda-general')
  // Mobile only: collapse the Port area / Port of call pickers into a one-line
  // summary once both are chosen, so the pinned header stays compact.
  const [portPickerCollapsed, setPortPickerCollapsed] = useState(false)
  const referenceData = useEpdaReferenceData({
    commodityTypeId,
    cargoType,
    cargoName,
    port,
    dischargeLoadingLocation,
    linkedInquiryId,
    bindings: {
      setCommodityTypeId: formSetters.setCommodityTypeId,
      setCargoType: formSetters.setCargoType,
      setCargoName,
      clearTallyFee: () => setTallyFeeAmount(''),
      setPort,
      applyNewParameterDefaults: (params) => {
        // QN never stays on Anchorage (see setDischargeLoadingLocation), so buoy
        // garbage only applies for HCM-layout worksheets.
        const garbageRate =
          dischargeLoadingLocation === 'Anchorage'
            ? params.garbage.atBuoyUsd
            : params.garbage.atBerthUsd
        setGarbageUsdRate(String(garbageRate))
        setBerthHours(String(params.hours.berthHours))
        setAnchorageHours(String(params.hours.anchorageHours))
        // PS→port miles stay on the EPDA form — not seeded from Parameters.
      },
    },
  })
  const {
    cargoTypeOptions,
    cargoTypeCatalogRef,
    cargoCatalogRef,
    isLoadingCargoCatalog,
    pendingInquiryCargo,
    pendingInquiryCargoRef,
    pendingPortOfCallRef,
    portOptions: portsByArea,
    selectedPortId,
    setSelectedPortId,
    isLoadingPorts,
    selectedArea,
    setSelectedArea,
    setPorts,
    setLoadedInquiryQuoteForm,
    effectiveParams,
    setEffectiveParams,
    frozenParams,
    setFrozenParams,
    setPendingInquiryCargo,
    quoteForm,
    cargoNameDisabled,
    cargoNameOptions: filteredCargoNames,
  } = referenceData

  const {
    buildQuoteInput: buildQuoteParamsInput,
    missingRequiredFields,
    formValues,
    formHandlers,
    formOptions,
    formComputed,
    getRequiredState,
  } = useEpdaEditorFormModel({
    fields,
    setters: formSetters,
    showValidationErrors,
    quoteForm,
    effectiveParams,
    selectedPortId,
    cargoTypeOptions,
    filteredCargoNames,
    cargoNameDisabled,
    isLoadingCargoCatalog,
  })

  // On a failed submit, jump the rail to the first section that has a missing field.
  const focusFirstMissingSection = () => {
    const target = findFirstMissingEpdaSection(missingRequiredFields)
    if (target) setActiveSection(target)
  }

  const isEpdaLocked = Boolean(epdaLockedAt)
  /** Locked EPDAs are always read-only, even if the URL has mode=edit. */
  const isFormReadOnly = readOnly || isEpdaLocked

  const isLoadingInquiry = useEpdaInquiryHydration({
    inquiryId: linkedInquiryId,
    reloadKey: readOnly,
    autoPreviewTriggeredRef,
    cargoCatalogRef,
    cargoTypeCatalogRef,
    pendingCargoRef: pendingInquiryCargoRef,
    pendingPortRef: pendingPortOfCallRef,
    bindings: {
      setInquiry: setViewInquiryMeta,
      setLockedAt: setEpdaLockedAt,
      setFrozenParams,
      setEffectiveParams,
      setWorkingParams: (params) => {
        setWorkingParams(params)
        setWorkingParamsReady(true)
      },
      setQuoteForm: setLoadedInquiryQuoteForm,
      setCommodityTypeId: formSetters.setCommodityTypeId,
      setCargoType: formSetters.setCargoType,
      setCargoName,
      clearTallyFee: () => setTallyFeeAmount(''),
      setPendingCargo: setPendingInquiryCargo,
      applyPortSelection: (selection) => {
        setSelectedPortId(selection.portId)
        if (selection.area) {
          setSelectedArea(selection.area)
          setPorts(selection.ports)
        } else {
          setPort(selection.portOfCall)
          pendingPortOfCallRef.current = null
        }
      },
      formSetters,
    },
  })

  const {
    paramDiffDialogOpen,
    paramDiffRows,
    isParamDecisionPending,
    applyLatestParams,
    skipLatestParams,
  } = useEpdaParameterApplySkip({
    linkedInquiryId,
    isLocked: isEpdaLocked,
    isHydrating: isLoadingInquiry,
    selectedArea,
    selectedPortId,
    isLoadingPorts,
    workingParams,
    workingParamsReady,
    effectiveParams,
    frozenParams,
    hourFields: {
      berthHours,
      anchorageHours,
      pilotageThirdMiles,
      qnPilotageMiles,
      garbageUsdRate,
      dischargeLoadingLocation,
    },
    hourSetters: {
      setBerthHours,
      setAnchorageHours,
      setGarbageUsdRate,
    },
    setEffectiveParams,
    setFrozenParams,
    setWorkingParams,
  })

  const persistence = useEpdaPersistence({
    linkedInquiryId,
    onCreated: setCreatedInquiryId,
    onHistoryChanged: () => setFieldChangeHistoryKey((key) => key + 1),
  })
  const preview = useEpdaPreview({
    quoteForm,
    linkedInquiryId,
    selectedArea,
    selectedPortId,
    isLocked: isEpdaLocked,
    frozenParams,
    effectiveParams,
    buildQuoteInput: buildQuoteParamsInput,
    onEffectiveParamsChange: setEffectiveParams,
  })
  const { isSavingDraft } = persistence
  const isLoading = preview.isLoading

  // Order creator panel is intentionally hidden on create/edit EPDA.
  const showCreatorSection = false
  const showSaveDraftButton = !isFormReadOnly

  // Ordered section ids (matches the rail), used by the mobile Next / Done button.
  const orderedSectionIds = EPDA_SECTIONS.map(
    (section) => section.id
  ) as EpdaSectionId[]
  const activeSectionIndex = orderedSectionIds.indexOf(activeSection)
  const isLastSection = activeSectionIndex === orderedSectionIds.length - 1
  const goToNextSection = () => {
    const next = orderedSectionIds[activeSectionIndex + 1]
    if (next) {
      setActiveSection(next)
      // Bring the new section to the top, just under the pinned mobile header.
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const isFormBusy =
    isLoading ||
    isLoadingCargoCatalog ||
    isLoadingPorts ||
    isSavingDraft ||
    isLoadingInquiry

  const handleSaveDraft = async () => {
    if (isParamDecisionPending) {
      toast.error(
        'Choose Apply latest or Skip on the tariff changes before saving.'
      )
      return
    }
    setShowValidationErrors(true)
    const isComplete = missingRequiredFields.length === 0
    if (!isComplete) {
      // Incomplete drafts are allowed — they save as "Processing". Warn first.
      focusFirstMissingSection()
      setIncompleteSaveDialogOpen(true)
      return
    }
    await proceedSaveDraft(true)
  }

  // Continue the save flow after completeness is decided (complete = all required filled).
  const proceedSaveDraft = async (isComplete: boolean) => {
    await persistence.saveDraft(buildQuoteParamsInput(), isComplete)
  }

  const handleApplyLatestAndSave = async () => {
    const applied = applyLatestParams()
    if (!applied) return

    // Prevent the preview=1 auto-open effect from generating a second PDF.
    autoPreviewTriggeredRef.current = true

    const base = buildQuoteParamsInput()
    const { hourFields, params } = applied
    const quoteInput = {
      ...base,
      params,
      berthHours: hourFields.berthHours,
      anchorageHours: hourFields.anchorageHours,
      pilotageThirdMiles: hourFields.pilotageThirdMiles,
      qnPilotageMiles: hourFields.qnPilotageMiles,
      garbageUsdRate: hourFields.garbageUsdRate || base.garbageUsdRate,
      buoyDueHours:
        base.buoyDueHours !== '' ? hourFields.berthHours : base.buoyDueHours,
    }

    await persistence.saveDraft(
      quoteInput,
      missingRequiredFields.length === 0,
      {
        successMessage: 'Latest tariffs applied and saved.',
      }
    )
    // Apply to PDF only after the user chose Latest (and save succeeded).
    if (missingRequiredFields.length === 0) {
      await preview.generate(params)
    }
  }

  const handlePreview = async () => {
    if (isParamDecisionPending) {
      toast.error(
        'Choose Apply latest or Skip on the tariff changes before previewing.'
      )
      return
    }
    setShowValidationErrors(true)
    if (missingRequiredFields.length > 0) {
      focusFirstMissingSection()
      toast.error('Complete all required fields before previewing the EPDA.')
      return
    }

    await preview.generate()
  }

  const handlePreviewRef = useLatest(handlePreview)

  // Auto-open the EPDA quote preview when arriving with `preview=1`
  // (set by "view detail" for Completed/Quoted inquiries). We're already in the
  // edit screen, so just pop the preview once all data has loaded.
  useEffect(() => {
    if (!isInquiryDetailFlow) return
    if (searchParams.get('preview') !== '1') return
    if (autoPreviewTriggeredRef.current) return
    if (
      isLoadingInquiry ||
      isLoadingCargoCatalog ||
      pendingInquiryCargo ||
      !linkedInquiryId
    )
      return
    // Wait for Apply/Skip when tariffs changed — do not open PDF with stale/latest silently.
    if (isParamDecisionPending || paramDiffDialogOpen) return
    // Don't burn the trigger before the form is fully populated — cargo type/name
    // resolve a tick after loading flags clear, so wait until nothing is missing.
    if (missingRequiredFields.length > 0) return

    const animationFrame = window.requestAnimationFrame(() => {
      autoPreviewTriggeredRef.current = true
      void handlePreviewRef.current()
    })
    return () => window.cancelAnimationFrame(animationFrame)
  }, [
    isInquiryDetailFlow,
    searchParams,
    isLoadingInquiry,
    isLoadingCargoCatalog,
    pendingInquiryCargo,
    linkedInquiryId,
    missingRequiredFields.length,
    isParamDecisionPending,
    paramDiffDialogOpen,
    handlePreviewRef,
  ])

  const handleReset = () => {
    setShowValidationErrors(false)
    referenceData.reset()
    setPortPickerCollapsed(false)
    setViewInquiryMeta(null)
    formState.reset(quoteForm)
    preview.reset()
    setCreatedInquiryId(null)
    setEpdaLockedAt(null)
    setFrozenParams(null)
    setWorkingParams(null)
    setWorkingParamsReady(true)
  }

  const handleFormEnterNavigation = (
    event: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return

    const target = event.target as HTMLElement | null
    if (
      !(target instanceof HTMLInputElement) ||
      target.disabled ||
      target.readOnly
    )
      return

    const container = formNavRef.current
    if (!container) return

    const focusableFields = Array.from(
      container.querySelectorAll<HTMLElement>(
        "input:not([type='hidden']):not([disabled]):not([readonly]), button#eta:not([disabled]), button[role='combobox']:not([disabled])"
      )
    )

    const currentIndex = focusableFields.indexOf(target)
    if (currentIndex < 0) return

    const nextField = focusableFields[currentIndex + 1]
    if (!nextField) return

    event.preventDefault()
    nextField.focus()
  }

  const editorActions = (
    <EpdaEditorActions
      inquiryId={linkedInquiryId}
      canViewEditHistory={canViewEditHistory}
      historyRefreshKey={fieldChangeHistoryKey}
      isBusy={isFormBusy}
      isSavingDraft={isSavingDraft}
      isLoadingPreview={isLoading}
      isLocked={isEpdaLocked}
      showSaveDraft={showSaveDraftButton}
      onReset={handleReset}
      onSaveDraft={() => void handleSaveDraft()}
      onPreview={() => void handlePreview()}
    />
  )

  const backToInquiries = isInquiryDetailFlow ? (
    <Button
      type='button'
      variant='ghost'
      size='sm'
      className='mb-2 -ml-2 h-auto min-h-9 max-w-full gap-2 py-2 text-left whitespace-normal text-muted-foreground hover:text-foreground sm:whitespace-nowrap'
      onClick={() =>
        router.push(buildDashboardUrl(pathname, 'shipping-agency-inquiries'))
      }
    >
      <ArrowLeft className='h-4 w-4 shrink-0' />
      <span className='hidden sm:inline'>
        Back to Shipping Agency Inquiries
      </span>
      <span className='sm:hidden'>Back to inquiries</span>
    </Button>
  ) : null

  const epdaWorksheet =
    isFormReadOnly && (isInquiryDetailFlow || isEpdaLocked) ? (
      <EpdaReadOnlyWorksheet
        backNavigation={backToInquiries}
        inquiryId={linkedInquiryId}
        canViewEditHistory={canViewEditHistory}
        historyRefreshKey={fieldChangeHistoryKey}
        isLocked={isEpdaLocked}
        isBusy={isFormBusy}
        isLoadingPreview={isLoading}
        isLoadingInquiry={isLoadingInquiry}
        isLoadingCargoCatalog={isLoadingCargoCatalog}
        onPreview={() => void handlePreview()}
      />
    ) : (
      <EpdaEditableWorksheet
        variant={quoteForm}
        embedded={embedded}
        isInquiryDetailFlow={isInquiryDetailFlow}
        isLoadingInquiry={isLoadingInquiry}
        linkedInquiryId={linkedInquiryId}
        creatorLabel={creatorLabel}
        actions={editorActions}
        backNavigation={backToInquiries}
        area={selectedArea}
        port={port}
        ports={portsByArea}
        portPickerCollapsed={portPickerCollapsed}
        isLoadingPorts={isLoadingPorts}
        onAreaChange={(value) => {
          setPort('')
          setPortPickerCollapsed(false)
          referenceData.selectArea(value)
          // Area 2 (QN) has no buoy/anchorage — keep discharge at berth.
          if (value === '2') {
            formHandlers.setDischargeLoadingLocation('Berth')
          }
        }}
        onPortChange={(value, portId) => {
          setPort(value)
          setSelectedPortId(portId)
          setPortPickerCollapsed(true)
        }}
        onPortPickerCollapsedChange={setPortPickerCollapsed}
        activeSection={activeSection}
        onActiveSectionChange={setActiveSection}
        showCreatorSection={showCreatorSection}
        inquiry={viewInquiryMeta}
        formNavigationRef={formNavRef}
        onFormKeyDown={handleFormEnterNavigation}
        isLoadingCargoCatalog={isLoadingCargoCatalog}
        hasCargoTypeOptions={cargoTypeOptions.length > 0}
        formValues={formValues}
        formHandlers={formHandlers}
        formOptions={formOptions}
        formComputed={formComputed}
        params={effectiveParams}
        getRequiredState={getRequiredState}
        isLastSection={isLastSection}
        onNextSection={goToNextSection}
        isReadOnly={isFormReadOnly}
        showValidationErrors={showValidationErrors}
        missingRequiredFieldLabels={missingRequiredFields.map(
          (field) => field.label
        )}
      />
    )

  const handleEditFromPreview =
    isInquiryDetailFlow && isFormReadOnly && linkedInquiryId && !isEpdaLocked
      ? () => {
          preview.setOpen(false)
          const params = new URLSearchParams(searchParams.toString())
          params.set('mode', 'edit')
          router.push(`${pathname}?${params.toString()}`)
        }
      : undefined

  const pdfPreview = (
    <PdfPreviewDialog
      open={preview.isOpen}
      onOpenChange={preview.setOpen}
      html={preview.html}
      fileName={preview.fileName}
      isGenerating={preview.isPdfGenerating}
      onEdit={handleEditFromPreview}
      actionMode='print'
    />
  )

  if (embedded) {
    return (
      <>
        {epdaWorksheet}
        {pdfPreview}
        <EpdaParameterDiffDialog
          open={paramDiffDialogOpen}
          rows={paramDiffRows}
          onApply={() => void handleApplyLatestAndSave()}
          onSkip={skipLatestParams}
        />
      </>
    )
  }

  return (
    <>
      <AdminSection
        description={
          isInquiryDetailFlow ? undefined : linkedInquiryId ? (
            <>
              <span className='md:hidden'>
                {t('epda.descEditShort', { id: linkedInquiryId })}
              </span>
              <span className='hidden md:inline'>
                {t('epda.descEditLong', { id: linkedInquiryId })}
              </span>
            </>
          ) : (
            t('epda.descNew')
          )
        }
      >
        {epdaWorksheet}
      </AdminSection>
      {pdfPreview}
      <AlertDialog
        open={incompleteSaveDialogOpen}
        onOpenChange={setIncompleteSaveDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('epda.incompleteSaveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('epda.incompleteSaveBody', {
                count: missingRequiredFields.length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('epda.incompleteSaveCancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIncompleteSaveDialogOpen(false)
                void proceedSaveDraft(false)
              }}
            >
              {t('epda.incompleteSaveContinue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <EpdaParameterDiffDialog
        open={paramDiffDialogOpen}
        rows={paramDiffRows}
        onApply={() => void handleApplyLatestAndSave()}
        onSkip={skipLatestParams}
      />
    </>
  )
}
