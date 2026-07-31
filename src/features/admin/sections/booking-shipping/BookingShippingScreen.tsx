'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { portService } from '@/modules/logistics/services/portService'
import { queryKeys } from '@/shared/config/react-query.config'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { toast } from '@/shared/utils/toast'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  partnerManagementService,
  type PartnerOption,
} from '@/features/admin/sections/partner-management/partnerManagementService'
import {
  type BookingShippingSectionId,
  BookingShippingEditor,
} from './BookingShippingEditor'
import { BookingShippingSidebar } from './BookingShippingSidebar'
import {
  BOOKING_SEARCH,
  BOOKING_SHIPPING_CACHE,
  mergePortLabels,
  rememberPartnerOption,
  stablePortIdsKey,
} from './bookingShippingCache'
import {
  addTransitLeg,
  collectPortIds,
  emptyBookingShippingForm,
  removeTransitLeg,
  setBookingShippingField,
  toBookingShippingForm,
  updateTransitLeg,
} from './bookingShippingForm'
import { bookingShippingService } from './bookingShippingService'
import type {
  BookingShippingResponse,
  BookingShippingUpsertRequest,
} from './bookingShippingTypes'

export function BookingShippingScreen() {
  const queryClient = useQueryClient()
  const partnerCacheRef = useRef(new Map<number, PartnerOption>())
  const [partnerId, setPartnerId] = useState<number | null>(null)
  const [selectedPartner, setSelectedPartner] = useState<PartnerOption | null>(
    null
  )
  const [contactIndex, setContactIndex] = useState('')
  const [partnerSearch, setPartnerSearch] = useState('')
  const [portSearch, setPortSearch] = useState('')
  const [activeSection, setActiveSection] =
    useState<BookingShippingSectionId>('booking')
  const [form, setForm] = useState<BookingShippingUpsertRequest>(
    emptyBookingShippingForm
  )

  const partnerSearchKey = useDebouncedValue(partnerSearch, 280)
    .trim()
    .toLowerCase()
  const portSearchKey = useDebouncedValue(portSearch, 280).trim().toLowerCase()

  // Empty search intentionally returns the first partners when the picker opens.
  const partnerOptionsQuery = useQuery({
    queryKey: queryKeys.partnerOptions(partnerSearchKey),
    queryFn: () =>
      partnerManagementService.listOptions(
        partnerSearchKey,
        BOOKING_SEARCH.limit
      ),
    staleTime: BOOKING_SHIPPING_CACHE.optionsStaleMs,
    gcTime: BOOKING_SHIPPING_CACHE.gcMs,
    placeholderData: (previous) => previous,
  })

  const shippingQuery = useQuery({
    queryKey:
      partnerId != null
        ? queryKeys.bookingShipping(partnerId)
        : ['bookingShipping', 'idle'],
    queryFn: () => bookingShippingService.get(partnerId!),
    enabled: partnerId != null,
    staleTime: BOOKING_SHIPPING_CACHE.shippingStaleMs,
    gcTime: BOOKING_SHIPPING_CACHE.gcMs,
  })

  // Apply a query result once without overwriting edits on unrelated renders.
  const [appliedShipping, setAppliedShipping] = useState(shippingQuery.data)
  if (shippingQuery.data !== appliedShipping) {
    setAppliedShipping(shippingQuery.data)
    setForm(
      shippingQuery.data
        ? toBookingShippingForm(shippingQuery.data)
        : emptyBookingShippingForm()
    )
  }

  const partnerDetailQuery = useQuery({
    queryKey: ['partnerDetail', partnerId],
    queryFn: () => partnerManagementService.detail(partnerId!),
    enabled: partnerId != null,
    staleTime: BOOKING_SHIPPING_CACHE.shippingStaleMs,
    gcTime: BOOKING_SHIPPING_CACHE.gcMs,
  })
  const partnerContacts = useMemo(
    () => partnerDetailQuery.data?.contacts ?? [],
    [partnerDetailQuery.data]
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
    queryFn: () =>
      portService.listPortOptions({
        ids: portIdsKey.split(',').filter(Boolean).map(Number),
        limit: 50,
      }),
    enabled: partnerId != null && portIds.length > 0,
    staleTime: BOOKING_SHIPPING_CACHE.portLabelsStaleMs,
    gcTime: BOOKING_SHIPPING_CACHE.gcMs,
  })

  const portLabelById = useMemo(() => {
    const labels = new Map<number, string>()
    mergePortLabels(labels, portLabelsQuery.data)
    mergePortLabels(labels, portOptionsQuery.data)
    return labels
  }, [portLabelsQuery.data, portOptionsQuery.data])

  const partnerOptions = useMemo(
    () =>
      (partnerOptionsQuery.data ?? []).map((partner) => ({
        value: partner.id,
        label: partner.name,
        hint: partner.customerId,
      })),
    [partnerOptionsQuery.data]
  )
  const portOptions = useMemo(
    () =>
      (portOptionsQuery.data ?? []).map((port) => ({
        value: port.id,
        label: port.name,
        hint: port.provinceName,
      })),
    [portOptionsQuery.data]
  )

  useEffect(() => {
    partnerOptionsQuery.data?.forEach((partner) =>
      rememberPartnerOption(partnerCacheRef.current, partner)
    )
  }, [partnerOptionsQuery.data])

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
    onError: (error: Error) => toast.error(error.message || 'Failed to save'),
  })

  const selectPartner = (id: number | null) => {
    setContactIndex('')
    if (id == null) {
      setPartnerId(null)
      setSelectedPartner(null)
      setForm(emptyBookingShippingForm())
      return
    }

    const matchedPartner =
      partnerOptionsQuery.data?.find((partner) => partner.id === id) ??
      partnerCacheRef.current.get(id)
    const partner: PartnerOption =
      matchedPartner ??
      (selectedPartner?.id === id
        ? selectedPartner
        : { id, name: `Partner #${id}`, customerId: '' })

    rememberPartnerOption(partnerCacheRef.current, partner)
    setPartnerId(id)
    setSelectedPartner(partner)

    const cachedShipping = queryClient.getQueryData<BookingShippingResponse>(
      queryKeys.bookingShipping(id)
    )
    setForm(
      cachedShipping
        ? toBookingShippingForm(cachedShipping)
        : emptyBookingShippingForm()
    )
  }

  const showForm = partnerId != null
  const loadingShipping = partnerId != null && shippingQuery.isLoading
  const canSave = showForm && !saveMutation.isPending && !loadingShipping

  return (
    <div className='mx-auto max-w-7xl space-y-6 px-1 pb-8'>
      <header className='flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-end sm:justify-between'>
        <p className='max-w-xl text-sm leading-relaxed text-muted-foreground'>
          Pick a partner to begin. The list shows the first{' '}
          {BOOKING_SEARCH.limit} partners — type to search for more.
        </p>
        {showForm ? (
          <Button
            type='button'
            disabled={!canSave}
            onClick={() => saveMutation.mutate(form)}
            className='shrink-0 active:scale-[0.98]'
          >
            {saveMutation.isPending ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Save className='mr-2 h-4 w-4' />
            )}
            Save shipment
          </Button>
        ) : null}
      </header>

      <div className='grid gap-6 lg:grid-cols-[minmax(0,17rem)_1fr]'>
        <BookingShippingSidebar
          partnerId={partnerId}
          selectedPartner={selectedPartner}
          partnerOptions={partnerOptions}
          partnerSearch={partnerSearch}
          partnerOptionsLoading={partnerOptionsQuery.isFetching}
          showForm={showForm}
          contacts={partnerContacts}
          contactsLoading={partnerDetailQuery.isLoading}
          contactIndex={contactIndex}
          onPartnerSearchChange={setPartnerSearch}
          onPartnerChange={selectPartner}
          onContactIndexChange={setContactIndex}
          onContactChange={(contact) =>
            setForm((current) =>
              setBookingShippingField(current, 'contact', contact)
            )
          }
        />

        <main className='min-w-0 space-y-5'>
          {!showForm ? null : loadingShipping ? (
            <ShippingSectionSkeleton partnerName={selectedPartner?.name} />
          ) : (
            <BookingShippingEditor
              activeSection={activeSection}
              form={form}
              portLabelById={portLabelById}
              portOptions={portOptions}
              portSearch={portSearch}
              portSearchReady={portSearchReady}
              portOptionsFetching={portOptionsQuery.isFetching}
              portFieldsDisabled={
                shippingQuery.isFetching && !shippingQuery.data
              }
              onActiveSectionChange={setActiveSection}
              onPortSearchChange={setPortSearch}
              onFieldChange={(key, value) =>
                setForm((current) =>
                  setBookingShippingField(current, key, value)
                )
              }
              onUpdateLeg={(index, patch) =>
                setForm((current) => updateTransitLeg(current, index, patch))
              }
              onAddLeg={() => {
                const fallbackPortId = portOptions[0]?.value ?? portIds[0] ?? 0
                setForm((current) => addTransitLeg(current, fallbackPortId))
              }}
              onRemoveLeg={(index) =>
                setForm((current) => removeTransitLeg(current, index))
              }
            />
          )}
        </main>
      </div>
    </div>
  )
}

function ShippingSectionSkeleton({ partnerName }: { partnerName?: string }) {
  return (
    <div className='space-y-4'>
      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
        <Loader2 className='h-4 w-4 animate-spin' />
        Loading shipment for {partnerName ?? 'partner'}…
      </div>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className='space-y-2'>
            <div className='h-3 w-20 animate-pulse rounded bg-muted' />
            <div className='h-9 animate-pulse rounded-md bg-muted/80' />
          </div>
        ))}
      </div>
    </div>
  )
}
