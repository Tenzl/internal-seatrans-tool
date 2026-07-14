'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import {
  externalCustomerService,
  type ExternalCustomerOption,
} from '@/features/admin/services/externalCustomerService'
import { Button } from '@/shared/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/shared/components/ui/command'
import { Label } from '@/shared/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { cn } from '@/shared/lib/utils'

type EpdaCustomerSelectProps = {
  value: number | null
  selectedLabel?: string | null
  onChange: (customerId: number | null, option?: ExternalCustomerOption) => void
  disabled?: boolean
  /** Prefill search when opening (e.g. shipowner name). */
  suggestName?: string
  id?: string
  required?: boolean
  error?: string
}

export function EpdaCustomerSelect({
  value,
  selectedLabel,
  onChange,
  disabled,
  suggestName,
  id = 'customerUserId',
  required = false,
  error,
}: EpdaCustomerSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 250)
  const [options, setOptions] = useState<ExternalCustomerOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const loadOptions = useCallback(async (q?: string) => {
    setIsLoading(true)
    try {
      const rows = await externalCustomerService.list(q, 100)
      setOptions(rows)
    } catch {
      toast.error('Could not load customer list')
      setOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      void loadOptions(debouncedSearch)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [open, debouncedSearch, loadOptions])

  const displayLabel = useMemo(() => {
    if (selectedLabel) return selectedLabel
    const match = options.find((opt) => opt.id === value)
    return match?.label
  }, [options, selectedLabel, value])

  const trimmedSearch = search.trim()
  const canCreate =
    trimmedSearch.length > 0 &&
    !options.some(
      (opt) => opt.fullName.localeCompare(trimmedSearch, undefined, { sensitivity: 'accent' }) === 0,
    )

  const handleCreate = async () => {
    if (!trimmedSearch || isCreating) return
    setIsCreating(true)
    try {
      const created = await externalCustomerService.create(trimmedSearch)
      setOptions((prev) => {
        const next = [created, ...prev.filter((row) => row.id !== created.id)]
        return next.sort((a, b) => a.fullName.localeCompare(b.fullName))
      })
      onChange(created.id, created)
      setOpen(false)
      setSearch('')
      toast.success(`Customer "${created.fullName}" created`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create customer')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        Customer {required ? <span aria-hidden="true">*</span> : null}
      </Label>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (next && suggestName?.trim() && !search) setSearch(suggestName.trim())
          if (!next) setSearch('')
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            name={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error ${id}-hint` : `${id}-hint`}
            disabled={disabled}
            className="h-9 w-full justify-between bg-background font-normal active:scale-[0.99]"
          >
            <span className="truncate text-left">{displayLabel ?? 'Select customer…'}</span>
            {isLoading || isCreating ? (
              <Loader2 aria-hidden="true" className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-60" />
            ) : (
              <ChevronsUpDown aria-hidden="true" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name or company…"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {isLoading ? (
                <p
                  aria-live="polite"
                  className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground"
                  role="status"
                >
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Loading customers…
                </p>
              ) : (
                <>
                  <CommandEmpty>No matching customer.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value="clear"
                      onSelect={() => {
                        onChange(null)
                        setOpen(false)
                        setSearch('')
                      }}
                    >
                      —
                    </CommandItem>
                    {options.map((opt) => (
                      <CommandItem
                        key={opt.id}
                        value={String(opt.id)}
                        onSelect={() => {
                          onChange(opt.id, opt)
                          setOpen(false)
                          setSearch('')
                        }}
                      >
                        <Check
                          aria-hidden="true"
                          className={cn(
                            'mr-2 h-4 w-4 shrink-0',
                            value === opt.id ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <span className="truncate">{opt.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  {canCreate ? (
                    <>
                      <CommandSeparator />
                      <CommandGroup>
                        <CommandItem
                          value={`create-${trimmedSearch}`}
                          disabled={isCreating}
                          onSelect={() => void handleCreate()}
                        >
                          <UserPlus aria-hidden="true" className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                          <span className="truncate">
                            Create customer &ldquo;{trimmedSearch}&rdquo;
                          </span>
                        </CommandItem>
                      </CommandGroup>
                    </>
                  ) : null}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error ? <p id={`${id}-error`} className="text-xs text-destructive">{error}</p> : null}
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        External customers only. Pick an existing name or create a new account for this EPDA.
      </p>
    </div>
  )
}
