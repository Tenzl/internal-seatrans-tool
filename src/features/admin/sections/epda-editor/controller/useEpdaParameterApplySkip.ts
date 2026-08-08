import { useEffect, useRef, useState } from 'react'
import type { EpdaParameterValues } from '@/modules/inquiries/services/epdaParametersService'
import { epdaParametersService } from '@/modules/inquiries/services/epdaParametersService'
import type { EpdaArea } from '@/features/admin/components/invoice/epda/EpdaPortSelector'
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
  setPilotageThirdMiles: (value: string) => void
  setQnPilotageMiles: (value: string) => void
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
}: UseEpdaParameterApplySkipOptions) {
  const [diffRows, setDiffRows] = useState<EpdaParameterDiffRow[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [compareToken, setCompareToken] = useState(0)
  const decisionRef = useRef<'pending' | 'applied' | 'skipped' | null>(null)
  const baselineRef = useRef<EpdaParameterValues | null>(null)
  const latestRef = useRef<EpdaParameterValues | null>(null)
  const hourFieldsRef = useRef(hourFields)
  const hourSettersRef = useRef(hourSetters)

  useEffect(() => {
    hourFieldsRef.current = hourFields
  }, [hourFields])

  useEffect(() => {
    hourSettersRef.current = hourSetters
  }, [hourSetters])

  // Reset when switching inquiry / lock state.
  useEffect(() => {
    decisionRef.current = null
    baselineRef.current = null
    latestRef.current = null
    setDialogOpen(false)
    setDiffRows([])
    if (linkedInquiryId && !isLocked) {
      setCompareToken((token) => token + 1)
    }
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
    decisionRef.current = 'pending'
    setFrozenParams(null)
    setDialogOpen(false)
    setCompareToken((token) => token + 1)
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
          decisionRef.current = 'applied'
          baselineRef.current = latest
          setEffectiveParams(latest)
          setFrozenParams(null)
          setDialogOpen(false)
          setDiffRows([])
          return
        }

        if (epdaParameterValuesEqual(baseline, latest)) {
          decisionRef.current = 'applied'
          baselineRef.current = latest
          setEffectiveParams(latest)
          setFrozenParams(null)
          setDialogOpen(false)
          setDiffRows([])
          return
        }

        decisionRef.current = 'pending'
        baselineRef.current = baseline
        // Keep showing baseline until the user chooses; do not auto-apply latest.
        setEffectiveParams(baseline)
        setFrozenParams(null)
        setDiffRows(diffEpdaParameterValues(baseline, latest))
        setDialogOpen(true)
      } catch {
        if (cancelled) return
        // On fetch failure keep whatever is on the form; no blocking dialog.
        decisionRef.current = 'applied'
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
  ])

  const applyLatest = () => {
    const latest = latestRef.current
    const baseline = baselineRef.current
    if (!latest) return
    decisionRef.current = 'applied'
    baselineRef.current = latest
    setEffectiveParams(latest)
    setFrozenParams(null)
    setDialogOpen(false)
    setDiffRows([])

    // Only overwrite hour/garbage fields that still match the previous baseline.
    if (baseline) {
      selectivelyApplyHourDefaults(
        hourFieldsRef.current,
        baseline,
        latest,
        hourSettersRef.current
      )
    }
  }

  const skipLatest = () => {
    const baseline = baselineRef.current
    if (!baseline) return
    decisionRef.current = 'skipped'
    setEffectiveParams(baseline)
    setFrozenParams(baseline)
    setDialogOpen(false)
    setDiffRows([])
  }

  return {
    paramDiffDialogOpen: dialogOpen,
    paramDiffRows: diffRows,
    applyLatestParams: applyLatest,
    skipLatestParams: skipLatest,
  }
}

function selectivelyApplyHourDefaults(
  fields: HourFieldSnapshot,
  previous: EpdaParameterValues,
  next: EpdaParameterValues,
  setters: HourFieldSetters
) {
  const previousGarbage =
    fields.dischargeLoadingLocation === 'Anchorage'
      ? previous.garbage.atBuoyUsd
      : previous.garbage.atBerthUsd
  const nextGarbage =
    fields.dischargeLoadingLocation === 'Anchorage'
      ? next.garbage.atBuoyUsd
      : next.garbage.atBerthUsd

  if (fields.berthHours === String(previous.hours.berthHours)) {
    setters.setBerthHours(String(next.hours.berthHours))
  }
  if (fields.anchorageHours === String(previous.hours.anchorageHours)) {
    setters.setAnchorageHours(String(next.hours.anchorageHours))
  }
  if (fields.pilotageThirdMiles === String(previous.hours.pilotageThirdMiles)) {
    setters.setPilotageThirdMiles(String(next.hours.pilotageThirdMiles))
  }
  if (fields.qnPilotageMiles === String(previous.hours.qnPilotageMiles)) {
    setters.setQnPilotageMiles(String(next.hours.qnPilotageMiles))
  }
  if (fields.garbageUsdRate === String(previousGarbage)) {
    setters.setGarbageUsdRate(String(nextGarbage))
  }
}
