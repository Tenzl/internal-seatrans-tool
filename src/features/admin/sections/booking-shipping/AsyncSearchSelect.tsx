'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command'
import { Label } from '@/shared/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/lib/utils'

export type SearchSelectOption = {
  value: number
  label: string
  hint?: string | null
}

export function AsyncSearchSelect({
  label,
  value,
  options,
  selectedLabel,
  onChange,
  onSearchChange,
  search,
  isLoading,
  disabled,
  placeholder = 'Search…',
  emptyMessage = 'No results.',
  idleMessage = 'Type to search…',
  requireSearch = false,
  allowClear = true,
}: {
  label: string
  value: number | null | undefined
  options: SearchSelectOption[]
  selectedLabel?: string | null
  onChange: (value: number | null) => void
  onSearchChange: (query: string) => void
  search: string
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
  emptyMessage?: string
  idleMessage?: string
  /** When true, list stays empty until the user types in the search box */
  requireSearch?: boolean
  allowClear?: boolean
}) {
  const [open, setOpen] = useState(false)
  const awaitingSearch = requireSearch && search.trim().length === 0

  const displayLabel = useMemo(() => {
    if (selectedLabel) return selectedLabel
    const match = options.find((opt) => opt.value === value)
    return match?.label
  }, [options, selectedLabel, value])

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) onSearchChange('')
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="h-9 w-full justify-between bg-background font-normal active:scale-[0.99]"
          >
            <span className="truncate text-left">
              {displayLabel ?? 'Select…'}
            </span>
            {isLoading ? (
              <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-60" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={placeholder}
              value={search}
              onValueChange={onSearchChange}
            />
            <CommandList>
              {awaitingSearch ? (
                <p className="px-3 py-4 text-sm text-muted-foreground">{idleMessage}</p>
              ) : isLoading ? (
                <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching…
                </div>
              ) : (
                <>
                  <CommandEmpty>{emptyMessage}</CommandEmpty>
                  <CommandGroup>
                    {allowClear && (
                      <CommandItem
                        value="clear"
                        onSelect={() => {
                          onChange(null)
                          setOpen(false)
                          onSearchChange('')
                        }}
                      >
                        —
                      </CommandItem>
                    )}
                    {options.map((opt) => (
                      <CommandItem
                        key={opt.value}
                        value={String(opt.value)}
                        onSelect={() => {
                          onChange(opt.value)
                          setOpen(false)
                          onSearchChange('')
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4 shrink-0',
                            value === opt.value ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate">{opt.label}</span>
                          {opt.hint ? (
                            <span className="truncate text-xs text-muted-foreground">
                              {opt.hint}
                            </span>
                          ) : null}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
