import { useEffect, useRef, useState } from 'react'
import {
  epdaParametersService,
  type EpdaParameterValues,
} from '@/modules/inquiries/services/epdaParametersService'
import type { EpdaArea } from '@/features/admin/components/invoice/epda/EpdaPortSelector'
import { createEpdaParameterLabelFns } from '@/features/admin/epda-parameters/epdaParameterLabels'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { toast } from '@/shared/utils/toast'
import {
  diffEpdaParameterValues,
  epdaParameterValuesEqual,
  type EpdaParameterDiffRow,
} from './epdaParameterDiff'

type HourFieldSnapshot = {
  berthHours: string
  anchorageHours: string
  pilotageThirdMiles: string
  qnPilotageMiles: string
  garbageUsdRate: string
  dischargeLoadingLocation: string
}

type HourFieldSetters = {
  setBerthHours: (value: string) => void
  setAnchorageHours: (value: string) => void
  setGarbageUsdRate: (value: string) => void
}

type UseEpdaParameterApplySkipOptions = {
  linkedInquiryId: number | null | undefined
  isLocked: boolean
  isHydrating: boolean
  selectedArea: EpdaArea | ''
  selectedPortId: number | null
  isLoadingPorts: boolean
  /** Soft-snapshot from DB (null when legacy draft never saved working params). */
  workingParams: EpdaParameterValues | null
  workingParamsReady: boolean
  effectiveParams: EpdaParameterValues
  frozenParams: EpdaParameterValues | null
  hourFields: HourFieldSnapshot
  hourSetters: HourFieldSetters
  setEffectiveParams: (params: EpdaParameterValues) => void
  setFrozenParams: (params: EpdaParameterValues | null) => void
  /** Pin soft-snapshot so Apply/Skip persist in session until Save draft. */
  setWorkingParams: (params: EpdaParameterValues | null) => void
}

/**
 * When reopening an unlocked EPDA, compare soft-snapshotted working params
 * against live getEffective and prompt Apply / Skip. Linked unlocked drafts
 * never silently overwrite effectiveParams with live tariffs.
 */
export function useEpdaParameterApplySkip({
  linkedInquiryId,
  isLocked,
  isHydrating,
  selectedArea,
  selectedPortId,
  isLoadingPorts,
  workingParams,
  workingParamsReady,
  effectiveParams,
  frozenParams,
  hourFields,
  hourSetters,
  setEffectiveParams,
  setFrozenParams,
  setWorkingParams,
}: UseEpdaParameterApplySkipOptions) {
  const { t } = useI18n()
  const [diffRows, setDiffRows] = useState<EpdaParameterDiffRow[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [compareToken, setCompareToken] = useState(0)
  /** Mirrors decisionRef so callers can gate Save / Preview / auto-PDF. */
  const [paramDecision, setParamDecision] = useState<
    'idle' | 'pending' | 'applied' | 'skipped'
  >('idle')
  const decisionRef = useRef<'pending' | 'applied' | 'skipped' | null>(null)
  const baselineRef = useRef<EpdaParameterValues | null>(null)
  const latestRef = useRef<EpdaParameterValues | null>(null)
  const hourFieldsRef = useRef(hourFields)
  const hourSettersRef = useRef(hourSetters)

  const setDecision = (
    value: 'pending' | 'applied' | 'skipped' | null
  ) => {
    decisionRef.current = value
    setParamDecision(value ?? 'idle')
  }

  useEffect(() => {
    hourFieldsRef.current = hourFields
  }, [hourFields])

  useEffect(() => {
    hourSettersRef.current = hourSetters
  }, [hourSetters])

  // Reset when switching inquiry / lock state.
  useEffect(() => {
    setDecision(null)
    baselineRef.current = null
    latestRef.current = null
    queueMicrotask(() => {
      setDialogOpen(false)
      setDiffRows([])
      if (linkedInquiryId && !isLocked) {
        setCompareToken((token) => token + 1)
      }
    })
  }, [linkedInquiryId, isLocked])

  // Re-compare when port/area changes on an unlocked linked draft.
  const portAreaKey = `${selectedArea}:${selectedPortId ?? ''}`
  const prevPortAreaKeyRef = useRef(portAreaKey)
  useEffect(() => {
    if (!linkedInquiryId || isLocked) {
      prevPortAreaKeyRef.current = portAreaKey
      return
    }
    if (prevPortAreaKeyRef.current === portAreaKey) return
    prevPortAreaKeyRef.current = portAreaKey
    // Current form params become the "Current" column for the new port's latest.
    baselineRef.current = effectiveParams
    setDecision('pending')
    queueMicrotask(() => {
      setFrozenParams(null)
      setDialogOpen(false)
      setCompareToken((token) => token + 1)
    })
  }, [
    portAreaKey,
    linkedInquiryId,
    isLocked,
    effectiveParams,
    setFrozenParams,
  ])

  useEffect(() => {
    if (!linkedInquiryId || isLocked || isHydrating) return
    if (!workingParamsReady) return
    if (!selectedArea || isLoadingPorts) return
    if (frozenParams && decisionRef.current === 'skipped') return

    let cancelled = false
    const run = async () => {
      try {
        const latest = await epdaParametersService.getEffective(
          selectedPortId ? undefined : selectedArea,
          selectedPortId ?? undefined
        )
        if (cancelled) return
        latestRef.current = latest

        const baseline =
          baselineRef.current ??
          workingParams ??
          // Legacy drafts without working params: seed silently to latest.
          latest

        if (!workingParams && baselineRef.current == null) {
          setDecision('applied')
          baselineRef.current = latest
          setEffectiveParams(latest)
          setFrozenParams(null)
          setDialogOpen(false)
          setDiffRows([])
          return
        }

        if (epdaParameterValuesEqual(baseline, latest)) {
          setDecision('applied')
          baselineRef.current = latest
          setEffectiveParams(latest)
          setFrozenParams(null)
          setDialogOpen(false)
          setDiffRows([])
          return
        }

        setDecision('pending')
        baselineRef.current = baseline
        // Keep showing baseline until the user chooses; do not auto-apply latest.
        setEffectiveParams(baseline)
        setFrozenParams(null)
        setDiffRows(
          diffEpdaParameterValues(
            baseline,
            latest,
            createEpdaParameterLabelFns(t)
          )
        )
        setDialogOpen(true)
      } catch {
        if (cancelled) return
        // On fetch failure keep whatever is on the form; no blocking dialog.
        setDecision('applied')
        setDialogOpen(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [
    linkedInquiryId,
    isLocked,
    isHydrating,
    workingParamsReady,
    workingParams,
    selectedArea,
    selectedPortId,
    isLoadingPorts,
    frozenParams,
    compareToken,
    setEffectiveParams,
    setFrozenParams,
    t,
  ])

  const applyLatest = (): ApplyLatestResult | null => {
    const latest = latestRef.current
    const baseline = baselineRef.current
    if (!latest) {
      toast.error('Latest tariffs are not ready. Try again.')
      return null
    }
    setDecision('applied')
    baselineRef.current = latest
    setEffectiveParams(latest)
    setWorkingParams(latest)
    setFrozenParams(null)
    setDialogOpen(false)
    setDiffRows([])

    const hourFields = baseline
      ? selectivelyApplyHourDefaults(
          hourFieldsRef.current,
          baseline,
          latest,
          hourSettersRef.current
        )
      : hourFieldsRef.current

    return { params: latest, hourFields }
  }

  const skipLatest = () => {
    const baseline = baselineRef.current
    if (!baseline) {
      toast.error('Current tariffs are not ready. Try again.')
      return
    }
    setDecision('skipped')
    setEffectiveParams(baseline)
    setWorkingParams(baseline)
    setFrozenParams(baseline)
    setDialogOpen(false)
    setDiffRows([])
  }

  return {
    paramDiffDialogOpen: dialogOpen,
    paramDiffRows: diffRows,
    /** True while diffs are open / waiting for Apply or Skip. */
    isParamDecisionPending: paramDecision === 'pending' || dialogOpen,
    applyLatestParams: applyLatest,
    skipLatestParams: skipLatest,
  }
}

export type ApplyLatestResult = {
  params: EpdaParameterValues
  hourFields: HourFieldSnapshot
}

function selectivelyApplyHourDefaults(
  fields: HourFieldSnapshot,
  previous: EpdaParameterValues,
  next: EpdaParameterValues,
  setters: HourFieldSetters
): HourFieldSnapshot {
  const previousGarbage =
    fields.dischargeLoadingLocation === 'Anchorage'
      ? previous.garbage.atBuoyUsd
      : previous.garbage.atBerthUsd
  const nextGarbage =
    fields.dischargeLoadingLocation === 'Anchorage'
      ? next.garbage.atBuoyUsd
      : next.garbage.atBerthUsd

  const nextFields: HourFieldSnapshot = { ...fields }

  if (fields.berthHours === String(previous.hours.berthHours)) {
    nextFields.berthHours = String(next.hours.berthHours)
    setters.setBerthHours(nextFields.berthHours)
  }
  if (fields.anchorageHours === String(previous.hours.anchorageHours)) {
    nextFields.anchorageHours = String(next.hours.anchorageHours)
    setters.setAnchorageHours(nextFields.anchorageHours)
  }
  if (fields.garbageUsdRate === String(previousGarbage)) {
    nextFields.garbageUsdRate = String(nextGarbage)
    setters.setGarbageUsdRate(nextFields.garbageUsdRate)
  }

  return nextFields
}
