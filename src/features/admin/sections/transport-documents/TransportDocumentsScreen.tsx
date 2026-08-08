'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isAdminRole } from '@/config/section-catalog'
import { PdfPreviewDialog } from '@/shared/components/PdfPreviewDialog'
import { queryKeys } from '@/shared/config/react-query.config'
import { toast } from '@/shared/utils/toast'
import {
  FileOutput,
  Loader2,
  Lock,
  Unlock,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { subscribeToPartnerCacheResets } from '../partner-management/partnerCache'
import { adminUsersService } from '../user-management/api/adminUsersService'
import { BookingFlowChooser } from './BookingFlowChooser'
import { BookingWorkflowNav } from './BookingWorkflowNav'
import { TransportDocumentForm } from './TransportDocumentForm'
import {
  buildBookingWorkflowUrl,
  getWorkflowRecord,
  recordBelongsToBooking,
} from './bookingWorkflow'
import type {
  AnContainer,
  ArrivalNoticePayload,
  BillOfLadingPayload,
  BookingConfirmationPayload,
  CargoRow,
  DeliveryOrderPayload,
  BookingFlow,
  TransportDocumentPayloadMap,
  TransportDocumentRecord,
  TransportDocumentStatus,
  TransportDocumentType,
} from './transportDocument.types'
import { getTransportDocumentDefinition } from './transportDocumentFormConfig'
import {
  buildTransportDocumentFileName,
  getTransportDocumentCargoRows,
  getTransportDocumentContainers,
} from './transportDocumentFormRules'
import {
  applyPrefillFromPrevious,
  getPrefillSourceType,
  mapArrivalNoticeCargoFromBooking,
  prefillArrivalNoticeHeaderFromBooking,
  syncDeliveryOrderCargoFromArrivalNotice,
} from './transportDocumentPrefill'
import {
  createEmptyTransportDocuments,
  normalizeArrivalNoticePayload,
  normalizeBillOfLadingPayload,
  normalizeBookingConfirmationPayload,
  normalizeDeliveryOrderPayload,
  parseTransportDocument,
} from './transportDocumentSchemas'
import { transportDocumentService } from './transportDocumentService'
import { formatBookingPic, resolveBookingPic } from './bookingPic'

interface TransportDocumentsScreenProps {
  documentType: TransportDocumentType
}

function payloadSnapshot(
  payload: TransportDocumentPayloadMap[TransportDocumentType]
) {
  return JSON.stringify(payload)
}

export function TransportDocumentsScreen({
  documentType,
}: TransportDocumentsScreenProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const currentUser = useCurrentUser()
  const isAdmin = isAdminRole(currentUser?.role)
  const recordIdParam = searchParams.get('recordId')
  const bookingIdParam = searchParams.get('bookingId')
  const flowParam = searchParams.get('flow')
  const previewParam = searchParams.get('preview')
  const parsedRecordId = recordIdParam
    ? Number.parseInt(recordIdParam, 10)
    : null
  const validRecordId =
    parsedRecordId != null && Number.isFinite(parsedRecordId)
      ? parsedRecordId
      : null
  const parsedBookingId = bookingIdParam
    ? Number.parseInt(bookingIdParam, 10)
    : null
  const validBookingId =
    parsedBookingId != null && Number.isFinite(parsedBookingId)
      ? parsedBookingId
      : null
  const flowFromUrl: BookingFlow | null =
    flowParam === 'IMPORT' || flowParam === 'EXPORT' ? flowParam : null

  const workflowQuery = useQuery({
    queryKey: queryKeys.bookingWorkflow(validBookingId ?? 0),
    queryFn: () => transportDocumentService.workflow(validBookingId as number),
    enabled: validBookingId != null,
  })
  const workflow = workflowQuery.data ?? null
  const selectedFlow: BookingFlow | null = workflow?.flow ?? flowFromUrl
  const needsFlowSelection =
    documentType === 'booking' &&
    validRecordId == null &&
    validBookingId == null
  const canEditFlow = needsFlowSelection
  const workflowFlow = selectedFlow ?? 'EXPORT'

  // Prefetch Person In Charge options so empty dropdown open hits cache.
  useEffect(() => {
    if (documentType !== 'booking') return
    void queryClient.prefetchQuery({
      queryKey: queryKeys.picOptions(''),
      queryFn: () => adminUsersService.listPicOptions({ limit: 50 }),
      staleTime: 5 * 60 * 1000,
    })
  }, [documentType, queryClient])

  const [forms, setForms] = useState<TransportDocumentPayloadMap>(
    createEmptyTransportDocuments
  )
  const [activeRecordId, setActiveRecordId] = useState<number | null>(null)
  const [status, setStatus] = useState<TransportDocumentStatus | null>(null)
  const [lockedAt, setLockedAt] = useState<string | null>(null)
  const [isHydrating, setIsHydrating] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [recordCreator, setRecordCreator] = useState<
    TransportDocumentRecord['createdBy']
  >(null)
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    payloadSnapshot(createEmptyTransportDocuments()[documentType])
  )
  const [trackedRecordId, setTrackedRecordId] = useState(validRecordId)
  const [doCargoSyncKey, setDoCargoSyncKey] = useState<string | null>(null)
  const [bookingPicSeedApplied, setBookingPicSeedApplied] = useState(false)
  const autoPreviewDone = useRef(false)
  const autoWorkflowPrefillKey = useRef<string | null>(null)
  const isDirtyRef = useRef(false)

  // Adjust session state when URL recordId changes (avoid setState-in-effect).
  if (trackedRecordId !== validRecordId) {
    setTrackedRecordId(validRecordId)
    setDoCargoSyncKey(null)
    if (validRecordId == null) {
      setActiveRecordId(null)
      setStatus(null)
      setLockedAt(null)
      setRecordCreator(null)
      setIsHydrating(false)
      setSavedSnapshot(
        payloadSnapshot(createEmptyTransportDocuments()[documentType])
      )
    } else {
      setIsHydrating(true)
    }
  }

  /**
   * Refresh DO cargo from linked AN during render (not an effect) so load
   * alone does not mark the form dirty — existing records also patch
   * savedSnapshot cargo in the same update.
   */
  if (
    documentType === 'do' &&
    !isHydrating &&
    !(validRecordId != null && activeRecordId == null)
  ) {
    const anSource = getWorkflowRecord(workflow, 'an')
    if (anSource) {
      const key = `${validBookingId ?? 'x'}:${activeRecordId ?? 'new'}:${anSource.id}:${anSource.updatedAt}`
      if (doCargoSyncKey !== key) {
        setDoCargoSyncKey(key)
        const an = normalizeArrivalNoticePayload(anSource.payload)
        setForms((previous) => {
          const synced = syncDeliveryOrderCargoFromArrivalNotice(
            an,
            previous.do as DeliveryOrderPayload
          )
          return { ...previous, do: synced } as TransportDocumentPayloadMap
        })
        if (activeRecordId != null) {
          setSavedSnapshot((previous) => {
            try {
              const saved = JSON.parse(previous) as DeliveryOrderPayload
              return payloadSnapshot(
                syncDeliveryOrderCargoFromArrivalNotice(an, saved)
              )
            } catch {
              return previous
            }
          })
        }
      }
    }
  }

  const document = getTransportDocumentDefinition(documentType)
  const activePayload = forms[documentType]
  const activeRecord = activePayload as unknown as Record<string, unknown>
  const cargoRows = getTransportDocumentCargoRows(documentType, forms)
  const containers = getTransportDocumentContainers(documentType, forms)
  const workflowRootLockedAt = workflow?.documents.booking?.lockedAt ?? null
  const isLocked = Boolean(lockedAt || workflowRootLockedAt)
  const isDirty = useMemo(() => {
    if (isLocked) return false
    return payloadSnapshot(activePayload) !== savedSnapshot
  }, [activePayload, isLocked, savedSnapshot])

  const fileName = useMemo(
    () =>
      buildTransportDocumentFileName(documentType, forms, document.shortLabel),
    [document.shortLabel, documentType, forms]
  )

  const markSaved = useCallback(
    (payload: TransportDocumentPayloadMap[typeof documentType]) => {
      setSavedSnapshot(payloadSnapshot(payload))
    },
    []
  )

  useEffect(() => {
    isDirtyRef.current = isDirty
  }, [isDirty])

  useEffect(() => subscribeToPartnerCacheResets(queryClient), [queryClient])

  useEffect(() => {
    if (!workflowQuery.error) return
    toast.error(
      workflowQuery.error instanceof Error
        ? workflowQuery.error.message
        : 'Failed to load booking workflow'
    )
  }, [workflowQuery.error])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const applyRecord = useCallback(
    (record: TransportDocumentRecord) => {
      if (record.documentType !== documentType) {
        toast.error('This record belongs to a different document type')
        router.replace('/booking/documents')
        return
      }
      if (
        validBookingId != null &&
        !recordBelongsToBooking(record, validBookingId)
      ) {
        toast.error('This document belongs to a different booking')
        router.replace('/booking/documents')
        return
      }
      const payload =
        documentType === 'bl'
          ? normalizeBillOfLadingPayload(record.payload)
          : documentType === 'do'
            ? normalizeDeliveryOrderPayload(record.payload)
            : documentType === 'booking'
              ? normalizeBookingConfirmationPayload(record.payload)
              : documentType === 'an'
                ? normalizeArrivalNoticePayload(record.payload)
                : record.payload
      setForms(
        (previous) =>
          ({
            ...previous,
            [documentType]: payload,
          }) as TransportDocumentPayloadMap
      )
      setActiveRecordId(record.id)
      setStatus(record.status)
      setLockedAt(record.lockedAt)
      setRecordCreator(record.createdBy ?? null)
      setSavedSnapshot(payloadSnapshot(payload))
    },
    [documentType, router, validBookingId]
  )

  const getWorkflowArrivalNotice = useCallback((): ArrivalNoticePayload | null => {
    const source = getWorkflowRecord(workflow, 'an')
    if (!source) return null
    return normalizeArrivalNoticePayload(source.payload)
  }, [workflow])

  /** Overwrite DO cargo from linked AN whenever we persist or preview. */
  const withCargoFromAn = useCallback(
    (
      payload: TransportDocumentPayloadMap[typeof documentType]
    ): TransportDocumentPayloadMap[typeof documentType] => {
      if (documentType !== 'do') return payload
      const an = getWorkflowArrivalNotice()
      if (!an) return payload
      return syncDeliveryOrderCargoFromArrivalNotice(
        an,
        payload as DeliveryOrderPayload
      ) as TransportDocumentPayloadMap[typeof documentType]
    },
    [documentType, getWorkflowArrivalNotice]
  )

  const withBookingPic = useCallback(
    (
      payload: TransportDocumentPayloadMap[typeof documentType]
    ): TransportDocumentPayloadMap[typeof documentType] => {
      if (documentType !== 'booking') return payload
      const bookingPayload = payload as BookingConfirmationPayload
      const creator =
        recordCreator ??
        (currentUser
          ? {
              id: currentUser.id,
              fullName: currentUser.fullName,
              email: currentUser.email,
            }
          : null)
      return {
        ...bookingPayload,
        pic: resolveBookingPic(creator, bookingPayload.pic),
      } as TransportDocumentPayloadMap[typeof documentType]
    },
    [currentUser, documentType, recordCreator]
  )

  // Seed default PIC from the signed-in user on new booking forms.
  // Adjust during render (not an effect) so lint stays clean and auto-seed
  // alone does not mark the form dirty.
  if (
    bookingPicSeedApplied &&
    (documentType !== 'booking' || activeRecordId != null || !currentUser)
  ) {
    setBookingPicSeedApplied(false)
  }
  if (
    !bookingPicSeedApplied &&
    documentType === 'booking' &&
    currentUser &&
    activeRecordId == null
  ) {
    const pic = formatBookingPic(currentUser.fullName, currentUser.email)
    setBookingPicSeedApplied(true)
    if (pic) {
      const emptyBooking = createEmptyTransportDocuments()
        .booking as BookingConfirmationPayload
      const emptySnapshot = payloadSnapshot(emptyBooking)
      const seededSnapshot = payloadSnapshot({ ...emptyBooking, pic })

      setForms((previous) => {
        const booking = previous.booking as BookingConfirmationPayload
        if (booking.pic?.trim()) return previous
        return {
          ...previous,
          booking: { ...booking, pic },
        } as TransportDocumentPayloadMap
      })

      setSavedSnapshot((previous) => {
        // Only treat empty → empty+default PIC as the new baseline.
        if (previous !== emptySnapshot) return previous
        return seededSnapshot
      })
    }
  }

  const resolvePayloadForPersist = useCallback(
    (options?: { mapAnCargoFromBooking?: boolean }) => {
      let payload = activePayload
      if (documentType === 'do') {
        payload = withCargoFromAn(payload)
      }
      if (documentType === 'booking') {
        payload = withBookingPic(payload)
      }
      if (
        options?.mapAnCargoFromBooking &&
        documentType === 'an' &&
        activeRecordId == null &&
        validBookingId != null
      ) {
        const bookingRecord = getWorkflowRecord(workflow, 'booking')
        if (bookingRecord) {
          payload = mapArrivalNoticeCargoFromBooking(
            normalizeBookingConfirmationPayload(bookingRecord.payload),
            payload as ArrivalNoticePayload
          ) as TransportDocumentPayloadMap[typeof documentType]
        }
      }
      return payload
    },
    [
      activePayload,
      activeRecordId,
      documentType,
      validBookingId,
      withBookingPic,
      withCargoFromAn,
      workflow,
    ]
  )

  const validatePayload = useCallback(
    (options?: { mapAnCargoFromBooking?: boolean }) => {
      try {
        return parseTransportDocument(
          documentType,
          resolvePayloadForPersist(options)
        )
      } catch (error) {
        const message =
          error instanceof z.ZodError
            ? (error.issues[0]?.message ?? 'Please review the form values')
            : 'Please review the form values'
        toast.error(message)
        return null
      }
    },
    [documentType, resolvePayloadForPersist]
  )

  /** After AN save: patch sibling DO cargo so Download DO stays correct. */
  const syncSiblingDoCargoFromAn = useCallback(
    async (anPayload: ArrivalNoticePayload) => {
      if (validBookingId == null) return
      const doRecord = getWorkflowRecord(workflow, 'do')
      if (!doRecord || doRecord.lockedAt) return
      const currentDo = normalizeDeliveryOrderPayload(doRecord.payload)
      const synced = syncDeliveryOrderCargoFromArrivalNotice(
        anPayload,
        currentDo
      )
      await transportDocumentService.update('do', doRecord.id, {
        ...synced,
        status: doRecord.status,
        bookingId: validBookingId,
      })
    },
    [validBookingId, workflow]
  )

  const persistRecord = useCallback(
    async (
      validated: TransportDocumentPayloadMap[typeof documentType],
      nextStatus: TransportDocumentStatus
    ) => {
      const body = {
        ...validated,
        status: nextStatus,
        ...(documentType === 'booking'
          ? { bookingFlow: selectedFlow ?? workflowFlow }
          : validBookingId != null
            ? { bookingId: validBookingId }
            : {}),
      }
      if (activeRecordId != null) {
        return transportDocumentService.update(
          documentType,
          activeRecordId,
          body
        )
      }
      return transportDocumentService.create(documentType, body)
    },
    [activeRecordId, documentType, selectedFlow, validBookingId, workflowFlow]
  )

  const openPreview = useCallback(
    async (payload?: TransportDocumentPayloadMap[typeof documentType]) => {
      const validated = payload ?? validatePayload()
      if (!validated) return

      setIsGenerating(true)
      setPreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous)
        return null
      })
      setPreviewOpen(true)
      try {
        const pdf = await transportDocumentService.preview(
          documentType,
          validated
        )
        // Backend already returns a complete PDF blob for all booking docs.
        setPreviewUrl(URL.createObjectURL(pdf))
      } catch (error) {
        setPreviewOpen(false)
        toast.error(
          error instanceof Error ? error.message : 'Failed to build PDF preview'
        )
      } finally {
        setIsGenerating(false)
      }
    },
    [documentType, validatePayload]
  )

  const handleSave = useCallback(async () => {
    if (isLocked) return false
    if (documentType === 'booking' && selectedFlow == null) {
      toast.error('Choose Import or Export before creating the booking')
      return false
    }
    const wasNew = activeRecordId == null
    const validated = validatePayload({
      mapAnCargoFromBooking: documentType === 'an' && wasNew,
    })
    if (!validated) return false

    setIsSaving(true)
    try {
      const record = await persistRecord(validated, 'COMPLETED')
      // applyRecord normalizes payload and sets savedSnapshot to that same
      // value so isDirty clears. Do not markSaved(record.payload): the raw
      // API payload often differs from the normalized form (defaults,
      // cargoVolumes compact, BL/AN migrations) and would leave the leave
      // guard thinking there are unsaved changes.
      applyRecord(record)
      // Click / beforeunload guards read the ref before React re-renders.
      isDirtyRef.current = false
      if (documentType === 'an') {
        const anPayload = normalizeArrivalNoticePayload(record.payload)
        try {
          await syncSiblingDoCargoFromAn(anPayload)
        } catch {
          toast.error(
            'Arrival Notice saved, but Delivery Order cargo could not be synced'
          )
        }
      }
      const rootBookingId =
        documentType === 'booking' ? record.id : validBookingId
      if (wasNew && rootBookingId != null && selectedFlow != null) {
        router.replace(
          buildBookingWorkflowUrl(
            selectedFlow,
            rootBookingId,
            documentType,
            record
          ),
          { scroll: false }
        )
      }
      if (rootBookingId != null) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.bookingWorkflow(rootBookingId),
        })
      }
      toast.success(`${document.label} saved`)
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [
    activeRecordId,
    applyRecord,
    document.label,
    documentType,
    isLocked,
    persistRecord,
    queryClient,
    router,
    selectedFlow,
    syncSiblingDoCargoFromAn,
    validatePayload,
    validBookingId,
  ])

  useEffect(() => {
    if (validRecordId == null) {
      autoPreviewDone.current = false
      return
    }

    let cancelled = false
    autoPreviewDone.current = false

    void transportDocumentService
      .getById(documentType, validRecordId)
      .then((record) => {
        if (cancelled) return
        applyRecord(record)
      })
      .catch((error) => {
        if (cancelled) return
        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to load document record'
        )
      })
      .finally(() => {
        if (!cancelled) setIsHydrating(false)
      })

    return () => {
      cancelled = true
    }
  }, [applyRecord, documentType, validRecordId])

  useEffect(() => {
    if (
      autoPreviewDone.current ||
      isHydrating ||
      previewParam !== '1' ||
      status !== 'COMPLETED' ||
      activeRecordId == null
    ) {
      return
    }
    autoPreviewDone.current = true
    void openPreview()
  }, [activeRecordId, isHydrating, openPreview, previewParam, status])

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!isDirtyRef.current || isLocked) return
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }

      const anchor = (event.target as HTMLElement | null)?.closest('a')
      if (!anchor) return
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return

      let url: URL
      try {
        url = new URL(href, window.location.href)
      } catch {
        return
      }
      if (url.origin !== window.location.origin) return
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      setPendingHref(`${url.pathname}${url.search}${url.hash}`)
      setLeaveDialogOpen(true)
    }

    window.document.addEventListener('click', onDocumentClick, true)
    return () =>
      window.document.removeEventListener('click', onDocumentClick, true)
  }, [isLocked])

  const updateFields = (patch: Record<string, unknown>) => {
    if (isLocked) return
    // DO container rows are AN-owned; strip any client edits.
    const nextPatch =
      documentType === 'do'
        ? Object.fromEntries(
            Object.entries(patch).filter(
              ([key]) => key !== 'containers' && key !== 'cargoRows'
            )
          )
        : patch
    if (Object.keys(nextPatch).length === 0) return
    setForms(
      (previous) =>
        ({
          ...previous,
          [documentType]: { ...previous[documentType], ...nextPatch },
        }) as TransportDocumentPayloadMap
    )
  }

  const updateField = (key: string, value: unknown) => {
    updateFields({ [key]: value })
  }

  // Legacy per-row editor is unused: AN/BL/DO all use the containers editor.
  const setCargoRows = (_rows: CargoRow[]) => {
    void _rows
  }

  const setContainers = (rows: AnContainer[]) => {
    if (isLocked) return
    if (documentType !== 'an' && documentType !== 'bl') return
    setForms(
      (previous) =>
        ({
          ...previous,
          [documentType]: { ...previous[documentType], containers: rows },
        }) as TransportDocumentPayloadMap
    )
  }

  const resetActiveForm = () => {
    if (isLocked) return
    const empty = createEmptyTransportDocuments()[documentType]
    setForms(
      (previous) =>
        ({ ...previous, [documentType]: empty }) as TransportDocumentPayloadMap
    )
    if (activeRecordId == null) markSaved(empty)
    setPreviewOpen(false)
    setPreviewUrl(null)
  }

  const navigatePending = () => {
    if (!pendingHref) return
    const href = pendingHref
    setPendingHref(null)
    setLeaveDialogOpen(false)
    router.push(href)
  }

  const handleLeaveWithoutSaving = () => {
    setSavedSnapshot(payloadSnapshot(activePayload))
    navigatePending()
  }

  const handleLeaveWithSave = async () => {
    const ok = await handleSave()
    if (!ok) return
    navigatePending()
  }

  const handleUnlock = useCallback(async () => {
    const lockOwnerId = workflowRootLockedAt ? validBookingId : activeRecordId
    if (!lockOwnerId || !isLocked || !isAdmin) return
    setIsUnlocking(true)
    try {
      const lockOwnerType = workflowRootLockedAt ? 'booking' : documentType
      const unlocked = await transportDocumentService.unlock(
        lockOwnerType,
        lockOwnerId
      )
      if (lockOwnerId === activeRecordId) {
        setLockedAt(unlocked.lockedAt)
      }
      if (validBookingId != null) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.bookingWorkflow(validBookingId),
        })
      }
      toast.success('Document unlocked — you can edit again')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to unlock document'
      )
    } finally {
      setIsUnlocking(false)
    }
  }, [
    activeRecordId,
    documentType,
    isAdmin,
    isLocked,
    queryClient,
    validBookingId,
    workflowRootLockedAt,
  ])

  const selectFlow = useCallback(
    (flow: BookingFlow) => {
      if (!canEditFlow) return
      const params = new URLSearchParams(searchParams.toString())
      params.set('flow', flow)
      router.replace(
        `/booking/documents/booking-confirmation?${params.toString()}`,
        { scroll: false }
      )
    },
    [canEditFlow, router, searchParams]
  )

  const busy =
    isGenerating ||
    isSaving ||
    isHydrating ||
    isUnlocking ||
    workflowQuery.isLoading
  const formReady = !needsFlowSelection || selectedFlow != null
  const prefillSourceType = getPrefillSourceType(documentType)

  const applyWorkflowPrefill = useCallback(
    (record: TransportDocumentRecord) => {
      // Create-only path (validRecordId == null). Do not gate on isLocked:
      // a locked booking root used to skip prefill after the effect key was
      // set, so AN never received route/schedule seeding.
      if (!prefillSourceType) return
      const sourcePayload =
        prefillSourceType === 'bl'
          ? normalizeBillOfLadingPayload(record.payload)
          : prefillSourceType === 'booking'
            ? normalizeBookingConfirmationPayload(record.payload)
            : prefillSourceType === 'an'
              ? normalizeArrivalNoticePayload(record.payload)
              : record.payload
      setForms((previous) => {
        const next =
          documentType === 'an' && prefillSourceType === 'booking'
            ? prefillArrivalNoticeHeaderFromBooking(
                sourcePayload as BookingConfirmationPayload,
                previous.an as ArrivalNoticePayload
              )
            : applyPrefillFromPrevious(
                documentType,
                prefillSourceType,
                sourcePayload as TransportDocumentPayloadMap[typeof prefillSourceType],
                previous[documentType]
              )
        return {
          ...previous,
          [documentType]: next,
        } as TransportDocumentPayloadMap
      })
    },
    [documentType, prefillSourceType]
  )

  useEffect(() => {
    if (validBookingId == null || validRecordId != null || !prefillSourceType) {
      return
    }
    const source = getWorkflowRecord(workflow, prefillSourceType)
    if (!source) return
    const key = `${validBookingId}:${documentType}:${source.id}`
    if (autoWorkflowPrefillKey.current === key) return
    autoWorkflowPrefillKey.current = key
    applyWorkflowPrefill(source)
  }, [
    applyWorkflowPrefill,
    documentType,
    prefillSourceType,
    validBookingId,
    validRecordId,
    workflow,
  ])

  return (
    <div className='mx-auto max-w-7xl space-y-5 pb-8'>
      {validBookingId != null && selectedFlow != null ? (
        <BookingWorkflowNav
          activeType={documentType}
          bookingId={validBookingId}
          flow={selectedFlow}
          workflow={workflow}
        />
      ) : null}
      <header className='flex flex-col gap-4 border-b border-border/60 pb-5 lg:flex-row lg:items-end lg:justify-between'>
        <div className='space-y-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h1 className='text-xl font-semibold tracking-tight'>
              {activeRecordId
                ? `Edit ${document.label}`
                : documentType === 'booking'
                  ? 'Create Booking'
                  : `Create ${document.label}`}
            </h1>
            {selectedFlow && documentType === 'booking' ? (
              <Badge variant='outline' className='font-medium'>
                {selectedFlow === 'IMPORT' ? 'Import' : 'Export'}
              </Badge>
            ) : null}
            {status ? (
              <Badge
                variant={status === 'COMPLETED' ? 'default' : 'secondary'}
                className={
                  status === 'COMPLETED'
                    ? 'bg-success text-success-foreground hover:bg-success/90'
                    : 'bg-warning text-white hover:bg-warning/90'
                }
              >
                {status === 'COMPLETED' ? 'Completed' : 'Processing'}
              </Badge>
            ) : null}
            {isLocked ? (
              <Badge
                variant='outline'
                className='gap-1 border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200'
              >
                <Lock className='h-3.5 w-3.5' />
                Locked
              </Badge>
            ) : null}
          </div>
          <p className='max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty'>
            {needsFlowSelection
              ? 'Select Import or Export, then complete the booking confirmation. Download opens the PDF without saving; Create Booking stores a completed record.'
              : `${document.description}. Download opens the PDF without saving. Save stores a Completed record.`}
          </p>
        </div>
        {formReady && isLocked ? (
          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              size='sm'
              onClick={() => void openPreview()}
              disabled={busy}
            >
              {isGenerating ? (
                <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
              ) : (
                <FileOutput className='mr-1.5 h-4 w-4' />
              )}
              View PDF
            </Button>
            {isAdmin ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => void handleUnlock()}
                disabled={busy}
                className='gap-2'
              >
                {isUnlocking ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Unlock className='h-4 w-4' />
                )}
                Unlock edit
              </Button>
            ) : null}
          </div>
        ) : null}
      </header>

      {needsFlowSelection ? (
        <BookingFlowChooser
          value={selectedFlow}
          disabled={busy}
          onChange={selectFlow}
        />
      ) : null}

      {isHydrating ? (
        <div className='flex min-h-40 items-center justify-center'>
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        </div>
      ) : formReady ? (
        <fieldset disabled={isLocked || busy} className='min-w-0 border-0 p-0'>
          <TransportDocumentForm
            documentType={documentType}
            values={activeRecord}
            cargoRows={cargoRows}
            containers={containers}
            isGenerating={busy}
            isSaving={isSaving}
            isDownloading={isGenerating}
            onFieldChange={updateField}
            onFieldsChange={updateFields}
            onCargoRowsChange={setCargoRows}
            onContainersChange={setContainers}
            onSubmit={() => void handleSave()}
            onDownload={() => void openPreview()}
            onReset={resetActiveForm}
            submitLabel={
              activeRecordId
                ? 'Save'
                : documentType === 'booking'
                  ? 'Create Booking'
                  : `Create ${document.shortLabel}`
            }
            resetLabel={`Reset ${document.shortLabel}`}
            submitDisabled={needsFlowSelection && !selectedFlow}
          />
        </fieldset>
      ) : null}

      <PdfPreviewDialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open)
          if (!open) {
            setPreviewUrl((previous) => {
              if (previous) URL.revokeObjectURL(previous)
              return null
            })
          }
        }}
        previewUrl={previewUrl}
        fileName={fileName}
        isGenerating={isGenerating}
        loadingLabel={`Building ${document.label} preview…`}
        actionMode='download'
      />

      <AlertDialog
        open={leaveDialogOpen}
        onOpenChange={(open) => {
          setLeaveDialogOpen(open)
          if (!open) setPendingHref(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Do you want to save before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='gap-2 sm:gap-2'>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <Button
              type='button'
              variant='outline'
              disabled={isSaving}
              onClick={handleLeaveWithoutSaving}
            >
              Don&apos;t save
            </Button>
            <AlertDialogAction
              disabled={isSaving}
              onClick={(event) => {
                event.preventDefault()
                void handleLeaveWithSave()
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
