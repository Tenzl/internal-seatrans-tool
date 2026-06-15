'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Anchor,
  Box,
  FileText,
  Loader2,
  Plus,
  Route,
  Save,
  Ship,
  Trash2,
} from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { Textarea } from '@/shared/components/ui/textarea'
import { bookingShippingService } from '@/features/admin/services/bookingShippingService'
import {
  partnerManagementService,
  type PartnerOption,
} from '@/features/admin/services/partnerManagementService'
import type {
  BookingShippingResponse,
  BookingShippingUpsertRequest,
  BookingTransitLegRequest,
} from '@/features/admin/types/bookingShipping.types'
import { portService } from '@/modules/logistics/services/portService'
import { queryKeys } from '@/shared/config/react-query.config'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/utils/toast'

import { AsyncSearchSelect } from './AsyncSearchSelect'
import {
  BOOKING_SEARCH,
  BOOKING_SHIPPING_CACHE,
  mergePortLabels,
  rememberPartnerOption,
  stablePortIdsKey,
} from './bookingShippingCache'
import {
  collectPortIds,
  emptyBookingShippingForm,
  toBookingShippingForm,
} from './bookingShippingForm'

type SectionId = 'booking' | 'routing' | 'vessel' | 'cargo' | 'transit' | 'terms'

const SECTIONS: { id: SectionId; label: string; icon: typeof Ship }[] = [
  { id: 'booking', label: 'Booking', icon: FileText },
  { id: 'routing', label: 'Routing', icon: Route },
  { id: 'vessel', label: 'Vessel', icon: Ship },
  { id: 'cargo', label: 'Cargo', icon: Box },
  { id: 'transit', label: 'Transit', icon: Anchor },
  { id: 'terms', label: 'Terms', icon: FileText },
]

type FieldKey = keyof BookingShippingUpsertRequest

function FormField({
  label,
  value,
  onChange,
  type = 'text',
  multiline = false,
}: {
  label: string
  value: string | number | null | undefined
  onChange: (v: string) => void
  type?: string
  multiline?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {multiline ? (
        <Textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className="resize-y min-h-[4.5rem] bg-background"
        />
      ) : (
        <Input
          type={type}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 bg-background"
        />
      )}
    </div>
  )
}

type ContactLike = {
  person?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
  phone?: string | null
  title?: string | null
}

/** Short label for a contact-person option. */
function contactLabel(c: ContactLike): string {
  const name =
    c.person?.trim() ||
    [c.firstName, c.lastName].filter(Boolean).join(' ').trim() ||
    c.email ||
    'Contact'
  return c.title ? `${name} — ${c.title}` : name
}

/** Value written into the shipment "Contact" field when a person is picked. */
function composeContact(c: ContactLike): string {
  const name =
    c.person?.trim() || [c.firstName, c.lastName].filter(Boolean).join(' ').trim()
  return [name, c.email, c.phone].filter(Boolean).join(' · ')
}

function SectionSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-9 animate-pulse rounded-md bg-muted/80" />
        </div>
      ))}
    </div>
  )
}

export function BookingShippingScreen() {
  const queryClient = useQueryClient()
  const [partnerId, setPartnerId] = useState<number | null>(null)
  const [selectedPartner, setSelectedPartner] = useState<PartnerOption | null>(null)
  const [contactIndex, setContactIndex] = useState<string>('')
  const [partnerSearch, setPartnerSearch] = useState('')
  const [portSearch, setPortSearch] = useState('')
  const [activeSection, setActiveSection] = useState<SectionId>('booking')
  const [form, setForm] = useState<BookingShippingUpsertRequest>(emptyBookingShippingForm())

  const partnerCacheRef = useRef(new Map<number, PartnerOption>())
  const portLabelCacheRef = useRef(new Map<number, string>())

  const debouncedPartnerSearch = useDebouncedValue(partnerSearch, 280)
  const debouncedPortSearch = useDebouncedValue(portSearch, 280)
  const partnerSearchKey = debouncedPartnerSearch.trim().toLowerCase()
  const portSearchKey = debouncedPortSearch.trim().toLowerCase()

  // Always enabled: an empty search returns the first N partners so the list is
  // populated as soon as the select opens, no typing required.
  const partnerOptionsQuery = useQuery({
    queryKey: queryKeys.partnerOptions(partnerSearchKey),
    queryFn: () =>
      partnerManagementService.listOptions(partnerSearchKey, BOOKING_SEARCH.limit),
    staleTime: BOOKING_SHIPPING_CACHE.optionsStaleMs,
    gcTime: BOOKING_SHIPPING_CACHE.gcMs,
    placeholderData: (previous) => previous,
  })

  const shippingQuery = useQuery({
    queryKey: partnerId != null ? queryKeys.bookingShipping(partnerId) : ['bookingShipping', 'idle'],
    queryFn: () => bookingShippingService.get(partnerId!),
    enabled: partnerId != null,
    staleTime: BOOKING_SHIPPING_CACHE.shippingStaleMs,
    gcTime: BOOKING_SHIPPING_CACHE.gcMs,
  })

  // Full partner record (for its contact persons) once one is selected.
  const partnerDetailQuery = useQuery({
    queryKey: ['partnerDetail', partnerId],
    queryFn: () => partnerManagementService.detail(partnerId!),
    enabled: partnerId != null,
    staleTime: BOOKING_SHIPPING_CACHE.shippingStaleMs,
    gcTime: BOOKING_SHIPPING_CACHE.gcMs,
  })

  const partnerContacts = useMemo(
    () => partnerDetailQuery.data?.contacts ?? [],
    [partnerDetailQuery.data],
  )

  const portIds = useMemo(() => collectPortIds(form), [form])
  const portIdsKey = useMemo(() => stablePortIdsKey(portIds), [portIds])

  const portSearchReady =
    partnerId != null && portSearchKey.length >= BOOKING_SEARCH.minChars

  const portOptionsQuery = useQuery({
    queryKey: queryKeys.portOptionsSearch(portSearchKey),
    queryFn: () =>
      portService.listPortOptions({
        q: portSearchKey,
        limit: BOOKING_SEARCH.limit,
      }),
    enabled: portSearchReady,
    staleTime: BOOKING_SHIPPING_CACHE.optionsStaleMs,
    gcTime: BOOKING_SHIPPING_CACHE.gcMs,
    placeholderData: (previous) => previous,
  })

  const portLabelsQuery = useQuery({
    queryKey: queryKeys.portOptionsByIds(portIdsKey),
    queryFn: () => portService.listPortOptions({ ids: portIds, limit: 50 }),
    enabled: partnerId != null && portIds.length > 0,
    staleTime: BOOKING_SHIPPING_CACHE.portLabelsStaleMs,
    gcTime: BOOKING_SHIPPING_CACHE.gcMs,
  })

  const portLabelById = useMemo(() => {
    mergePortLabels(portLabelCacheRef.current, portLabelsQuery.data)
    mergePortLabels(portLabelCacheRef.current, portOptionsQuery.data)
    return new Map(portLabelCacheRef.current)
  }, [portLabelsQuery.data, portOptionsQuery.data])

  const partnerOptions = useMemo(
    () =>
      (partnerOptionsQuery.data ?? []).map((p) => ({
        value: p.id,
        label: p.name,
        hint: p.customerId,
      })),
    [partnerOptionsQuery.data],
  )

  const portOptions = useMemo(
    () =>
      (portOptionsQuery.data ?? []).map((p) => ({
        value: p.id,
        label: p.name,
        hint: p.provinceName,
      })),
    [portOptionsQuery.data],
  )

  useEffect(() => {
    partnerOptionsQuery.data?.forEach((partner) =>
      rememberPartnerOption(partnerCacheRef.current, partner),
    )
  }, [partnerOptionsQuery.data])

  useEffect(() => {
    if (shippingQuery.data) {
      setForm(toBookingShippingForm(shippingQuery.data))
      return
    }
    if (partnerId == null || shippingQuery.isPending) return
    const cached = queryClient.getQueryData<BookingShippingResponse>(
      queryKeys.bookingShipping(partnerId),
    )
    if (!cached) {
      setForm(emptyBookingShippingForm())
    }
  }, [shippingQuery.data, shippingQuery.isPending, partnerId, queryClient])

  const saveMutation = useMutation({
    mutationFn: (body: BookingShippingUpsertRequest) =>
      bookingShippingService.put(partnerId!, body),
    onSuccess: (data) => {
      setForm(toBookingShippingForm(data))
      if (partnerId != null) {
        queryClient.setQueryData(queryKeys.bookingShipping(partnerId), data)
      }
      toast.success('Shipment record saved')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save'),
  })

  const setField = (key: FieldKey, value: string | number | null) => {
    setForm((prev) => ({ ...prev, [key]: value === '' ? null : value }))
  }

  const updateLeg = (index: number, patch: Partial<BookingTransitLegRequest>) => {
    setForm((prev) => ({
      ...prev,
      transitLegs: prev.transitLegs.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)),
    }))
  }

  const addLeg = () => {
    const fallbackPortId = portOptions[0]?.value ?? portIds[0] ?? 0
    setForm((prev) => ({
      ...prev,
      transitLegs: [
        ...prev.transitLegs,
        {
          portId: fallbackPortId,
          sortOrder: prev.transitLegs.length + 1,
          eta: null,
          etd: null,
        },
      ],
    }))
  }

  const removeLeg = (index: number) => {
    setForm((prev) => ({
      ...prev,
      transitLegs: prev.transitLegs
        .filter((_, i) => i !== index)
        .map((leg, i) => ({ ...leg, sortOrder: i + 1 })),
    }))
  }

  const selectPartner = (id: number | null) => {
    setContactIndex('')
    if (id == null) {
      setPartnerId(null)
      setSelectedPartner(null)
      setForm(emptyBookingShippingForm())
      return
    }
    const match =
      partnerOptionsQuery.data?.find((p) => p.id === id) ?? partnerCacheRef.current.get(id)
    const partner: PartnerOption =
      match ??
      (selectedPartner?.id === id
        ? selectedPartner
        : { id, name: `Partner #${id}`, customerId: '' })
    rememberPartnerOption(partnerCacheRef.current, partner)
    setPartnerId(id)
    setSelectedPartner(partner)

    const cachedShipping = queryClient.getQueryData<BookingShippingResponse>(
      queryKeys.bookingShipping(id),
    )
    setForm(cachedShipping ? toBookingShippingForm(cachedShipping) : emptyBookingShippingForm())
  }

  const PortField = ({
    label,
    field,
    required,
  }: {
    label: string
    field:
      | 'placeOfReceiptPortId'
      | 'portOfLoadingPortId'
      | 'portOfDischargePortId'
      | 'placeOfDeliveryPortId'
      | 'finalDestinationPortId'
    required?: boolean
  }) => (
    <AsyncSearchSelect
      label={required ? `${label} *` : label}
      value={form[field]}
      selectedLabel={form[field] != null ? portLabelById.get(form[field]!) : null}
      options={portOptions}
      search={portSearch}
      onSearchChange={setPortSearch}
      isLoading={portOptionsQuery.isFetching && portOptions.length === 0}
      disabled={shippingQuery.isFetching && !shippingQuery.data}
      placeholder="Type port name…"
      requireSearch
      idleMessage="Type a port name to search (max 10 results)."
      emptyMessage="No port found."
      onChange={(id) => setField(field, id)}
    />
  )

  const showForm = partnerId != null
  const isLoadingShipping = partnerId != null && shippingQuery.isLoading
  const canSave = showForm && !saveMutation.isPending && !isLoadingShipping

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-1 pb-8">
      <header className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Pick a partner to begin. The list shows the first {BOOKING_SEARCH.limit} partners — type to search for more.
        </p>
        {showForm && (
          <Button
            type="button"
            disabled={!canSave}
            onClick={() => saveMutation.mutate(form)}
            className="shrink-0 active:scale-[0.98]"
          >
            {saveMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save shipment
          </Button>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,17rem)_1fr]">
        <aside className="space-y-4 lg:border-r lg:border-border/60 lg:pr-5">
          <div>
            <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Partner
            </p>
            <AsyncSearchSelect
              label="Select partner"
              value={partnerId}
              selectedLabel={selectedPartner?.name ?? null}
              options={partnerOptions}
              search={partnerSearch}
              onSearchChange={setPartnerSearch}
              isLoading={partnerOptionsQuery.isFetching}
              placeholder="Name or customer ID…"
              emptyMessage="No partner found."
              allowClear
              onChange={(id) => selectPartner(id)}
            />
            {selectedPartner && (
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {selectedPartner.customerId}
              </p>
            )}
          </div>

          {showForm && (
            <div>
              <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Contact person
              </p>
              <Select
                value={contactIndex || undefined}
                disabled={partnerDetailQuery.isLoading || partnerContacts.length === 0}
                onValueChange={(v) => {
                  if (v === 'NONE') {
                    setContactIndex('')
                    setField('contact', null)
                    return
                  }
                  setContactIndex(v)
                  const contact = partnerContacts[Number(v)]
                  if (contact) setField('contact', composeContact(contact))
                }}
              >
                <SelectTrigger className="h-9 w-full bg-background">
                  <SelectValue placeholder={partnerContacts.length ? 'Available' : 'None'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  {partnerContacts.map((contact, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {contactLabel(contact)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {!showForm && (
            <p className="text-sm text-muted-foreground">
              Pick a partner to load shipment data.
            </p>
          )}
        </aside>

        <main className="min-w-0 space-y-5">
          {!showForm ? null : isLoadingShipping ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading shipment for {selectedPartner?.name ?? 'partner'}…
              </div>
              <SectionSkeleton />
            </div>
          ) : (
            <>
              <nav
                className="flex gap-1 overflow-x-auto border-b border-border/60 pb-px"
                aria-label="Shipping sections"
              >
                {SECTIONS.map((section) => {
                  const Icon = section.icon
                  const isActive = activeSection === section.id
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors active:scale-[0.98]',
                        isActive
                          ? 'border-primary text-foreground'
                          : 'border-transparent text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {section.label}
                    </button>
                  )
                })}
              </nav>

              {activeSection === 'booking' && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label="Booking no. *" value={form.bookingNo} onChange={(v) => setField('bookingNo', v)} />
                  <FormField label="Booking to" value={form.bookingTo} onChange={(v) => setField('bookingTo', v)} />
                  <FormField label="Reference" value={form.bookingNumberReference} onChange={(v) => setField('bookingNumberReference', v)} />
                  <FormField label="Service mode" value={form.serviceMode} onChange={(v) => setField('serviceMode', v)} />
                  <FormField label="Freight terms" value={form.freightTerms} onChange={(v) => setField('freightTerms', v)} />
                  <FormField label="Carrier" value={form.carrier} onChange={(v) => setField('carrier', v)} />
                  <FormField label="Provider" value={form.provider} onChange={(v) => setField('provider', v)} />
                  <FormField label="Date of creation" value={form.dateOfCreation} onChange={(v) => setField('dateOfCreation', v)} type="date" />
                  <div className="sm:col-span-2 lg:col-span-3">
                    <FormField label="Note" value={form.bookingNote} onChange={(v) => setField('bookingNote', v)} multiline />
                  </div>
                </div>
              )}

              {activeSection === 'routing' && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <PortField label="Place of receipt" field="placeOfReceiptPortId" required />
                  <PortField label="Port of loading" field="portOfLoadingPortId" />
                  <PortField label="Port of discharge" field="portOfDischargePortId" />
                  <PortField label="Place of delivery" field="placeOfDeliveryPortId" required />
                  <PortField label="Final destination" field="finalDestinationPortId" />
                  <FormField label="ETD" value={form.etd} onChange={(v) => setField('etd', v)} type="datetime-local" />
                  <FormField label="ETA" value={form.eta} onChange={(v) => setField('eta', v)} type="datetime-local" />
                  <FormField label="Pick up" value={form.pickUp} onChange={(v) => setField('pickUp', v)} />
                  <FormField label="Date of pick up" value={form.dateOfPickUp} onChange={(v) => setField('dateOfPickUp', v)} type="date" />
                  <div className="sm:col-span-2 lg:col-span-3">
                    <FormField label="Drop-off warehouse" value={form.dropOffWarehouse} onChange={(v) => setField('dropOffWarehouse', v)} />
                  </div>
                </div>
              )}

              {activeSection === 'vessel' && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label="Feeder vessel" value={form.feederVessel} onChange={(v) => setField('feederVessel', v)} />
                  <FormField label="Feeder voyage" value={form.feederVoyage} onChange={(v) => setField('feederVoyage', v)} />
                  <FormField label="Mother vessel" value={form.motherVessel} onChange={(v) => setField('motherVessel', v)} />
                  <FormField label="Mother voyage" value={form.motherVoyage} onChange={(v) => setField('motherVoyage', v)} />
                  <FormField label="CY cut-off" value={form.cyCutOff} onChange={(v) => setField('cyCutOff', v)} type="datetime-local" />
                  <FormField label="SI cut-off" value={form.siCutOff} onChange={(v) => setField('siCutOff', v)} type="datetime-local" />
                  <FormField label="VGM cut-off" value={form.vgmCutOff} onChange={(v) => setField('vgmCutOff', v)} type="datetime-local" />
                  <FormField label="Gate in" value={form.gateIn} onChange={(v) => setField('gateIn', v)} type="datetime-local" />
                  <FormField label="Temp" value={form.temp} onChange={(v) => setField('temp', v)} />
                  <FormField label="Vent" value={form.vent} onChange={(v) => setField('vent', v)} />
                </div>
              )}

              {activeSection === 'cargo' && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField label="Cargo type" value={form.cargoType} onChange={(v) => setField('cargoType', v)} />
                  <FormField label="Cargo name" value={form.cargoName} onChange={(v) => setField('cargoName', v)} />
                  <FormField label="Volume" value={form.volume} onChange={(v) => setField('volume', v)} />
                  <FormField label="Gross weight (kg)" value={form.grossWeightKgs} onChange={(v) => setField('grossWeightKgs', v)} />
                  <FormField label="CBM" value={form.measurementCbm} onChange={(v) => setField('measurementCbm', v)} />
                  <FormField label="Contact" value={form.contact} onChange={(v) => setField('contact', v)} />
                </div>
              )}

              {activeSection === 'transit' && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLeg}
                      className="active:scale-[0.98]"
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Add leg
                    </Button>
                  </div>
                  {form.transitLegs.length === 0 && (
                    <p className="text-sm text-muted-foreground">No transit legs yet.</p>
                  )}
                  {form.transitLegs.map((leg, index) => (
                    <div
                      key={`leg-${index}-${leg.portId}`}
                      className="grid gap-3 rounded-lg border border-border/60 bg-muted/10 p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
                    >
                      <AsyncSearchSelect
                        label={`Port (${leg.sortOrder})`}
                        value={leg.portId}
                        selectedLabel={portLabelById.get(leg.portId)}
                        options={portOptions}
                        search={portSearch}
                        onSearchChange={setPortSearch}
                        isLoading={portSearchReady && portOptionsQuery.isFetching}
                        placeholder="Type port name…"
                        requireSearch
                        idleMessage="Type a port name to search."
                        emptyMessage="No port found."
                        allowClear={false}
                        onChange={(id) => id != null && updateLeg(index, { portId: id })}
                      />
                      <FormField label="ETA" value={leg.eta} onChange={(v) => updateLeg(index, { eta: v || null })} type="datetime-local" />
                      <FormField label="ETD" value={leg.etd} onChange={(v) => updateLeg(index, { etd: v || null })} type="datetime-local" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive active:scale-[0.98]"
                        onClick={() => removeLeg(index)}
                        aria-label="Remove leg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {activeSection === 'terms' && (
                <div className="grid gap-4">
                  <FormField label="Special remark" value={form.specialRemark} onChange={(v) => setField('specialRemark', v)} multiline />
                  <FormField label="Terms and conditions" value={form.termsAndConditions} onChange={(v) => setField('termsAndConditions', v)} multiline />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
