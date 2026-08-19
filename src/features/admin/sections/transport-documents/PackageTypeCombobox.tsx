'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import { packageTypeService } from './packageTypeService'

interface PackageTypeComboboxProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  'aria-label'?: string
}

/**
 * Searchable database-backed Package Type picker shared by BL/AN/DO container
 * rows. The stored document snapshot is always pinned first and remains usable
 * even after its catalog row is renamed, deactivated, or removed.
 */
export function PackageTypeCombobox({
  value,
  onValueChange,
  disabled = false,
  'aria-label': ariaLabel,
}: PackageTypeComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const catalogQuery = useQuery({
    queryKey: ['admin', 'booking-documents', 'package-types', 'active'],
    queryFn: ({ signal }) => packageTypeService.listActive(signal),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const options = React.useMemo(() => {
    const normalizedSnapshot = value.trim().toUpperCase()
    const catalog = (catalogQuery.data ?? [])
      .filter((item) => item.code.trim().toUpperCase() !== normalizedSnapshot)
      .map((item) => ({
        value: item.code,
        label: item.displayName,
        keywords: `${item.code} ${item.displayName}`,
      }))
    return [
      ...(value ? [{ value, label: value, keywords: value }] : []),
      { value: '', label: '—', keywords: 'empty clear' },
      ...catalog,
    ]
  }, [catalogQuery.data, value])

  const fallback = search.trim()

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setSearch('')
      }}
    >
      <PopoverTrigger asChild>
        <button
          type='button'
          role='combobox'
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            'flex min-h-9 w-full items-center justify-between gap-1.5 self-stretch rounded-none border-0 bg-background px-2 text-left text-sm transition-colors outline-none',
            'hover:bg-accent/40',
            'focus-visible:relative focus-visible:z-10 focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-70'
          )}
        >
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value || 'Select...'}
          </span>
          <ChevronsUpDown className='h-3.5 w-3.5 shrink-0 text-muted-foreground/70' />
        </button>
      </PopoverTrigger>
      <PopoverContent className='w-56 p-0' align='start'>
        <Command>
          <CommandInput
            placeholder='Search package type...'
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>No package type found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value || 'empty'}
                  value={option.keywords}
                  onSelect={() => {
                    onValueChange(option.value)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <Check
                    className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      value === option.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className='truncate'>{option.label}</span>
                </CommandItem>
              ))}
              {catalogQuery.isError &&
              fallback &&
              fallback.toUpperCase() !== value.trim().toUpperCase() ? (
                <CommandItem
                  value={fallback}
                  onSelect={() => {
                    onValueChange(fallback)
                    setOpen(false)
                    setSearch('')
                  }}
                >
                  <span className='truncate'>Use &quot;{fallback}&quot;</span>
                </CommandItem>
              ) : null}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
