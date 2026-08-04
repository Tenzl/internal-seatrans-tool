import { DateTimePicker } from '@/shared/components/DateTimePicker'
import { Anchor, Box, FileText, Plus, Route, Ship, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AsyncSearchSelect, type SearchSelectOption } from './AsyncSearchSelect'
import type { BookingShippingFieldKey } from './bookingShippingForm'
import type {
  BookingShippingUpsertRequest,
  BookingTransitLegRequest,
} from './bookingShippingTypes'

export type BookingShippingSectionId =
  | 'booking'
  | 'routing'
  | 'vessel'
  | 'cargo'
  | 'transit'
  | 'terms'

const SECTIONS: {
  id: BookingShippingSectionId
  label: string
  icon: typeof Ship
}[] = [
  { id: 'booking', label: 'Booking', icon: FileText },
  { id: 'routing', label: 'Routing', icon: Route },
  { id: 'vessel', label: 'Vessel', icon: Ship },
  { id: 'cargo', label: 'Cargo', icon: Box },
  { id: 'transit', label: 'Transit', icon: Anchor },
  { id: 'terms', label: 'Terms', icon: FileText },
]

type BookingShippingEditorProps = {
  activeSection: BookingShippingSectionId
  form: BookingShippingUpsertRequest
  portLabelById: Map<number, string>
  portOptions: SearchSelectOption[]
  portSearch: string
  portSearchReady: boolean
  portOptionsFetching: boolean
  portOptionsFetchingNextPage: boolean
  portOptionsHasMore: boolean
  portFieldsDisabled: boolean
  onActiveSectionChange: (section: BookingShippingSectionId) => void
  onPortSearchChange: (search: string) => void
  onLoadMorePortOptions: () => void
  onFieldChange: (
    key: BookingShippingFieldKey,
    value: string | number | null
  ) => void
  onUpdateLeg: (index: number, patch: Partial<BookingTransitLegRequest>) => void
  onAddLeg: () => void
  onRemoveLeg: (index: number) => void
}

export function BookingShippingEditor({
  activeSection,
  form,
  portLabelById,
  portOptions,
  portSearch,
  portSearchReady,
  portOptionsFetching,
  portOptionsFetchingNextPage,
  portOptionsHasMore,
  portFieldsDisabled,
  onActiveSectionChange,
  onPortSearchChange,
  onLoadMorePortOptions,
  onFieldChange,
  onUpdateLeg,
  onAddLeg,
  onRemoveLeg,
}: BookingShippingEditorProps) {
  const portField = (
    label: string,
    field:
      | 'placeOfReceiptPortId'
      | 'portOfLoadingPortId'
      | 'portOfDischargePortId'
      | 'placeOfDeliveryPortId'
      | 'finalDestinationPortId',
    required = false
  ) => (
    <AsyncSearchSelect
      label={required ? `${label} *` : label}
      value={form[field]}
      selectedLabel={
        form[field] != null ? portLabelById.get(form[field]!) : null
      }
      options={portOptions}
      search={portSearch}
      onSearchChange={onPortSearchChange}
      isLoading={portOptionsFetching && portOptions.length === 0}
      isLoadingMore={portOptionsFetchingNextPage}
      hasMore={portOptionsHasMore}
      onLoadMore={onLoadMorePortOptions}
      disabled={portFieldsDisabled}
      placeholder='Type port name…'
      requireSearch
      idleMessage='Type a port name to search (max 10 results).'
      emptyMessage='No port found.'
      onChange={(id) => onFieldChange(field, id)}
    />
  )

  return (
    <>
      <nav
        className='flex gap-1 overflow-x-auto border-b border-border/60 pb-px'
        aria-label='Shipping sections'
      >
        {SECTIONS.map((section) => {
          const Icon = section.icon
          const active = activeSection === section.id
          return (
            <button
              key={section.id}
              type='button'
              onClick={() => onActiveSectionChange(section.id)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors active:scale-[0.98]',
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className='h-3.5 w-3.5' strokeWidth={1.75} />
              {section.label}
            </button>
          )
        })}
      </nav>

      {activeSection === 'booking' ? (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <FormField
            label='Booking no. *'
            value={form.bookingNo}
            onChange={(value) => onFieldChange('bookingNo', value)}
          />
          <FormField
            label='Booking to'
            value={form.bookingTo}
            onChange={(value) => onFieldChange('bookingTo', value)}
          />
          <FormField
            label='Reference'
            value={form.bookingNumberReference}
            onChange={(value) => onFieldChange('bookingNumberReference', value)}
          />
          <FormField
            label='Service mode'
            value={form.serviceMode}
            onChange={(value) => onFieldChange('serviceMode', value)}
          />
          <FormField
            label='Freight terms'
            value={form.freightTerms}
            onChange={(value) => onFieldChange('freightTerms', value)}
          />
          <FormField
            label='Carrier'
            value={form.carrier}
            onChange={(value) => onFieldChange('carrier', value)}
          />
          <FormField
            label='Provider'
            value={form.provider}
            onChange={(value) => onFieldChange('provider', value)}
          />
          <FormField
            label='Date of creation'
            value={form.dateOfCreation}
            onChange={(value) => onFieldChange('dateOfCreation', value)}
            type='date'
          />
          <div className='sm:col-span-2 lg:col-span-3'>
            <FormField
              label='Note'
              value={form.bookingNote}
              onChange={(value) => onFieldChange('bookingNote', value)}
              multiline
            />
          </div>
        </div>
      ) : null}

      {activeSection === 'routing' ? (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {portField('Place of receipt', 'placeOfReceiptPortId', true)}
          {portField('Port of loading', 'portOfLoadingPortId')}
          {portField('Port of discharge', 'portOfDischargePortId')}
          {portField('Place of delivery', 'placeOfDeliveryPortId', true)}
          {portField('Final destination', 'finalDestinationPortId')}
          <FormField
            label='ETD'
            value={form.etd}
            onChange={(value) => onFieldChange('etd', value)}
            type='datetime-local'
          />
          <FormField
            label='ETA'
            value={form.eta}
            onChange={(value) => onFieldChange('eta', value)}
            type='datetime-local'
          />
          <FormField
            label='Pick up'
            value={form.pickUp}
            onChange={(value) => onFieldChange('pickUp', value)}
          />
          <FormField
            label='Date of pick up'
            value={form.dateOfPickUp}
            onChange={(value) => onFieldChange('dateOfPickUp', value)}
            type='date'
          />
          <div className='sm:col-span-2 lg:col-span-3'>
            <FormField
              label='Drop-off warehouse'
              value={form.dropOffWarehouse}
              onChange={(value) => onFieldChange('dropOffWarehouse', value)}
            />
          </div>
        </div>
      ) : null}

      {activeSection === 'vessel' ? (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <FormField
            label='Feeder vessel'
            value={form.feederVessel}
            onChange={(value) => onFieldChange('feederVessel', value)}
          />
          <FormField
            label='Feeder voyage'
            value={form.feederVoyage}
            onChange={(value) => onFieldChange('feederVoyage', value)}
          />
          <FormField
            label='Mother vessel'
            value={form.motherVessel}
            onChange={(value) => onFieldChange('motherVessel', value)}
          />
          <FormField
            label='Mother voyage'
            value={form.motherVoyage}
            onChange={(value) => onFieldChange('motherVoyage', value)}
          />
          <FormField
            label='CY cut-off'
            value={form.cyCutOff}
            onChange={(value) => onFieldChange('cyCutOff', value)}
            type='datetime-local'
          />
          <FormField
            label='SI cut-off'
            value={form.siCutOff}
            onChange={(value) => onFieldChange('siCutOff', value)}
            type='datetime-local'
          />
          <FormField
            label='VGM cut-off'
            value={form.vgmCutOff}
            onChange={(value) => onFieldChange('vgmCutOff', value)}
            type='datetime-local'
          />
          <FormField
            label='Gate in'
            value={form.gateIn}
            onChange={(value) => onFieldChange('gateIn', value)}
            type='datetime-local'
          />
          <FormField
            label='Temp'
            value={form.temp}
            onChange={(value) => onFieldChange('temp', value)}
          />
          <FormField
            label='Vent'
            value={form.vent}
            onChange={(value) => onFieldChange('vent', value)}
          />
        </div>
      ) : null}

      {activeSection === 'cargo' ? (
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          <FormField
            label='Cargo type'
            value={form.cargoType}
            onChange={(value) => onFieldChange('cargoType', value)}
          />
          <FormField
            label='Cargo name'
            value={form.cargoName}
            onChange={(value) => onFieldChange('cargoName', value)}
          />
          <FormField
            label='Volume'
            value={form.volume}
            onChange={(value) => onFieldChange('volume', value)}
          />
          <FormField
            label='Gross weight (kg)'
            value={form.grossWeightKgs}
            onChange={(value) => onFieldChange('grossWeightKgs', value)}
          />
          <FormField
            label='CBM'
            value={form.measurementCbm}
            onChange={(value) => onFieldChange('measurementCbm', value)}
          />
          <FormField
            label='Contact'
            value={form.contact}
            onChange={(value) => onFieldChange('contact', value)}
          />
        </div>
      ) : null}

      {activeSection === 'transit' ? (
        <div className='space-y-3'>
          <div className='flex justify-end'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={onAddLeg}
              className='active:scale-[0.98]'
            >
              <Plus className='mr-1 h-4 w-4' />
              Add leg
            </Button>
          </div>
          {form.transitLegs.length === 0 ? (
            <p className='text-sm text-muted-foreground'>
              No transit legs yet.
            </p>
          ) : null}
          {form.transitLegs.map((leg, index) => (
            <div
              key={`leg-${index}-${leg.portId}`}
              className='grid grid-cols-1 gap-3 rounded-lg border border-border/60 bg-muted/10 p-3 md:grid-cols-2 lg:grid-cols-4 lg:items-end'
            >
              <AsyncSearchSelect
                label={`Port (${leg.sortOrder})`}
                value={leg.portId}
                selectedLabel={portLabelById.get(leg.portId)}
                options={portOptions}
                search={portSearch}
                onSearchChange={onPortSearchChange}
                isLoading={portSearchReady && portOptionsFetching}
                isLoadingMore={portOptionsFetchingNextPage}
                hasMore={portOptionsHasMore}
                onLoadMore={onLoadMorePortOptions}
                placeholder='Type port name…'
                requireSearch
                idleMessage='Type a port name to search.'
                emptyMessage='No port found.'
                allowClear={false}
                onChange={(id) =>
                  id != null && onUpdateLeg(index, { portId: id })
                }
              />
              <FormField
                label='ETA'
                value={leg.eta}
                onChange={(value) => onUpdateLeg(index, { eta: value || null })}
                type='datetime-local'
              />
              <FormField
                label='ETD'
                value={leg.etd}
                onChange={(value) => onUpdateLeg(index, { etd: value || null })}
                type='datetime-local'
              />
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='text-destructive active:scale-[0.98]'
                onClick={() => onRemoveLeg(index)}
                aria-label='Remove leg'
              >
                <Trash2 className='h-4 w-4' />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      {activeSection === 'terms' ? (
        <div className='grid gap-4'>
          <FormField
            label='Special remark'
            value={form.specialRemark}
            onChange={(value) => onFieldChange('specialRemark', value)}
            multiline
          />
          <FormField
            label='Terms and conditions'
            value={form.termsAndConditions}
            onChange={(value) => onFieldChange('termsAndConditions', value)}
            multiline
          />
        </div>
      ) : null}
    </>
  )
}

function FormField({
  label,
  value,
  onChange,
  type = 'text',
  multiline = false,
}: {
  label: string
  value: string | number | null | undefined
  onChange: (value: string) => void
  type?: string
  multiline?: boolean
}) {
  return (
    <div className='space-y-1.5'>
      <Label className='text-xs font-medium text-muted-foreground'>
        {label}
      </Label>
      {multiline ? (
        <Textarea
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          className='min-h-[4.5rem] resize-y bg-background'
        />
      ) : type === 'date' || type === 'datetime-local' ? (
        <DateTimePicker
          value={String(value ?? '')}
          onValueChange={onChange}
          includeTime={type === 'datetime-local'}
        />
      ) : (
        <Input
          type={type}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
          className='h-9 bg-background'
        />
      )}
    </div>
  )
}
