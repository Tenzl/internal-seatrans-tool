'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isAdminRole } from '@/config/section-catalog'
import { PdfPreviewDialog } from '@/shared/components/PdfPreviewDialog'
import { queryKeys } from '@/shared/config/react-query.config'
import { toast } from '@/shared/utils/toast'
import {
  AlertTriangle,
  Copy,
  FileOutput,
  Loader2,
  Lock,
  Unlock,
} from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
  formatBookingPic,
  resolveBookingPic,
  resolveUserPicEmail,
} from './bookingPic'
import {
  buildBookingWorkflowUrl,
  getWorkflowRecord,
  recordBelongsToBooking,
} from './bookingWorkflow'
import {
  formatDocumentNumberDuplicateMessage,
  getDocumentNumber,
  getDocumentNumberLabel,
} from './documentNumberDuplicate'
import type {
  AnContainer,
  BookingConfirmationPayload,
  BookingFlow,
  DocumentNumberCheck,
  TransportDocumentPayloadMap,
  TransportDocumentRecord,
  TransportDocumentStatus,
  TransportDocumentType,
} from './transportDocument.types'
import { getTransportDocumentDefinition } from './transportDocumentFormConfig'
import {
  buildTransportDocumentFileName,
  getTransportDocumentContainers,
} from './transportDocumentFormRules'
import {
  applyPrefillFromPrevious,
  buildWorkflowPrefillKey,
  getPrefillSourceType,
  isWorkflowPrefillEnabled,
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
  const copyFromParam = searchParams.get('copyFrom')
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
  const parsedCopySourceId = copyFromParam
    ? Number.parseInt(copyFromParam, 10)
    : null
  const validCopySourceId =
    documentType === 'booking' &&
    validRecordId == null &&
    validBookingId == null &&
    parsedCopySourceId != null &&
    Number.isFinite(parsedCopySourceId) &&
    parsedCopySourceId > 0
      ? parsedCopySourceId
      : null
  const flowFromUrl: BookingFlow | null =
    flowParam === 'IMPORT' || flowParam === 'EXPORT' ? flowParam : null

  const workflowQuery = useQuery({
    queryKey: queryKeys.bookingWorkflow(validBookingId ?? 0),
    queryFn: () => transportDocumentService.workflow(validBookingId as number),
    enabled: validBookingId != null,
  })
  const workflow = workflowQuery.data ?? null
  const copySourceQuery = useQuery({
    queryKey: queryKeys.bookingCopySource(validCopySourceId ?? 0),
    queryFn: () =>
      transportDocumentService.bookingCopySource(validCopySourceId as number),
    enabled: validCopySourceId != null,
  })
  const selectedFlow: BookingFlow | null =
    workflow?.flow ?? copySourceQuery.data?.bookingFlow ?? flowFromUrl
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
  const [activeRecordVersion, setActiveRecordVersion] = useState<number | null>(
    null
  )
  const [status, setStatus] = useState<TransportDocumentStatus | null>(null)
  const [lockedAt, setLockedAt] = useState<string | null>(null)
  const [isHydrating, setIsHydrating] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [recordCreator, setRecordCreator] =
    useState<TransportDocumentRecord['createdBy']>(null)
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    payloadSnapshot(createEmptyTransportDocuments()[documentType])
  )
  const [trackedRecordId, setTrackedRecordId] = useState(validRecordId)
  const [bookingPicSeedApplied, setBookingPicSeedApplied] = useState(false)
  const [debouncedDocumentNumber, setDebouncedDocumentNumber] = useState('')
  const [saveDuplicateCheck, setSaveDuplicateCheck] =
    useState<DocumentNumberCheck | null>(null)
  const autoPreviewDone = useRef(false)
  const autoWorkflowPrefillKey = useRef<string | null>(null)
  const hydratedCopySourceId = useRef<number | null>(null)
  const isDirtyRef = useRef(false)

  // Adjust session state when URL recordId changes (avoid setState-in-effect).
  if (trackedRecordId !== validRecordId) {
    setTrackedRecordId(validRecordId)
    if (validRecordId == null) {
      setActiveRecordId(null)
      setActiveRecordVersion(null)
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

  const document = getTransportDocumentDefinition(documentType)
  const activePayload = forms[documentType]
  const activeRecord = activePayload as unknown as Record<string, unknown>
  const documentNumber = getDocumentNumber(documentType, activeRecord)
  const containers = getTransportDocumentContainers(documentType, forms)
  const workflowRootLockedAt = workflow?.documents.booking?.lockedAt ?? null
  const isLocked = Boolean(lockedAt || workflowRootLockedAt)
  const isDirty = useMemo(() => {
    if (isLocked) return false
    return payloadSnapshot(activePayload) !== savedSnapshot
  }, [activePayload, isLocked, savedSnapshot])

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedDocumentNumber(documentNumber),
      400
    )
    return () => window.clearTimeout(timer)
  }, [documentNumber])

  const duplicateNumberQuery = useQuery({
    queryKey: queryKeys.documentNumberDuplicates(
      documentType,
      debouncedDocumentNumber,
      activeRecordId
    ),
    queryFn: () =>
      transportDocumentService.checkDocumentNumber(
        documentType,
        debouncedDocumentNumber,
        activeRecordId ?? undefined
      ),
    enabled:
      debouncedDocumentNumber.length > 0 &&
      debouncedDocumentNumber === documentNumber,
    staleTime: 30_000,
  })
  const duplicateNumberCheck = [
    saveDuplicateCheck,
    duplicateNumberQuery.data,
  ].find(
    (check) =>
      check?.documentType === documentType &&
      check.number.trim().toLowerCase() === documentNumber.toLowerCase()
  )
  const duplicateBlocksSave = duplicateNumberCheck?.duplicate === true

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
    if (!copySourceQuery.error) return
    toast.error(
      copySourceQuery.error instanceof Error
        ? copySourceQuery.error.message
        : 'Failed to load the booking copy source'
    )
  }, [copySourceQuery.error])

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
      setActiveRecordVersion(record.version)
      setStatus(record.status)
      setLockedAt(record.lockedAt)
      setRecordCreator(record.createdBy ?? null)
      setSavedSnapshot(payloadSnapshot(payload))
    },
    [documentType, router, validBookingId]
  )

  const withBookingPic = useCallback(
    (
      payload: TransportDocumentPayloadMap[typeof documentType]
    ): TransportDocumentPayloadMap[typeof documentType] => {
      if (documentType !== 'booking') return payload
      const bookingPayload = payload as BookingConfirmationPayload
      const hasExplicitPic = Boolean(bookingPayload.pic.trim())
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
        picUserId:
          bookingPayload.picUserId ?? (!hasExplicitPic ? creator?.id : null),
      } as TransportDocumentPayloadMap[typeof documentType]
    },
    [currentUser, documentType, recordCreator]
  )

  useEffect(() => {
    if (validCopySourceId == null) {
      hydratedCopySourceId.current = null
      return
    }
    const source = copySourceQuery.data
    if (!source || hydratedCopySourceId.current === source.sourceBookingId) {
      return
    }
    hydratedCopySourceId.current = source.sourceBookingId
    const copiedPayload = normalizeBookingConfirmationPayload(source.payload)
    setForms((previous) => ({
      ...previous,
      booking: copiedPayload,
    }))
    setSavedSnapshot(payloadSnapshot(createEmptyTransportDocuments().booking))
    setRecordCreator(null)
    toast.info(
      `Copied Booking #${source.sourceBookingId}. Saving will create a new booking.`
    )
  }, [copySourceQuery.data, validCopySourceId])

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
    const pic = formatBookingPic(
      currentUser.fullName,
      resolveUserPicEmail(currentUser)
    )
    setBookingPicSeedApplied(true)
    if (pic) {
      const emptyBooking = createEmptyTransportDocuments()
        .booking as BookingConfirmationPayload
      const emptySnapshot = payloadSnapshot(emptyBooking)
      const seededSnapshot = payloadSnapshot({
        ...emptyBooking,
        pic,
        picUserId: currentUser.id,
      })

      setForms((previous) => {
        const booking = previous.booking as BookingConfirmationPayload
        if (booking.pic?.trim()) return previous
        return {
          ...previous,
          booking: { ...booking, pic, picUserId: currentUser.id },
        } as TransportDocumentPayloadMap
      })

      setSavedSnapshot((previous) => {
        // Only treat empty → empty+default PIC as the new baseline.
        if (previous !== emptySnapshot) return previous
        return seededSnapshot
      })
    }
  }

  const resolvePayloadForPersist = useCallback(() => {
    let payload = activePayload
    if (documentType === 'booking') {
      payload = withBookingPic(payload)
    }
    return payload
  }, [activePayload, documentType, withBookingPic])

  const validatePayload = useCallback(() => {
    try {
      return parseTransportDocument(documentType, resolvePayloadForPersist())
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? (error.issues[0]?.message ?? 'Please review the form values')
          : 'Please review the form values'
      toast.error(message)
      return null
    }
  }, [documentType, resolvePayloadForPersist])

  const persistRecord = useCallback(
    async (validated: TransportDocumentPayloadMap[typeof documentType]) => {
      const body = {
        ...validated,
        ...(documentType === 'booking'
          ? { bookingFlow: selectedFlow ?? workflowFlow }
          : validBookingId != null
            ? { bookingId: validBookingId }
            : {}),
      }
      if (activeRecordId != null) {
        if (activeRecordVersion == null) {
          throw new Error('Document version is missing; reload and retry')
        }
        return transportDocumentService.update(
          documentType,
          activeRecordId,
          body,
          activeRecordVersion
        )
      }
      return transportDocumentService.create(documentType, body)
    },
    [
      activeRecordId,
      activeRecordVersion,
      documentType,
      selectedFlow,
      validBookingId,
      workflowFlow,
    ]
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
        const pdf =
          activeRecordId != null && !isDirty && payload == null
            ? await transportDocumentService.previewSaved(
                documentType,
                activeRecordId
              )
            : await transportDocumentService.preview(documentType, validated)
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
    [activeRecordId, documentType, isDirty, validatePayload]
  )

  const performSave = useCallback(
    async (validated: TransportDocumentPayloadMap[typeof documentType]) => {
      const wasNew = activeRecordId == null

      setIsSaving(true)
      try {
        const record = await persistRecord(validated)
        // applyRecord normalizes payload and sets savedSnapshot to that same
        // value so isDirty clears. Do not markSaved(record.payload): the raw
        // API payload often differs from the normalized form (defaults,
        // cargoVolumes compact, BL/AN migrations) and would leave the leave
        // guard thinking there are unsaved changes.
        applyRecord(record)
        // Click / beforeunload guards read the ref before React re-renders.
        isDirtyRef.current = false
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
    },
    [
      activeRecordId,
      applyRecord,
      document.label,
      documentType,
      persistRecord,
      queryClient,
      router,
      selectedFlow,
      validBookingId,
    ]
  )

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

  const navigatePending = useCallback(() => {
    if (!pendingHref) return
    const href = pendingHref
    setPendingHref(null)
    setLeaveDialogOpen(false)
    router.push(href)
  }, [pendingHref, router])

  const requestSave = useCallback(
    async (navigateAfterSave = false) => {
      if (isLocked) return false
      if (documentType === 'booking' && selectedFlow == null) {
        toast.error('Choose Import or Export before creating the booking')
        return false
      }
      const validated = validatePayload()
      if (!validated) return false

      const currentNumber = getDocumentNumber(
        documentType,
        validated as unknown as Record<string, unknown>
      )
      if (currentNumber) {
        setIsCheckingDuplicate(true)
        try {
          const check = await transportDocumentService.checkDocumentNumber(
            documentType,
            currentNumber,
            activeRecordId ?? undefined
          )
          setSaveDuplicateCheck(check)
          if (check.duplicate) {
            toast.error(
              `${formatDocumentNumberDuplicateMessage(check)} Enter a different number before saving.`
            )
            return false
          }
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : `Could not check the ${getDocumentNumberLabel(documentType)}; please try again`
          )
          return false
        } finally {
          setIsCheckingDuplicate(false)
        }
      }

      const saved = await performSave(validated)
      if (saved && navigateAfterSave) navigatePending()
      return saved
    },
    [
      activeRecordId,
      documentType,
      isLocked,
      navigatePending,
      performSave,
      selectedFlow,
      validatePayload,
    ]
  )

  const handleLeaveWithoutSaving = () => {
    setSavedSnapshot(payloadSnapshot(activePayload))
    navigatePending()
  }

  const handleLeaveWithSave = async () => {
    await requestSave(true)
  }

  const handleUnlock = useCallback(async () => {
    const lockOwnerId = workflowRootLockedAt ? validBookingId : activeRecordId
    if (!lockOwnerId || !isLocked || !isAdmin) return
    setIsUnlocking(true)
    try {
      const lockOwnerType = workflowRootLockedAt ? 'booking' : documentType
      const expectedVersion = workflowRootLockedAt
        ? workflow?.documents.booking?.version
        : activeRecordVersion
      if (expectedVersion == null) {
        throw new Error('Document version is missing; reload and retry')
      }
      const unlocked = await transportDocumentService.unlock(
        lockOwnerType,
        lockOwnerId,
        expectedVersion
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
    activeRecordVersion,
    documentType,
    isAdmin,
    isLocked,
    queryClient,
    validBookingId,
    workflowRootLockedAt,
    workflow,
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
    isCheckingDuplicate ||
    copySourceQuery.isLoading ||
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
        const next = applyPrefillFromPrevious(
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
    if (validRecordId == null && activeRecordId == null) {
      autoWorkflowPrefillKey.current = null
    }
  }, [activeRecordId, validRecordId])

  useEffect(() => {
    const targetRecordId = activeRecordId ?? validRecordId
    if (
      validBookingId == null ||
      !prefillSourceType ||
      !isWorkflowPrefillEnabled({
        bookingId: validBookingId,
        targetRecordId,
        sourceType: prefillSourceType,
      })
    ) {
      return
    }
    const source = getWorkflowRecord(workflow, prefillSourceType)
    if (!source) return
    const key = buildWorkflowPrefillKey(validBookingId, documentType, source)
    if (autoWorkflowPrefillKey.current === key) return
    autoWorkflowPrefillKey.current = key
    applyWorkflowPrefill(source)
  }, [
    applyWorkflowPrefill,
    activeRecordId,
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
                : validCopySourceId != null
                  ? 'Create Booking from copy'
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
                Document: {status === 'COMPLETED' ? 'Completed' : 'Processing'}
              </Badge>
            ) : null}
            {workflow ? (
              <Badge
                variant={
                  workflow.status === 'COMPLETED' ? 'default' : 'secondary'
                }
                className={
                  workflow.status === 'COMPLETED'
                    ? 'bg-success text-success-foreground hover:bg-success/90'
                    : 'bg-warning text-white hover:bg-warning/90'
                }
              >
                Workflow:{' '}
                {workflow.status === 'COMPLETED' ? 'Completed' : 'Processing'}
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
          <p className='max-w-2xl text-sm leading-relaxed text-pretty text-muted-foreground'>
            {needsFlowSelection
              ? 'Select Import or Export, then complete the booking confirmation. Print opens the PDF without saving; the server determines document status.'
              : `${document.description}. Print opens the PDF without saving; the server determines document status.`}
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

      {validCopySourceId != null && copySourceQuery.data ? (
        <Alert className='border-violet-500/40 bg-violet-500/5'>
          <Copy />
          <AlertTitle>New booking copied from #{validCopySourceId}</AlertTitle>
          <AlertDescription>
            Review the copied fields and booking number. Saving creates a new
            booking and does not change the source booking.
          </AlertDescription>
        </Alert>
      ) : null}

      {duplicateNumberCheck?.duplicate ? (
        <Alert className='border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-100'>
          <AlertTriangle />
          <AlertTitle>
            Duplicate {getDocumentNumberLabel(documentType)}
          </AlertTitle>
          <AlertDescription className='text-amber-900/80 dark:text-amber-100/80'>
            <p>
              {formatDocumentNumberDuplicateMessage(duplicateNumberCheck)} Enter
              a different number to enable Create/Save.
            </p>
          </AlertDescription>
        </Alert>
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
            containers={containers}
            isGenerating={busy}
            isSaving={isSaving}
            isDownloading={isGenerating}
            onFieldChange={updateField}
            onFieldsChange={updateFields}
            onContainersChange={setContainers}
            onSubmit={() => void requestSave()}
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
            submitDisabled={
              (needsFlowSelection && !selectedFlow) ||
              duplicateBlocksSave ||
              (documentNumber.length > 0 && duplicateNumberQuery.isFetching)
            }
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
              disabled={isSaving || duplicateBlocksSave}
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
