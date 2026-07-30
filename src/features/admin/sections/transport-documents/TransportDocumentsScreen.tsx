'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { PdfPreviewDialog } from '@/shared/components/PdfPreviewDialog'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import { toast } from '@/shared/utils/toast'
import {
  FileOutput,
  History,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { transportDocumentService } from '@/features/admin/services/transportDocumentService'
import type {
  CargoRow,
  TransportDocumentPayloadMap,
  TransportDocumentRecord,
  TransportDocumentType,
} from '@/features/admin/types/transportDocument.types'
import {
  createEmptyTransportDocuments,
  emptyCargoRow,
  parseTransportDocument,
} from './transportDocumentSchemas'

type FieldKind = 'date' | 'datetime-local' | 'text' | 'textarea'

interface FieldSpec {
  key: string
  label: string
  kind?: FieldKind
  placeholder?: string
  span?: 1 | 2 | 3
}

interface FieldSection {
  title: string
  description?: string
  fields: FieldSpec[]
}

const DOCUMENTS: Array<{
  type: TransportDocumentType
  shortLabel: string
  label: string
  description: string
}> = [
  {
    type: 'an',
    shortLabel: 'AN',
    label: 'Arrival Notice',
    description: 'Incoming shipment notification',
  },
  {
    type: 'booking',
    shortLabel: 'Booking',
    label: 'Booking Confirmation',
    description: 'Confirmed shipment schedule',
  },
  {
    type: 'do',
    shortLabel: 'DO',
    label: 'Delivery Order',
    description: 'Cargo release instruction',
  },
]

const FORM_SECTIONS: Record<TransportDocumentType, FieldSection[]> = {
  an: [
    {
      title: 'Document',
      fields: [
        { key: 'agent', label: 'Agent' },
        { key: 'date', label: 'Date', kind: 'date' },
        { key: 'anNumber', label: 'AN No.' },
      ],
    },
    {
      title: 'Parties',
      fields: [
        { key: 'shipper', label: 'Shipper', kind: 'textarea' },
        { key: 'consignee', label: 'Consignee', kind: 'textarea' },
        { key: 'notifyParty', label: 'Notify party', kind: 'textarea' },
      ],
    },
    {
      title: 'Shipment references',
      fields: [
        { key: 'mblNumber', label: 'MBL No.' },
        { key: 'hblNumber', label: 'HBL No.' },
        { key: 'shipmentNumber', label: 'Shipment No.' },
        { key: 'vesselVoyage', label: 'Vessel / Voyage No.' },
        { key: 'etdEta', label: 'ETD / ETA' },
        { key: 'cfsTerminal', label: 'CFS terminal' },
        { key: 'referenceNumber', label: 'Reference No.' },
        { key: 'billOfLadingType', label: 'Type of B/L' },
        { key: 'serviceMode', label: 'Service mode' },
      ],
    },
    {
      title: 'Routing',
      fields: [
        { key: 'placeOfReceipt', label: 'Place of receipt' },
        { key: 'portOfLoading', label: 'Port of loading' },
        { key: 'portOfDischarge', label: 'Port of discharge' },
        { key: 'placeOfDelivery', label: 'Place of delivery' },
        { key: 'finalDestination', label: 'Final destination' },
      ],
    },
    {
      title: 'Cargo notes',
      fields: [
        { key: 'marks', label: 'Marks', kind: 'textarea', span: 2 },
        { key: 'volume', label: 'Volume' },
        { key: 'note', label: 'Note', kind: 'textarea', span: 3 },
        {
          key: 'customerAttention',
          label: "For customer's attention",
          kind: 'textarea',
          span: 3,
        },
      ],
    },
  ],
  do: [
    {
      title: 'Document',
      fields: [
        { key: 'doNumber', label: 'DO No.' },
        { key: 'date', label: 'Date', kind: 'date' },
        { key: 'to', label: 'To', kind: 'textarea' },
      ],
    },
    {
      title: 'Delivery parties',
      fields: [
        {
          key: 'deliverTo',
          label: 'Deliver shipment to',
          kind: 'textarea',
          span: 2,
        },
        { key: 'notifyParty', label: 'Notify party', kind: 'textarea' },
      ],
    },
    {
      title: 'Shipment references',
      fields: [
        { key: 'mblNumber', label: 'MBL No.' },
        { key: 'hblNumber', label: 'HBL No.' },
        { key: 'shipmentNumber', label: 'Shipment No.' },
        { key: 'vesselVoyage', label: 'Vessel / Voyage No.' },
        { key: 'etd', label: 'ETD', kind: 'date' },
        { key: 'eta', label: 'ETA', kind: 'date' },
        { key: 'serviceMode', label: 'Service mode' },
        { key: 'cfsTerminal', label: 'CFS terminal' },
      ],
    },
    {
      title: 'Routing',
      fields: [
        { key: 'placeOfReceipt', label: 'Place of receipt' },
        { key: 'portOfLoading', label: 'Port of loading' },
        { key: 'portOfDischarge', label: 'Port of discharge' },
        { key: 'placeOfDelivery', label: 'Place of delivery' },
        { key: 'finalDestination', label: 'Final destination' },
      ],
    },
    {
      title: 'Cargo notes',
      fields: [
        { key: 'marks', label: 'Marks', kind: 'textarea', span: 2 },
        { key: 'volume', label: 'Volume' },
        { key: 'note', label: 'Note', kind: 'textarea', span: 3 },
        {
          key: 'customerAttention',
          label: "For customer's attention",
          kind: 'textarea',
          span: 3,
        },
      ],
    },
  ],
  booking: [
    {
      title: 'Confirmation',
      fields: [
        { key: 'date', label: 'Date', kind: 'date' },
        { key: 'bookingNumber', label: 'Booking No.' },
        { key: 'to', label: 'To', kind: 'textarea' },
      ],
    },
    {
      title: 'Schedule and routing',
      fields: [
        { key: 'vesselVoyage', label: 'Vessel / Voyage' },
        { key: 'etd', label: 'ETD', kind: 'date' },
        { key: 'eta', label: 'ETA', kind: 'date' },
        { key: 'placeOfReceipt', label: 'Place of receipt' },
        { key: 'portOfLoading', label: 'Port of loading' },
        { key: 'portOfDischarge', label: 'Port of discharge' },
        { key: 'placeOfDelivery', label: 'Place of delivery' },
        { key: 'transitPort', label: 'Transit port' },
      ],
    },
    {
      title: 'Pickup and cut-offs',
      fields: [
        { key: 'pickupDate', label: 'Date of pickup', kind: 'date' },
        { key: 'pickupPlace', label: 'Place of pickup' },
        { key: 'dropoffPlace', label: 'Place of drop-off' },
        { key: 'closingTime', label: 'Closing time', kind: 'datetime-local' },
        { key: 'siCutoff', label: 'SI cut-off', kind: 'datetime-local' },
        { key: 'vgmCutoff', label: 'VGM cut-off', kind: 'datetime-local' },
      ],
    },
    {
      title: 'Cargo and vessel',
      fields: [
        { key: 'commodity', label: 'Commodity', kind: 'textarea' },
        { key: 'volume', label: 'Volume' },
        { key: 'grossWeight', label: 'Gross weight (KGS)' },
        { key: 'measurement', label: 'Measurement (CBM)' },
        { key: 'motherVessel', label: 'Mother vessel' },
        { key: 'motherVoyage', label: 'Mother voyage' },
        {
          key: 'specialRemark',
          label: 'Special remark',
          kind: 'textarea',
          span: 2,
        },
        { key: 'contact', label: 'Contact', kind: 'textarea' },
      ],
    },
    {
      title: 'Person in charge',
      fields: [{ key: 'pic', label: 'PIC', kind: 'textarea', span: 3 }],
    },
  ],
}

const spanClass: Record<NonNullable<FieldSpec['span']>, string> = {
  1: '',
  2: 'md:col-span-2',
  3: 'md:col-span-2 xl:col-span-3',
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FieldSpec
  value: string
  onChange: (value: string) => void
}) {
  const id = `transport-document-${field.key}`
  if (field.kind === 'textarea') {
    return (
      <Textarea
        id={id}
        value={value}
        rows={3}
        maxLength={2_000}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        className='min-h-20 resize-y bg-background'
      />
    )
  }
  return (
    <Input
      id={id}
      type={
        field.kind === 'date' || field.kind === 'datetime-local'
          ? field.kind
          : 'text'
      }
      value={value}
      maxLength={500}
      placeholder={field.placeholder}
      onChange={(event) => onChange(event.target.value)}
      className='bg-background'
    />
  )
}

function CargoRowsEditor({
  rows,
  onChange,
}: {
  rows: CargoRow[]
  onChange: (rows: CargoRow[]) => void
}) {
  const updateRow = (index: number, field: keyof CargoRow, value: string) => {
    onChange(
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    )
  }

  return (
    <section className='space-y-3 border-t border-border/60 pt-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-sm font-semibold'>Cargo / container rows</h2>
          <p className='text-xs text-muted-foreground'>
            Up to 20 rows. Values print exactly as entered.
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={rows.length >= 20}
          onClick={() => onChange([...rows, emptyCargoRow()])}
        >
          <Plus className='mr-1.5 h-4 w-4' /> Add row
        </Button>
      </div>
      <div className='overflow-x-auto rounded-md border border-border/70'>
        <div className='min-w-[920px]'>
          <div className='grid grid-cols-[1.25fr_.7fr_1.5fr_.85fr_.85fr_2.5rem] gap-px bg-border text-[0.68rem] font-semibold tracking-wide text-muted-foreground uppercase'>
            {[
              'Container / Seal No.',
              'Quantity',
              'Description of goods',
              'Gross weight',
              'Measurement',
              '',
            ].map((label) => (
              <div key={label || 'actions'} className='bg-muted/70 px-2.5 py-2'>
                {label}
              </div>
            ))}
          </div>
          {rows.map((row, index) => (
            <div
              key={index}
              className='grid grid-cols-[1.25fr_.7fr_1.5fr_.85fr_.85fr_2.5rem] gap-px border-t border-border/70 bg-border'
            >
              {(Object.keys(row) as Array<keyof CargoRow>).map((field) => (
                <Input
                  key={field}
                  value={row[field]}
                  maxLength={field === 'descriptionOfGoods' ? 2_000 : 500}
                  aria-label={`${field}, cargo row ${index + 1}`}
                  onChange={(event) =>
                    updateRow(index, field, event.target.value)
                  }
                  className='h-9 rounded-none border-0 bg-background focus-visible:relative'
                />
              ))}
              <div className='flex items-center justify-center bg-background'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 text-muted-foreground hover:text-destructive'
                  disabled={rows.length === 1}
                  onClick={() =>
                    onChange(rows.filter((_, rowIndex) => rowIndex !== index))
                  }
                  aria-label={`Remove cargo row ${index + 1}`}
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function TransportDocumentsScreen() {
  const [documentType, setDocumentType] = useState<TransportDocumentType>('an')
  const [forms, setForms] = useState<TransportDocumentPayloadMap>(
    createEmptyTransportDocuments
  )
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [historyRecords, setHistoryRecords] = useState<
    TransportDocumentRecord[]
  >([])
  const [historyPage, setHistoryPage] = useState(0)
  const [historyTotalPages, setHistoryTotalPages] = useState(0)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const document =
    DOCUMENTS.find((item) => item.type === documentType) ?? DOCUMENTS[0]
  const activePayload = forms[documentType]
  const activeRecord = activePayload as unknown as Record<string, unknown>

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const loadHistory = useCallback(async () => {
    try {
      const page = await transportDocumentService.history({
        type: documentType,
        page: historyPage,
        size: 10,
      })
      setHistoryRecords(page.content)
      setHistoryTotalPages(page.totalPages)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to load document history'
      )
    } finally {
      setIsLoadingHistory(false)
    }
  }, [documentType, historyPage])

  useEffect(() => {
    let active = true
    void transportDocumentService
      .history({ type: documentType, page: historyPage, size: 10 })
      .then((page) => {
        if (!active) return
        setHistoryRecords(page.content)
        setHistoryTotalPages(page.totalPages)
      })
      .catch((error: unknown) => {
        if (!active) return
        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to load document history'
        )
      })
    return () => {
      active = false
    }
  }, [documentType, historyPage])

  const fileName = useMemo(() => {
    const reference =
      documentType === 'an'
        ? forms.an.anNumber
        : documentType === 'booking'
          ? forms.booking.bookingNumber
          : forms.do.doNumber
    const safeReference = reference.trim().replace(/[^a-z0-9_-]+/gi, '-')
    return `${document.shortLabel.replace(/[^a-z0-9]+/gi, '-')}${safeReference ? `-${safeReference}` : ''}.pdf`
  }, [document, documentType, forms])

  const updateField = (key: string, value: string) => {
    setForms(
      (previous) =>
        ({
          ...previous,
          [documentType]: { ...previous[documentType], [key]: value },
        }) as TransportDocumentPayloadMap
    )
  }

  const setCargoRows = (rows: CargoRow[]) => {
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
    const empty = createEmptyTransportDocuments()[documentType]
    setForms(
      (previous) =>
        ({ ...previous, [documentType]: empty }) as TransportDocumentPayloadMap
    )
    setPreviewOpen(false)
    setPreviewUrl(null)
  }

  const handleDocumentTypeChange = (type: TransportDocumentType) => {
    setDocumentType(type)
    setHistoryPage(0)
    setHistoryRecords([])
    setHistoryTotalPages(0)
    setPreviewOpen(false)
    setPreviewUrl(null)
  }

  const handlePreview = async () => {
    let validated: TransportDocumentPayloadMap[typeof documentType]
    try {
      validated = parseTransportDocument(documentType, activePayload)
    } catch (error) {
      const message =
        error instanceof z.ZodError
          ? (error.issues[0]?.message ?? 'Please review the form values')
          : 'Please review the form values'
      toast.error(message)
      return
    }

    setIsGenerating(true)
    setPreviewUrl(null)
    setPreviewOpen(true)
    try {
      const pdf = await transportDocumentService.preview(
        documentType,
        validated
      )
      await transportDocumentService.create(documentType, validated)
      setPreviewUrl(URL.createObjectURL(pdf))
      if (historyPage === 0) {
        await loadHistory()
      } else {
        setHistoryPage(0)
      }
      toast.success(`${document.label} record created`)
    } catch (error) {
      setPreviewOpen(false)
      toast.error(
        error instanceof Error ? error.message : 'Failed to build PDF preview'
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const cargoRows =
    documentType === 'an'
      ? forms.an.cargoRows
      : documentType === 'do'
        ? forms.do.cargoRows
        : null

  return (
    <div className='mx-auto max-w-7xl space-y-5 pb-8'>
      <header className='flex flex-col gap-4 border-b border-border/60 pb-5 lg:flex-row lg:items-end lg:justify-between'>
        <div className='space-y-1'>
          <h1 className='text-xl font-semibold tracking-tight'>
            Transport documents
          </h1>
          <p className='max-w-2xl text-sm leading-relaxed text-muted-foreground'>
            Enter document details manually, then render the official PDF with
            the shared EPDA heading artwork.
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={resetActiveForm}
            disabled={isGenerating}
          >
            <RotateCcw className='mr-1.5 h-4 w-4' /> Reset {document.shortLabel}
          </Button>
          <Button
            type='button'
            size='sm'
            onClick={handlePreview}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
            ) : (
              <FileOutput className='mr-1.5 h-4 w-4' />
            )}
            Create & Preview
          </Button>
        </div>
      </header>

      <nav
        className='grid grid-cols-1 gap-2 sm:grid-cols-3'
        aria-label='Document type'
      >
        {DOCUMENTS.map((item) => {
          const selected = item.type === documentType
          return (
            <button
              key={item.type}
              type='button'
              aria-pressed={selected}
              disabled={isGenerating}
              onClick={() => handleDocumentTypeChange(item.type)}
              className={`rounded-md border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${selected ? 'border-primary bg-primary/5' : 'border-border/70 hover:bg-muted/60'}`}
            >
              <span
                className={`block text-sm font-semibold ${selected ? 'text-primary' : 'text-foreground'}`}
              >
                {item.label}
              </span>
              <span className='mt-0.5 block text-xs text-muted-foreground'>
                {item.description}
              </span>
            </button>
          )
        })}
      </nav>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void handlePreview()
        }}
        className='space-y-5'
      >
        {FORM_SECTIONS[documentType].map((section) => (
          <section
            key={section.title}
            className='space-y-3 border-t border-border/60 pt-5 first:border-t-0 first:pt-0'
          >
            <div>
              <h2 className='text-sm font-semibold'>{section.title}</h2>
              {section.description ? (
                <p className='text-xs text-muted-foreground'>
                  {section.description}
                </p>
              ) : null}
            </div>
            <div className='grid gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-3'>
              {section.fields.map((field) => (
                <div
                  key={field.key}
                  className={`space-y-1.5 ${spanClass[field.span ?? 1]}`}
                >
                  <Label
                    htmlFor={`transport-document-${field.key}`}
                    className='text-xs font-medium text-muted-foreground'
                  >
                    {field.label}
                  </Label>
                  <FieldControl
                    field={field}
                    value={String(activeRecord[field.key] ?? '')}
                    onChange={(value) => updateField(field.key, value)}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}

        {cargoRows ? (
          <CargoRowsEditor rows={cargoRows} onChange={setCargoRows} />
        ) : null}

        <div className='sticky bottom-3 flex justify-end border-t border-border/60 bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
          <Button type='submit' disabled={isGenerating}>
            {isGenerating ? (
              <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
            ) : (
              <FileOutput className='mr-1.5 h-4 w-4' />
            )}
            Create & Preview {document.shortLabel}
          </Button>
        </div>
      </form>

      <section className='space-y-3 border-t border-border/60 pt-5'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <h2 className='flex items-center gap-2 text-sm font-semibold'>
              <History className='h-4 w-4' />
              {document.label} history
            </h2>
            <p className='text-xs text-muted-foreground'>
              Immutable records created from this form.
            </p>
          </div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              setIsLoadingHistory(true)
              void loadHistory()
            }}
            disabled={isLoadingHistory}
          >
            {isLoadingHistory ? (
              <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
            ) : (
              <RefreshCw className='mr-1.5 h-4 w-4' />
            )}
            Refresh
          </Button>
        </div>

        <div className='overflow-hidden rounded-md border border-border/70'>
          <div className='grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 bg-muted/70 px-3 py-2 text-xs font-semibold text-muted-foreground'>
            <span>Reference</span>
            <span>Created by</span>
            <span>Created at</span>
          </div>
          {historyRecords.length === 0 && !isLoadingHistory ? (
            <p className='px-3 py-6 text-center text-sm text-muted-foreground'>
              No {document.shortLabel} records yet.
            </p>
          ) : (
            historyRecords.map((record) => (
              <div
                key={record.id}
                className='grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 border-t border-border/60 px-3 py-2.5 text-sm'
              >
                <span className='truncate font-medium'>
                  {record.referenceNumber || `Record #${record.id}`}
                </span>
                <span className='truncate text-muted-foreground'>
                  {record.createdBy?.fullName ||
                    record.createdBy?.email ||
                    `User #${record.createdByUserId}`}
                </span>
                <time
                  dateTime={record.createdAt}
                  className='whitespace-nowrap text-xs text-muted-foreground'
                >
                  {new Date(record.createdAt).toLocaleString()}
                </time>
              </div>
            ))
          )}
        </div>

        {historyTotalPages > 1 ? (
          <div className='flex items-center justify-end gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={historyPage === 0 || isLoadingHistory}
              onClick={() => setHistoryPage((page) => Math.max(0, page - 1))}
            >
              Previous
            </Button>
            <span className='text-xs text-muted-foreground'>
              Page {historyPage + 1} of {historyTotalPages}
            </span>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={
                historyPage + 1 >= historyTotalPages || isLoadingHistory
              }
              onClick={() => setHistoryPage((page) => page + 1)}
            >
              Next
            </Button>
          </div>
        ) : null}
      </section>

      <PdfPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        previewUrl={previewUrl}
        fileName={fileName}
        isGenerating={isGenerating}
        loadingLabel={`Building ${document.label} preview…`}
      />
    </div>
  )
}
