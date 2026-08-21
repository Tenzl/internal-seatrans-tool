'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { commodityService } from '@/modules/gallery/services/commodityService'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { TRANSPORT_FILLED_FIELD_RING } from './TransportDocumentField'
import { resolveSelectFieldOptions } from './transportDocumentFormConfig'

interface BookingCommoditySelectProps {
  commodityType: string
  commodityTypeId?: number | null
  commodityName: string
  commodityId?: number | null
  /** Legacy combined description, used only as a missing Commodity fallback. */
  description: string
  onTypeChange: (name: string, id: number | null) => void
  onCommodityChange: (name: string, id: number | null) => void
  disabled?: boolean
  required?: boolean
}

interface CatalogOption {
  id: number
  name: string
}

const EMPTY_VALUE = '__empty__'
const SIX_OPTION_LIST_HEIGHT = 'max-h-[200px]'

function resolveCatalogSelect(
  options: CatalogOption[],
  selectedId: number | null | undefined,
  snapshot: string,
  legacyKey: string
) {
  const selectedValue = selectedId
    ? String(selectedId)
    : snapshot
      ? `legacy:${legacyKey}:${snapshot}`
      : EMPTY_VALUE
  const selectOptions = options.map((option) => ({
    value: String(option.id),
    label: option.name,
  }))
  const resolved = resolveSelectFieldOptions(
    selectOptions,
    selectedValue === EMPTY_VALUE ? '' : selectedValue
  ).map((option) => {
    if (option.value !== selectedValue) return option
    return { ...option, label: snapshot || option.label }
  })
  return { selectedValue, resolved }
}

interface CatalogSearchSelectProps {
  id: string
  label: string
  selectedValue: string
  options: Array<{ value: string; label: string }>
  placeholder: string
  searchPlaceholder: string
  emptyMessage: string
  pending: boolean
  disabled: boolean
  filled: boolean
  onValueChange: (value: string) => void
  required?: boolean
}

/** Route-style searchable picker with exactly six visible option rows. */
function CatalogSearchSelect({
  id,
  label,
  selectedValue,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  pending,
  disabled,
  filled,
  onValueChange,
  required = false,
}: CatalogSearchSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const selectedLabel = options.find(
    (option) => option.value === selectedValue
  )?.label

  return (
    <div className='space-y-1.5'>
      <Label
        id={`${id}-label`}
        htmlFor={id}
        className='text-sm font-medium text-muted-foreground'
      >
        {label}
        {required ? (
          <span className='ml-1 text-destructive' aria-hidden='true'>
            *
          </span>
        ) : null}
      </Label>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) setSearch('')
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type='button'
            variant='outline'
            role='combobox'
            aria-labelledby={`${id}-label`}
            aria-expanded={open}
            aria-required={required || undefined}
            disabled={disabled}
            className={cn(
              'w-full justify-between bg-background font-normal',
              filled ? TRANSPORT_FILLED_FIELD_RING : undefined
            )}
          >
            <span
              className={cn(
                'truncate',
                !selectedLabel && 'text-muted-foreground'
              )}
            >
              {selectedLabel || placeholder}
            </span>
            {pending ? (
              <Loader2 className='ml-2 h-4 w-4 shrink-0 animate-spin opacity-60' />
            ) : (
              <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className='w-[var(--radix-popover-trigger-width)] p-0'
          align='start'
        >
          <Command>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className={SIX_OPTION_LIST_HEIGHT}>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value={`${label} clear selection`}
                  className='h-8'
                  onSelect={() => {
                    onValueChange(EMPTY_VALUE)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0',
                      selectedValue === EMPTY_VALUE
                        ? 'opacity-100'
                        : 'opacity-0'
                    )}
                  />
                  <span className='truncate'>{placeholder}</span>
                </CommandItem>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value}`}
                    className='h-8'
                    onSelect={() => {
                      onValueChange(option.value)
                      setOpen(false)
                      setSearch('')
                    }}
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0',
                        selectedValue === option.value
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <span className='truncate'>{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/** Independent Freight Forwarding Type and Commodity catalog controls. */
export function BookingCommoditySelect({
  commodityType,
  commodityTypeId,
  commodityName,
  commodityId,
  description,
  onTypeChange,
  onCommodityChange,
  disabled = false,
  required = false,
}: BookingCommoditySelectProps) {
  const serviceQuery = useQuery({
    queryKey: ['admin', 'booking', 'service', 'freight-forwarding'],
    queryFn: ({ signal }) =>
      commodityService.resolveServiceTypeId('freight-forwarding', signal),
    staleTime: 5 * 60 * 1000,
  })
  const serviceTypeId = serviceQuery.data
  const typeQuery = useQuery({
    queryKey: [
      'admin',
      'booking',
      'commodity-types',
      'freight-forwarding',
      serviceTypeId,
    ],
    queryFn: ({ signal }) =>
      commodityService.listCommodityTypes(serviceTypeId as number, signal),
    enabled: serviceTypeId != null,
  })
  const commodityQuery = useQuery({
    queryKey: [
      'admin',
      'booking',
      'commodities',
      'freight-forwarding',
      serviceTypeId,
    ],
    queryFn: ({ signal }) =>
      commodityService.listAdminCommodities(serviceTypeId as number, signal),
    enabled: serviceTypeId != null,
  })

  const typeOptions = (typeQuery.data ?? []).map((option) => ({
    id: option.id,
    name: option.name,
  }))
  const commodityOptions = (commodityQuery.data ?? []).map((option) => ({
    id: option.id,
    name: option.displayName || option.name,
  }))
  const typeSelect = resolveCatalogSelect(
    typeOptions,
    commodityTypeId,
    commodityType,
    'type'
  )
  const legacyCommoditySnapshot =
    commodityName || (!commodityType ? description : '')
  const commoditySelect = resolveCatalogSelect(
    commodityOptions,
    commodityId,
    legacyCommoditySnapshot,
    'commodity'
  )
  const typePending = serviceQuery.isPending || typeQuery.isPending
  const commodityPending = serviceQuery.isPending || commodityQuery.isPending
  const typeError = serviceQuery.isError || typeQuery.isError
  const commodityError = serviceQuery.isError || commodityQuery.isError

  return (
    <>
      <div className='space-y-1.5'>
        <CatalogSearchSelect
          id='transport-document-commodity-type'
          label='Type'
          selectedValue={typeSelect.selectedValue}
          options={typeSelect.resolved}
          placeholder={
            typePending
              ? 'Loading types...'
              : typeError
                ? 'Type catalog unavailable'
                : typeOptions.length === 0
                  ? 'No freight-forwarding types'
                  : 'Select type'
          }
          searchPlaceholder='Search types...'
          emptyMessage='No type found.'
          pending={typePending}
          disabled={disabled || (typePending && !commodityType)}
          filled={Boolean(commodityType.trim())}
          onValueChange={(next) => {
            if (next === EMPTY_VALUE) {
              onTypeChange('', null)
              return
            }
            const option = typeQuery.data?.find(
              (item) => String(item.id) === next
            )
            if (option) onTypeChange(option.name, option.id)
          }}
          required={required}
        />
        {typeError ? (
          <p className='text-xs text-destructive'>
            Could not load Types. The saved value is still available.
          </p>
        ) : null}
      </div>

      <div className='space-y-1.5'>
        <CatalogSearchSelect
          id='transport-document-commodity'
          label='Commodity'
          selectedValue={commoditySelect.selectedValue}
          options={commoditySelect.resolved}
          placeholder={
            commodityPending
              ? 'Loading commodities...'
              : commodityError
                ? 'Commodity catalog unavailable'
                : commodityOptions.length === 0
                  ? 'No freight-forwarding commodities'
                  : 'Select commodity'
          }
          searchPlaceholder='Search commodities...'
          emptyMessage='No commodity found.'
          pending={commodityPending}
          disabled={disabled || (commodityPending && !legacyCommoditySnapshot)}
          filled={Boolean(legacyCommoditySnapshot.trim())}
          onValueChange={(next) => {
            if (next === EMPTY_VALUE) {
              onCommodityChange('', null)
              return
            }
            const option = commodityQuery.data?.find(
              (item) => String(item.id) === next
            )
            if (option) {
              onCommodityChange(option.displayName || option.name, option.id)
            }
          }}
          required={required}
        />
        {commodityError ? (
          <p className='text-xs text-destructive'>
            Could not load Commodities. The saved value is still available.
          </p>
        ) : null}
      </div>
    </>
  )
}
