'use client'

import * as React from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/config/react-query.config'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { Check, Loader2, RotateCcw, Search, X } from 'lucide-react'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Textarea } from '@/components/ui/textarea'
import {
  partnerManagementService,
  type PartnerOption,
} from '@/features/admin/sections/partner-management/partnerManagementService'
import type {
  CustomerType,
  PartnerAdditionType,
} from '@/features/admin/sections/partner-management/partnerManagementTypes'
import {
  formatPartyFieldValue,
  getNextPartyOptionPage,
  mergePartyOptionPages,
  type PartyValueMode,
} from './partyPickerModel'

interface PartySearchSelectProps {
  id?: string
  value: number | null
  documentValue: string
  additionType?: PartnerAdditionType
  customerType?: CustomerType
  partyValueMode?: PartyValueMode
  onChange: (option: PartnerOption | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function PartySearchSelect({
  id,
  value,
  documentValue,
  additionType,
  customerType,
  partyValueMode = 'full',
  onChange,
  placeholder = 'Search Party name...',
  disabled = false,
  className,
}: PartySearchSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const [selectedOption, setSelectedOption] =
    React.useState<PartnerOption | null>(null)
  const debouncedSearch = useDebouncedValue(search, 280).trim()
  const searchReady =
    debouncedSearch.length === 0 || debouncedSearch.length >= 2

  const optionsQuery = useInfiniteQuery({
    queryKey: queryKeys.partnerDocumentOptions(
      additionType ?? null,
      customerType ?? null,
      debouncedSearch.toLowerCase()
    ),
    queryFn: ({ pageParam, signal }) =>
      partnerManagementService.listOptions(
        {
          page: pageParam,
          q: debouncedSearch || undefined,
          additionType,
          customerType,
        },
        signal
      ),
    initialPageParam: 0,
    getNextPageParam: getNextPartyOptionPage,
    enabled: open && searchReady,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })

  const selectedPartyQuery = useQuery({
    queryKey: queryKeys.partnerDocumentSelected(value ?? 0),
    queryFn: async (): Promise<PartnerOption> => {
      const partner = await partnerManagementService.detail(value!, false)
      return {
        id: partner.id,
        name: partner.name,
        customerId: partner.customerId,
        address: partner.address ?? null,
        city: partner.city ?? null,
        country: partner.country ?? null,
        phone: partner.phone ?? null,
        fax: partner.fax ?? null,
      }
    },
    enabled: value != null,
    staleTime: 5 * 60 * 1000,
  })

  const options = React.useMemo(
    () => mergePartyOptionPages(optionsQuery.data?.pages),
    [optionsQuery.data?.pages]
  )
  const optionFromResults = options.find((option) => option.id === value)
  const resolvedOption =
    selectedOption?.id === value
      ? selectedOption
      : selectedPartyQuery.data?.id === value
        ? selectedPartyQuery.data
        : optionFromResults
  const triggerLabel =
    resolvedOption?.name || documentValue.split(/\r?\n/, 1)[0]?.trim() || ''
  const details = resolvedOption
    ? formatPartyFieldValue(resolvedOption, partyValueMode)
    : documentValue

  const select = (option: PartnerOption | null) => {
    setSelectedOption(option)
    onChange(option)
    setOpen(false)
    setSearch('')
  }

  return (
    <div className='space-y-2'>
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
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between bg-background font-normal',
              className
            )}
          >
            <span className='flex min-w-0 items-center gap-2'>
              <Search className='h-4 w-4 shrink-0 text-muted-foreground' />
              <span
                className={cn(
                  'truncate text-left',
                  !triggerLabel && 'text-muted-foreground'
                )}
              >
                {triggerLabel || placeholder}
              </span>
            </span>
            {optionsQuery.isFetching && !optionsQuery.isFetchingNextPage ? (
              <Loader2 className='ml-2 h-4 w-4 shrink-0 animate-spin opacity-60' />
            ) : (
              <span className='ml-2 flex shrink-0 items-center'>
                {value != null ? <X className='h-4 w-4 opacity-45' /> : null}
              </span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className='w-[var(--radix-popover-trigger-width)] p-0'
          align='start'
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder='Search Party name...'
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {!searchReady ? (
                <p className='px-3 py-4 text-sm text-muted-foreground'>
                  Type at least 2 characters to search.
                </p>
              ) : optionsQuery.isPending ? (
                <div className='flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground'>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  Loading 10 Parties...
                </div>
              ) : optionsQuery.isError ? (
                <CommandGroup>
                  <CommandItem
                    value='retry-party-options'
                    onSelect={() => void optionsQuery.refetch()}
                  >
                    <RotateCcw className='h-4 w-4' />
                    Could not load Parties. Retry
                  </CommandItem>
                </CommandGroup>
              ) : (
                <>
                  <CommandEmpty>No matching Party found.</CommandEmpty>
                  <CommandGroup>
                    {value != null || documentValue ? (
                      <CommandItem
                        value='clear-party'
                        onSelect={() => select(null)}
                      >
                        Clear selection
                      </CommandItem>
                    ) : null}

                    {options.map((option) => (
                      <CommandItem
                        key={option.id}
                        value={`party-${option.id}`}
                        onSelect={() => select(option)}
                      >
                        <Check
                          className={cn(
                            'h-4 w-4 shrink-0',
                            value === option.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <span className='flex min-w-0 flex-col'>
                          <span className='truncate'>{option.name}</span>
                          <span className='truncate text-xs text-muted-foreground'>
                            {option.customerId}
                            {option.city ? ` · ${option.city}` : ''}
                            {option.country ? ` · ${option.country}` : ''}
                          </span>
                        </span>
                      </CommandItem>
                    ))}

                    {optionsQuery.hasNextPage ? (
                      <CommandItem
                        value='load-next-party-page'
                        disabled={optionsQuery.isFetchingNextPage}
                        onSelect={() => void optionsQuery.fetchNextPage()}
                        className='justify-center text-muted-foreground'
                      >
                        {optionsQuery.isFetchingNextPage ? (
                          <>
                            <Loader2 className='h-4 w-4 animate-spin' />
                            Loading next 10 Parties...
                          </>
                        ) : (
                          'Load next 10 Parties'
                        )}
                      </CommandItem>
                    ) : null}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {details ? (
        <Textarea
          value={details}
          readOnly
          rows={partyValueMode === 'name' ? 1 : 3}
          aria-label={`${triggerLabel || 'Party'} details`}
          className={
            partyValueMode === 'name'
              ? 'min-h-0 resize-none bg-muted/30 text-sm'
              : 'min-h-20 resize-none bg-muted/30 text-sm'
          }
        />
      ) : null}
    </div>
  )
}
