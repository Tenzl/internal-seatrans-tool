'use client'

import * as React from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { formatPortDisplay } from '@/modules/logistics/portDisplay'
import {
  portService,
  type Port,
} from '@/modules/logistics/services/portService'
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
import { getNextPortPage, PORT_SEARCH_PAGE_SIZE } from './portSearchPagination'

interface PortNameSearchSelectProps {
  id?: string
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function PortNameSearchSelect({
  id,
  value,
  onValueChange,
  placeholder = 'Search port name or code...',
  disabled = false,
}: PortNameSearchSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')
  const debouncedSearch = useDebouncedValue(search, 250).trim()

  const portsQuery = useInfiniteQuery({
    queryKey: ['ports', 'name-picker', debouncedSearch.toLowerCase()],
    queryFn: ({ pageParam }) =>
      portService.listPortsPaginated({
        page: pageParam,
        size: PORT_SEARCH_PAGE_SIZE,
        q: debouncedSearch || undefined,
        searchIn: 'name',
        active: true,
      }),
    initialPageParam: 0,
    getNextPageParam: getNextPortPage,
    enabled: open,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })

  const ports = React.useMemo(() => {
    const byId = new Map<number, Port>()
    portsQuery.data?.pages.forEach((page) => {
      page.content.forEach((port) => byId.set(port.id, port))
    })
    return [...byId.values()]
  }, [portsQuery.data])

  const loadNextPage = () => {
    if (!portsQuery.hasNextPage || portsQuery.isFetchingNextPage) return
    void portsQuery.fetchNextPage()
  }

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
          className='w-full justify-between bg-background font-normal'
        >
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value || placeholder}
          </span>
          {portsQuery.isFetching && !portsQuery.isFetchingNextPage ? (
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
            placeholder='Type a port name or code...'
            value={search}
            onValueChange={setSearch}
          />
          <CommandList
            onScroll={(event) => {
              const list = event.currentTarget
              const nearBottom =
                list.scrollHeight - list.scrollTop - list.clientHeight < 32
              if (nearBottom) loadNextPage()
            }}
          >
            {portsQuery.isPending ? (
              <div className='flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground'>
                <Loader2 className='h-4 w-4 animate-spin' />
                Loading ports...
              </div>
            ) : (
              <>
                <CommandEmpty>No port found.</CommandEmpty>
                <CommandGroup>
                  {value ? (
                    <CommandItem
                      value='clear-port'
                      onSelect={() => {
                        onValueChange('')
                        setOpen(false)
                      }}
                    >
                      Clear selection
                    </CommandItem>
                  ) : null}

                  {ports.map((port) => (
                    <CommandItem
                      key={port.id}
                      value={`port-${port.id}`}
                      onSelect={() => {
                        onValueChange(formatPortDisplay(port))
                        setOpen(false)
                        setSearch('')
                      }}
                    >
                      <Check
                        className={cn(
                          'h-4 w-4 shrink-0',
                          value === formatPortDisplay(port) ||
                            value === port.name
                            ? 'opacity-100'
                            : 'opacity-0'
                        )}
                      />
                      <span className='flex min-w-0 flex-col'>
                        <span className='truncate'>
                          {formatPortDisplay(port)}
                        </span>
                        {port.provinceName ? (
                          <span className='truncate text-xs text-muted-foreground'>
                            {port.provinceName}
                          </span>
                        ) : null}
                      </span>
                    </CommandItem>
                  ))}

                  {portsQuery.hasNextPage ? (
                    <CommandItem
                      value='load-next-ports-page'
                      disabled={portsQuery.isFetchingNextPage}
                      onSelect={loadNextPage}
                      className='justify-center text-muted-foreground'
                    >
                      {portsQuery.isFetchingNextPage ? (
                        <>
                          <Loader2 className='h-4 w-4 animate-spin' />
                          Loading next 10 ports...
                        </>
                      ) : (
                        'Load next 10 ports'
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
  )
}
