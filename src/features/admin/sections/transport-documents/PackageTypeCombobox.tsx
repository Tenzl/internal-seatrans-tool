'use client'

import * as React from 'react'
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
import {
  AN_CONTAINER_PACKAGE_TYPE_OPTIONS,
  isAnContainerPackageType,
} from './anContainerModel'

interface PackageTypeComboboxProps {
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  'aria-label'?: string
}

/**
 * Searchable package-type picker for AN container rows. Typing filters the
 * ~90-option list by approximate match (cmdk's built-in subsequence scoring)
 * so "PAL", "carton", or "DR" surface the right entries without scrolling a
 * long native `<select>`. A stored legacy value outside the canonical list
 * (`AN_CONTAINER_PACKAGE_TYPES`) stays selectable at the top of the list.
 */
export function PackageTypeCombobox({
  value,
  onValueChange,
  disabled = false,
  'aria-label': ariaLabel,
}: PackageTypeComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const options = React.useMemo(() => {
    if (value && !isAnContainerPackageType(value)) {
      return [{ value, label: value }, ...AN_CONTAINER_PACKAGE_TYPE_OPTIONS]
    }
    return AN_CONTAINER_PACKAGE_TYPE_OPTIONS
  }, [value])

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
            'flex min-h-9 w-full items-center justify-between gap-1.5 self-stretch rounded-none border-0 bg-background px-2 text-left text-sm outline-none transition-colors',
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
                  value={option.label}
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
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
