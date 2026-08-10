'use client'

import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  portService,
  PORTS_ADMIN_LIST_SIZE,
  type PortSearchFieldId,
} from '@/modules/logistics/services/portService'
import { provinceService } from '@/modules/logistics/services/provinceService'
import { queryKeys } from '@/shared/config/react-query.config'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { toast } from '@/shared/utils/toast'
import {
  buildPortTableRows,
  buildPortTableTitle,
} from './portManagement.helpers'
import { PORT_SEARCH_FIELDS } from './portManagement.types'

/** Owns the server-backed port list, search and pagination state. */
export function usePortsCatalog() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(0)
  const [search, setSearchState] = useState('')
  const [searchField, setSearchFieldState] = useState<PortSearchFieldId>('name')
  const debouncedSearch = useDebouncedValue(search, 300)

  const { data: provinces = [] } = useQuery({
    queryKey: queryKeys.provinces(),
    queryFn: async () => {
      try {
        return await provinceService.getAllProvinces()
      } catch (error) {
        toast.error('Failed to load provinces')
        throw error
      }
    },
  })

  const {
    data: portsPage,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: [...queryKeys.portsList(debouncedSearch, searchField), page],
    queryFn: async () => {
      try {
        return await portService.listPortsPaginated({
          page,
          size: PORTS_ADMIN_LIST_SIZE,
          q: debouncedSearch.trim() || undefined,
          searchIn: searchField,
        })
      } catch {
        toast.error('Failed to load ports')
        throw new Error('Failed to load ports')
      }
    },
  })

  const ports = useMemo(() => portsPage?.content ?? [], [portsPage?.content])
  const totalElements = portsPage?.totalElements ?? 0
  const pageCount = Math.max(1, portsPage?.totalPages ?? 1)
  const rows = useMemo(
    () => buildPortTableRows(ports, provinces),
    [ports, provinces]
  )
  const searchFieldLabel =
    PORT_SEARCH_FIELDS.find((field) => field.id === searchField)?.label ??
    'Name'
  const hasActiveSearch = debouncedSearch.trim().length > 0

  const setSearch = useCallback((nextSearch: string) => {
    setSearchState(nextSearch)
    setPage(0)
  }, [])

  const setSearchField = useCallback((field: PortSearchFieldId) => {
    setSearchFieldState(field)
    setPage(0)
  }, [])

  const clearFilters = useCallback(() => {
    setSearchState('')
    setSearchFieldState('name')
    setPage(0)
  }, [])

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.portsListPrefix(),
    })
  }, [queryClient])

  return {
    clearFilters,
    createName: searchField === 'name' ? debouncedSearch : '',
    hasActiveSearch,
    invalidate,
    isFetching,
    isLoading,
    page,
    pageCount,
    provinces,
    rows,
    search,
    searchField,
    searchFieldLabel,
    setPage,
    setSearch,
    setSearchField,
    tableTitle: buildPortTableTitle({
      search,
      searchFieldLabel,
      shownCount: ports.length,
      totalCount: totalElements,
    }),
    totalElements,
  }
}
