'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { z } from 'zod'
import { isAdminRole } from '@/config/section-catalog'
import { useCurrentUser } from '@/hooks/use-current-user'
import { PdfPreviewDialog } from '@/shared/components/PdfPreviewDialog'
import { delay, EPDA_PREVIEW_LOAD_DELAY_MS } from '@/shared/utils/epdaExport'
import { toast } from '@/shared/utils/toast'
import {
  ClipboardPaste,
  FileOutput,
  Loader2,
  Lock,
  RotateCcw,
  Save,
  Unlock,
} from 'lucide-react'
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
import { TransportDocumentForm } from './TransportDocumentForm'
import { TransportDocumentPrefillDialog } from './TransportDocumentPrefillDialog'
import type {
  CargoRow,
  TransportDocumentPayloadMap,
  TransportDocumentRecord,
  TransportDocumentStatus,
  TransportDocumentType,
} from './transportDocument.types'
import { getTransportDocumentDefinition } from './transportDocumentFormConfig'
import {
  buildTransportDocumentFileName,
  getTransportDocumentCargoRows,
} from './transportDocumentFormRules'
import {
  applyPrefillFromPrevious,
  getPrefillSourceType,
} from './transportDocumentPrefill'
import {
  createEmptyTransportDocuments,
  normalizeBillOfLadingPayload,
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
  const searchParams = useSearchParams()
  const currentUser = useCurrentUser()
  const isAdmin = isAdminRole(currentUser?.role)
  const recordIdParam = searchParams.get('recordId')
  const previewParam = searchParams.get('preview')
  const parsedRecordId = recordIdParam
    ? Number.parseInt(recordIdParam, 10)
    : null
  const validRecordId =
    parsedRecordId != null && Number.isFinite(parsedRecordId)
      ? parsedRecordId
      : null

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
  const [prefillDialogOpen, setPrefillDialogOpen] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    payloadSnapshot(createEmptyTransportDocuments()[documentType])
  )
  const [trackedRecordId, setTrackedRecordId] = useState(validRecordId)
  const autoPreviewDone = useRef(false)
  const isDirtyRef = useRef(false)

  // Adjust session state when URL recordId changes (avoid setState-in-effect).
  if (trackedRecordId !== validRecordId) {
    setTrackedRecordId(validRecordId)
    if (validRecordId == null) {
      setActiveRecordId(null)
      setStatus(null)
      setLockedAt(null)
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
  const cargoRows = getTransportDocumentCargoRows(documentType, forms)
  const isLocked = Boolean(lockedAt)
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

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const applyRecord = useCallback(
    (record: TransportDocumentRecord) => {
      if (record.documentType !== documentType) {
        toast.error('This record belongs to a different document type')
        return
      }
      const payload =
        documentType === 'bl'
          ? normalizeBillOfLadingPayload(record.payload)
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
      setSavedSnapshot(payloadSnapshot(payload))
    },
    [documentType]
  )

  const validatePayload = useCallback(() => {
    try {
      return parseTransportDocument(documentType, activePayload)
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? (error.issues[0]?.message ?? 'Please review the form values')
          : 'Please review the form values'
      toast.error(message)
      return null
    }
  }, [activePayload, documentType])

  const persistRecord = useCallback(
    async (
      validated: TransportDocumentPayloadMap[typeof documentType],
      nextStatus: TransportDocumentStatus
    ) => {
      const body = { ...validated, status: nextStatus }
      if (activeRecordId != null) {
        return transportDocumentService.update(activeRecordId, body)
      }
      return transportDocumentService.create(documentType, body)
    },
    [activeRecordId, documentType]
  )

  const openPreview = useCallback(
    async (
      payload?: TransportDocumentPayloadMap[typeof documentType]
    ) => {
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
        // Same settle delay as EPDA before revealing preview.
        await delay(EPDA_PREVIEW_LOAD_DELAY_MS)
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
    const validated = validatePayload()
    if (!validated) return false

    setIsSaving(true)
    try {
      const record = await persistRecord(validated, 'COMPLETED')
      applyRecord(record)
      markSaved(record.payload)
      toast.success(`${document.label} saved`)
      await openPreview(record.payload)
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [
    applyRecord,
    document.label,
    isLocked,
    markSaved,
    openPreview,
    persistRecord,
    validatePayload,
  ])

  useEffect(() => {
    if (validRecordId == null) {
      autoPreviewDone.current = false
      return
    }

    let cancelled = false
    autoPreviewDone.current = false

    void transportDocumentService
      .getById(validRecordId)
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
  }, [applyRecord, validRecordId])

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

  const updateField = (key: string, value: string) => {
    if (isLocked) return
    setForms(
      (previous) =>
        ({
          ...previous,
          [documentType]: { ...previous[documentType], [key]: value },
        }) as TransportDocumentPayloadMap
    )
  }

  const setCargoRows = (rows: CargoRow[]) => {
    if (isLocked) return
    if (documentType !== 'an' && documentType !== 'do') return
    setForms(
      (previous) =>
        ({
          ...previous,
          [documentType]: { ...previous[documentType], cargoRows: rows },
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
    markSaved(empty)
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
    if (!activeRecordId || !isLocked || !isAdmin) return
    setIsUnlocking(true)
    try {
      const unlocked = await transportDocumentService.unlock(activeRecordId)
      setLockedAt(unlocked.lockedAt)
      toast.success('Document unlocked — you can edit again')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to unlock document'
      )
    } finally {
      setIsUnlocking(false)
    }
  }, [activeRecordId, isAdmin, isLocked])

  const busy = isGenerating || isSaving || isHydrating || isUnlocking
  const prefillSourceType = getPrefillSourceType(documentType)

  const handlePrefillSelect = useCallback(
    (record: TransportDocumentRecord) => {
      if (!prefillSourceType || isLocked) return
      const sourcePayload =
        prefillSourceType === 'bl'
          ? normalizeBillOfLadingPayload(record.payload)
          : record.payload
      const next = applyPrefillFromPrevious(
        documentType,
        prefillSourceType,
        sourcePayload as TransportDocumentPayloadMap[typeof prefillSourceType],
        activePayload
      )
      setForms(
        (previous) =>
          ({
            ...previous,
            [documentType]: next,
          }) as TransportDocumentPayloadMap
      )
      toast.success(
        `Prefilled from ${getTransportDocumentDefinition(prefillSourceType).label}`
      )
    },
    [activePayload, documentType, isLocked, prefillSourceType]
  )

  return (
    <div className='mx-auto max-w-7xl space-y-5 pb-8'>
      <header className='flex flex-col gap-4 border-b border-border/60 pb-5 lg:flex-row lg:items-end lg:justify-between'>
        <div className='space-y-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <h1 className='text-xl font-semibold tracking-tight'>
              {activeRecordId
                ? `Edit ${document.label}`
                : `Create ${document.label}`}
            </h1>
            {status ? (
              <Badge
                variant={status === 'COMPLETED' ? 'default' : 'secondary'}
                className={
                  status === 'COMPLETED'
                    ? 'bg-success text-success-foreground hover:bg-success/90'
                    : 'bg-warning text-warning-foreground hover:bg-warning/90'
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
          <p className='max-w-2xl text-sm leading-relaxed text-muted-foreground'>
            {document.description}. Preview opens the PDF without saving. Save
            &amp; Preview stores a Completed record and opens the PDF.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          {!isLocked ? (
            <>
              {prefillSourceType ? (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setPrefillDialogOpen(true)}
                  disabled={busy}
                >
                  <ClipboardPaste className='mr-1.5 h-4 w-4' />
                  Prefill from previous
                </Button>
              ) : null}
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={resetActiveForm}
                disabled={busy}
              >
                <RotateCcw className='mr-1.5 h-4 w-4' /> Reset{' '}
                {document.shortLabel}
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => void openPreview()}
                disabled={busy}
              >
                {isGenerating ? (
                  <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
                ) : (
                  <FileOutput className='mr-1.5 h-4 w-4' />
                )}
                Preview
              </Button>
              <Button
                type='button'
                size='sm'
                onClick={() => void handleSave()}
                disabled={busy}
              >
                {isSaving || isGenerating ? (
                  <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
                ) : (
                  <Save className='mr-1.5 h-4 w-4' />
                )}
                Save & Preview
              </Button>
            </>
          ) : (
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
          )}
        </div>
      </header>

      {isHydrating ? (
        <div className='flex min-h-40 items-center justify-center'>
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        </div>
      ) : (
        <fieldset disabled={isLocked || busy} className='min-w-0 border-0 p-0'>
          <TransportDocumentForm
            documentType={documentType}
            values={activeRecord}
            cargoRows={cargoRows}
            isGenerating={busy}
            onFieldChange={updateField}
            onCargoRowsChange={setCargoRows}
            onSubmit={() => void handleSave()}
          />
        </fieldset>
      )}

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
        actionMode="download"
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

      {prefillSourceType ? (
        <TransportDocumentPrefillDialog
          open={prefillDialogOpen}
          sourceType={prefillSourceType}
          onOpenChange={setPrefillDialogOpen}
          onSelect={handlePrefillSelect}
        />
      ) : null}
    </div>
  )
}
