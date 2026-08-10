'use client'

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/shared/config/react-query.config'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  adminUsersService,
  type PicOption,
} from '@/features/admin/sections/user-management/api/adminUsersService'
import { formatBookingPic } from './bookingPic'

interface InternalUserSearchSelectProps {
  id?: string
  value: string
  selectedId?: number | null
  onChange: (value: string, id: number | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

function userPrimaryLabel(user: PicOption): string {
  return formatBookingPic(user.fullName, user.email) || user.email
}

function userSecondaryLabel(user: PicOption): string | null {
  const role = user.roleName?.trim()
  if (role) return role
  if (user.fullName?.trim() && user.email?.trim()) return user.email.trim()
  return null
}

export function InternalUserSearchSelect({
  id,
  value,
  selectedId,
  onChange,
  placeholder = 'Search internal user...',
  disabled = false,
  className,
}: InternalUserSearchSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const debouncedSearch = useDebouncedValue(search, 250).trim()
  // Empty open uses prefetch cache; search only when q.length >= 2 (party picker).
  const effectiveSearch = debouncedSearch.length >= 2 ? debouncedSearch : ''

  const usersQuery = useQuery({
    queryKey: queryKeys.picOptions(effectiveSearch.toLowerCase()),
    queryFn: () =>
      adminUsersService.listPicOptions({
        q: effectiveSearch || undefined,
        limit: 50,
      }),
    enabled: open,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const users = usersQuery.data ?? []

  return (
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
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value || placeholder}
          </span>
          {usersQuery.isFetching ? (
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
        <Command shouldFilter={false}>
          <CommandInput
            placeholder='Type a name or email...'
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {usersQuery.isPending ? (
              <div className='flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground'>
                <Loader2 className='h-4 w-4 animate-spin' />
                Loading users...
              </div>
            ) : (
              <>
                <CommandEmpty>No internal user found.</CommandEmpty>
                <CommandGroup>
                  {value ? (
                    <CommandItem
                      value='clear-pic-user'
                      onSelect={() => {
                        onChange('', null)
                        setOpen(false)
                      }}
                    >
                      Clear selection
                    </CommandItem>
                  ) : null}

                  {users.map((user) => {
                    const label = userPrimaryLabel(user)
                    const secondary = userSecondaryLabel(user)
                    return (
                      <CommandItem
                        key={user.id}
                        value={`user-${user.id}`}
                        onSelect={() => {
                          onChange(label, user.id)
                          setOpen(false)
                          setSearch('')
                        }}
                      >
                        <Check
                          className={cn(
                            'h-4 w-4 shrink-0',
                            selectedId === user.id || value === label
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                        <span className='flex min-w-0 flex-col'>
                          <span className='truncate'>{label}</span>
                          {secondary ? (
                            <span className='truncate text-xs text-muted-foreground'>
                              {secondary}
                            </span>
                          ) : null}
                        </span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
