import { FileOutput, Loader2, RotateCcw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AnContainersEditor } from './AnContainersEditor'
import { CargoRowsEditor } from './CargoRowsEditor'
import { CargoVolumeEditor } from './CargoVolumeEditor'
import {
  compactCargoVolumes,
  formatCargoVolumes,
  normalizeBookingCargoVolumes,
  type CargoVolumes,
} from './cargoVolumeModel'
import { TransportDocumentField } from './TransportDocumentField'
import type {
  AnContainer,
  CargoRow,
  TransportDocumentType,
} from './transportDocument.types'
import {
  BL_FORM_VARIANT_OPTIONS,
  getTransportDocumentDefinition,
  TRANSPORT_DOCUMENT_FORM_SECTIONS,
  type TransportDocumentFieldSpec,
} from './transportDocumentFormConfig'
import {
  applyNotifySameAsConsignee,
  asPartyId,
  canEnableNotifySameAsConsignee,
  syncNotifyFromConsigneeEdit,
} from './notifyPartySameAsConsignee'

interface TransportDocumentFormProps {
  documentType: TransportDocumentType
  values: Record<string, unknown>
  cargoRows: CargoRow[] | null
  containers: AnContainer[] | null
  isGenerating: boolean
  isSaving?: boolean
  isDownloading?: boolean
  onFieldChange: (key: string, value: unknown) => void
  /** Atomic multi-key update (preferred for Same as Consignee). */
  onFieldsChange?: (patch: Record<string, unknown>) => void
  onCargoRowsChange: (rows: CargoRow[]) => void
  onContainersChange: (rows: AnContainer[]) => void
  onSubmit: () => void
  onDownload: () => void
  onReset: () => void
  submitLabel?: string
  resetLabel?: string
  submitDisabled?: boolean
}

export function TransportDocumentForm({
  documentType,
  values,
  cargoRows,
  containers,
  isGenerating,
  isSaving = false,
  isDownloading = false,
  onFieldChange,
  onFieldsChange,
  onCargoRowsChange,
  onContainersChange,
  onSubmit,
  onDownload,
  onReset,
  submitLabel,
  resetLabel,
  submitDisabled = false,
}: TransportDocumentFormProps) {
  const document = getTransportDocumentDefinition(documentType)
  const notifySameAsConsignee =
    documentType === 'an' && values.notifyPartySameAsConsignee === true
  const blFormVariant =
    typeof values.blFormVariant === 'string' && values.blFormVariant
      ? values.blFormVariant
      : 'non_negotiable'

  const bookingVolumes =
    documentType === 'booking'
      ? normalizeBookingCargoVolumes({
          cargoVolumes:
            values.cargoVolumes && typeof values.cargoVolumes === 'object'
              ? (values.cargoVolumes as CargoVolumes)
              : {},
          volume:
            typeof values.volume === 'string' ? values.volume : undefined,
        }).cargoVolumes
      : {}

  const patchFields = (patch: Record<string, unknown>) => {
    if (onFieldsChange) {
      onFieldsChange(patch)
      return
    }
    for (const [key, value] of Object.entries(patch)) {
      onFieldChange(key, value)
    }
  }

  const updateField = (key: string, value: unknown) => {
    if (documentType === 'an' && notifySameAsConsignee) {
      const mirrored = syncNotifyFromConsigneeEdit(key, value)
      if (mirrored) {
        patchFields({ [key]: value, ...mirrored })
        return
      }
    }
    onFieldChange(key, value)
  }

  const updateNotifySameAsConsignee = (checked: boolean) => {
    patchFields(applyNotifySameAsConsignee(values, checked))
  }

  const renderField = (
    field: TransportDocumentFieldSpec,
    options?: { disabled?: boolean }
  ) => (
    <TransportDocumentField
      key={field.key}
      field={field}
      value={String(values[field.key] ?? '')}
      selectedPartyId={asPartyId(
        field.partyIdKey ? values[field.partyIdKey] : null
      )}
      disabled={
        options?.disabled === true ||
        field.syncedFromAn === true ||
        (documentType === 'an' &&
          field.key === 'notifyParty' &&
          notifySameAsConsignee)
      }
      onChange={(value) => updateField(field.key, value)}
      onPartyIdChange={
        field.partyIdKey
          ? (value) => updateField(field.partyIdKey!, value)
          : undefined
      }
    />
  )

  const notifySameDisabled =
    !notifySameAsConsignee && !canEnableNotifySameAsConsignee(values)

  const renderNotifySameAsConsignee = () => (
    <div className='flex items-center justify-end gap-2'>
      <Checkbox
        id='transport-document-notify-same-as-consignee'
        checked={notifySameAsConsignee}
        disabled={notifySameDisabled}
        onCheckedChange={(checked) =>
          updateNotifySameAsConsignee(checked === true)
        }
      />
      <Label
        className={
          notifySameDisabled
            ? 'cursor-not-allowed text-base opacity-50'
            : 'cursor-pointer text-base'
        }
        onClick={() => {
          if (notifySameDisabled) return
          updateNotifySameAsConsignee(!notifySameAsConsignee)
        }}
      >
        Same as Consignee
      </Label>
    </div>
  )

  const renderAnParties = (fields: TransportDocumentFieldSpec[]) => {
    const byKey = Object.fromEntries(fields.map((field) => [field.key, field]))
    const shipper = byKey.shipper
    const consignee = byKey.consignee
    const notifyParty = byKey.notifyParty
    const agent = byKey.agent

    return (
      <div className='grid gap-x-4 gap-y-3 md:grid-cols-2'>
        <div className='space-y-3'>
          {shipper ? renderField(shipper) : null}
          {consignee ? renderField(consignee) : null}
          {renderNotifySameAsConsignee()}
          {notifyParty ? renderField(notifyParty) : null}
        </div>
        <div className='space-y-3'>{agent ? renderField(agent) : null}</div>
      </div>
    )
  }

  /** BL parties: 2 columns with generous spacing (Consignor/Consignee | Notify). */
  const renderBlParties = (fields: TransportDocumentFieldSpec[]) => {
    const byKey = Object.fromEntries(fields.map((field) => [field.key, field]))
    const consignor = byKey.consignor
    const consignedToOrderOf = byKey.consignedToOrderOf
    const notifyAddress = byKey.notifyAddress

    return (
      <div className='grid gap-x-8 gap-y-6 md:grid-cols-2'>
        <div className='space-y-6'>
          {consignor ? renderField(consignor) : null}
          {consignedToOrderOf ? renderField(consignedToOrderOf) : null}
        </div>
        <div className='space-y-6'>
          {notifyAddress ? renderField(notifyAddress) : null}
        </div>
      </div>
    )
  }

  const renderBookingCargo = (fields: TransportDocumentFieldSpec[]) => {
    const byKey = Object.fromEntries(fields.map((field) => [field.key, field]))
    const commodity = byKey.commodity
    const grossWeight = byKey.grossWeight
    const measurement = byKey.measurement
    const specialRemark = byKey.specialRemark

    return (
      <div className='space-y-4'>
        <CargoVolumeEditor
          volumes={bookingVolumes}
          onChange={(next) => {
            const compact = compactCargoVolumes(next)
            updateField('cargoVolumes', compact)
            updateField('volume', formatCargoVolumes(compact))
          }}
        />
        <div className='grid gap-x-4 gap-y-3 md:grid-cols-2'>
          {commodity ? renderField(commodity) : null}
          {grossWeight ? renderField(grossWeight) : null}
          {measurement ? renderField(measurement) : null}
          {specialRemark ? renderField(specialRemark) : null}
        </div>
      </div>
    )
  }

  /**
   * AN Route: keep row 1 as two equal fields (receipt + loading). Put discharge
   * on row 2 with delivery and final destination (3 columns), so xl:grid-cols-3
   * does not pull discharge onto row 1.
   */
  const renderAnRoute = (fields: TransportDocumentFieldSpec[]) => {
    const byKey = Object.fromEntries(fields.map((field) => [field.key, field]))
    const placeOfReceipt = byKey.placeOfReceipt
    const portOfLoading = byKey.portOfLoading
    const portOfDischarge = byKey.portOfDischarge
    const placeOfDelivery = byKey.placeOfDelivery
    const finalDestination = byKey.finalDestination

    return (
      <div className='space-y-3'>
        <div className='grid gap-x-4 gap-y-3 md:grid-cols-3'>
          {placeOfReceipt ? renderField(placeOfReceipt) : null}
          {portOfLoading ? renderField(portOfLoading) : null}
          <div aria-hidden className='hidden md:block' />
        </div>
        <div className='grid gap-x-4 gap-y-3 md:grid-cols-3'>
          {portOfDischarge ? renderField(portOfDischarge) : null}
          {placeOfDelivery ? renderField(placeOfDelivery) : null}
          {finalDestination ? renderField(finalDestination) : null}
        </div>
      </div>
    )
  }

  const renderAnCargo = (fields: TransportDocumentFieldSpec[]) => (
    <div className='space-y-4'>
      {containers ? (
        <AnContainersEditor
          rows={containers}
          onChange={onContainersChange}
        />
      ) : null}
      <div className='grid gap-x-4 gap-y-3 md:grid-cols-2'>
        {fields.map((field) => renderField(field))}
      </div>
    </div>
  )

  /**
   * BL cargo: containers + AN-synced fields stay read-only (`syncedFromAn`).
   * Shipping mark is BL-owned and editable here.
   */
  const renderBlCargo = (fields: TransportDocumentFieldSpec[]) => (
    <div className='space-y-4'>
      <p className='text-sm text-muted-foreground'>
        Containers and description are mapped from Arrival Notice. Shipping mark
        is edited on this form.
      </p>
      {containers ? (
        <AnContainersEditor
          rows={containers}
          onChange={onContainersChange}
          readOnly
        />
      ) : null}
      <div className='grid gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-3'>
        {fields.map((field) => renderField(field))}
      </div>
    </div>
  )

  /**
   * DO cargo: container rows mirror BL (read-only, AN-owned, up to 20 rows).
   * Description of goods is also AN-owned and read-only (`syncedFromAn` in
   * form config). marks / note / customerAttention stay DO-editable
   * (prefilled from AN, not continuously synced), matching existing DO
   * behavior.
   */
  const renderDoCargo = (fields: TransportDocumentFieldSpec[]) => (
    <div className='space-y-4'>
      {containers ? (
        <AnContainersEditor
          rows={containers}
          onChange={onContainersChange}
          readOnly
        />
      ) : null}
      <div className='grid gap-x-4 gap-y-3 md:grid-cols-2'>
        {fields.map((field) => renderField(field))}
      </div>
    </div>
  )

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className='space-y-5'
    >
      {TRANSPORT_DOCUMENT_FORM_SECTIONS[documentType].map((section) => (
        <section
          key={section.title}
          className='space-y-3 border-t border-border/60 pt-5 first:border-t-0 first:pt-0'
        >
          <div>
            <h2 className='text-base font-semibold'>{section.title}</h2>
            {section.description ? (
              <p className='text-sm text-muted-foreground'>
                {section.description}
              </p>
            ) : null}
          </div>
          {documentType === 'an' && section.title === 'Parties' ? (
            renderAnParties(section.fields)
          ) : documentType === 'bl' && section.title === 'Parties' ? (
            renderBlParties(section.fields)
          ) : documentType === 'an' && section.title === 'Route' ? (
            renderAnRoute(section.fields)
          ) : documentType === 'an' && section.title === 'Cargo' ? (
            renderAnCargo(section.fields)
          ) : documentType === 'bl' && section.title === 'Cargo' ? (
            renderBlCargo(section.fields)
          ) : documentType === 'do' && section.title === 'Cargo' ? (
            renderDoCargo(section.fields)
          ) : documentType === 'booking' && section.title === 'Cargo' ? (
            renderBookingCargo(section.fields)
          ) : (
            <div className='grid gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-3'>
              {section.fields.map((field) => renderField(field))}
            </div>
          )}
        </section>
      ))}

      {cargoRows ? (
        <CargoRowsEditor rows={cargoRows} onChange={onCargoRowsChange} />
      ) : null}

      <div
        className={
          documentType === 'bl'
            ? 'sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]'
            : 'sticky bottom-0 z-20 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]'
        }
      >
        {documentType === 'bl' ? (
          <div className='flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 sm:max-w-md sm:flex-initial'>
            <Label
              htmlFor='transport-document-bl-form-variant'
              className='shrink-0 text-sm font-medium text-muted-foreground'
            >
              BL form
            </Label>
            <Select
              value={blFormVariant}
              onValueChange={(next) => updateField('blFormVariant', next)}
            >
              <SelectTrigger
                id='transport-document-bl-form-variant'
                className='h-9 w-full min-w-[10.5rem] flex-1 bg-background sm:w-[14rem] sm:flex-initial'
              >
                <SelectValue placeholder='Select form' />
              </SelectTrigger>
              <SelectContent>
                {BL_FORM_VARIANT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className='ml-auto flex flex-wrap items-center justify-end gap-2 sm:ml-0'>
          <Button
            type='button'
            variant='outline'
            disabled={isGenerating}
            onClick={onReset}
          >
            <RotateCcw className='mr-1.5 h-4 w-4' />
            {resetLabel ?? 'Reset'}
          </Button>
          <Button
            type='button'
            variant='outline'
            disabled={isGenerating}
            onClick={onDownload}
          >
            {isDownloading ? (
              <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
            ) : (
              <FileOutput className='mr-1.5 h-4 w-4' />
            )}
            Download
          </Button>
          <Button
            type='submit'
            disabled={isGenerating || submitDisabled}
            className='shrink-0'
          >
            {isSaving ? (
              <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
            ) : (
              <Save className='mr-1.5 h-4 w-4' />
            )}
            {submitLabel ?? 'Save'}
          </Button>
        </div>
      </div>
    </form>
  )
}
