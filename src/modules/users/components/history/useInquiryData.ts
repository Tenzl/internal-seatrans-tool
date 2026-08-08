'use client'

import { useCallback, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { SortingState } from '@tanstack/react-table'
import { useCurrentUser } from '@/hooks/use-current-user'
import { API_CONFIG } from '@/shared/config/api.config'
import { toInquiryServiceSlug } from '@/shared/domain/inquiryService'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import type { User } from '@/shared/types/dashboard'
import { apiClient } from '@/shared/utils/apiClient'
import { isInternalStaff } from '@/shared/utils/auth'
import { parseLocalDateTime } from '@/shared/utils/dateTimePicker'

export const INQUIRY_PAGE_SIZE = 20
export const INQUIRIES_QUERY_ROOT = ['inquiries'] as const

interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export type InquiryRecord = Record<string, unknown> & {
  id: number
  status?: string
  isArchived?: boolean
  deletedAt?: string | null
  deletedById?: number | null
  fullName?: string | null
  mv?: string | null
  submittedAt?: string | Date | null
}

interface InquiryPageEnvelope {
  data?: PageResponse<InquiryRecord> | InquiryRecord[]
}

interface ApiErrorBody {
  error?: { message?: string }
  message?: string
}

export type AdminArchivedFilter = 'active' | 'archived' | 'all'

interface UseInquiryDataOptions {
  serviceType?: string
  isAdmin?: boolean
}

const SERVICE_TYPE_NAME_MAP: Record<string, string> = {
  'shipping-agency': 'SHIPPING AGENCY',
  'freight-forwarding': 'FREIGHT FORWARDING',
  'chartering-ship-broking': 'CHARTERING',
  chartering: 'CHARTERING',
  'total-logistics': 'LOGISTICS',
  logistics: 'LOGISTICS',
  'special-request': 'SPECIAL REQUEST',
}

function toServiceTypeName(input?: string): string | undefined {
  if (!input) return undefined
  const trimmed = input.trim()
  return SERVICE_TYPE_NAME_MAP[trimmed] ?? trimmed
}

function shouldUseAdminInquiryApi(
  isAdmin: boolean,
  currentUser: User | null
): boolean {
  return isAdmin && isInternalStaff(currentUser)
}

function extractPage(
  value: PageResponse<InquiryRecord> | InquiryRecord[] | InquiryPageEnvelope
): PageResponse<InquiryRecord> {
  if (Array.isArray(value)) {
    return {
      content: value,
      totalElements: value.length,
      totalPages: value.length === 0 ? 0 : 1,
      size: value.length,
      number: 0,
    }
  }
  if ('data' in value && value.data) return extractPage(value.data)
  if ('content' in value && Array.isArray(value.content)) {
    return {
      content: value.content,
      totalElements: value.totalElements ?? value.content.length,
      totalPages:
        value.totalPages ??
        (value.content.length === 0
          ? 0
          : Math.ceil(
              (value.totalElements ?? value.content.length) /
                (value.size || INQUIRY_PAGE_SIZE)
            )),
      size: value.size ?? INQUIRY_PAGE_SIZE,
      number: value.number ?? 0,
    }
  }
  return {
    content: [],
    totalElements: 0,
    totalPages: 0,
    size: INQUIRY_PAGE_SIZE,
    number: 0,
  }
}

/** Convert local picker value to ISO bound for ListInquiriesQueryDto. */
function toApiDateBound(
  value: string,
  endOfDay: boolean
): string | undefined {
  const parsed = parseLocalDateTime(value)
  if (!parsed) return undefined
  if (endOfDay) {
    parsed.setHours(23, 59, 59, 999)
  } else {
    parsed.setHours(0, 0, 0, 0)
  }
  return parsed.toISOString()
}

function sortRows(
  rows: InquiryRecord[],
  sorting: SortingState
): InquiryRecord[] {
  const primary = sorting[0]
  if (!primary?.id) return rows
  const dir = primary.desc ? -1 : 1
  const key = primary.id
  return [...rows].sort((a, b) => {
    const left = a[key]
    const right = b[key]
    if (left == null && right == null) return 0
    if (left == null) return 1
    if (right == null) return -1
    if (left instanceof Date || right instanceof Date || key === 'submittedAt') {
      const leftTime = new Date(left as string | number | Date).getTime()
      const rightTime = new Date(right as string | number | Date).getTime()
      return (leftTime - rightTime) * dir
    }
    if (typeof left === 'number' && typeof right === 'number') {
      return (left - right) * dir
    }
    return String(left).localeCompare(String(right)) * dir
  })
}

async function fetchInquiryPage(options: {
  isAdmin: boolean
  currentUser: User | null
  serviceType?: string
  archivedFilter: AdminArchivedFilter
  page: number
  size: number
  q?: string
  dateFrom?: string
  dateTo?: string
  signal?: AbortSignal
}): Promise<PageResponse<InquiryRecord>> {
  const {
    isAdmin,
    currentUser,
    serviceType,
    archivedFilter,
    page,
    size,
    q,
    dateFrom,
    dateTo,
    signal,
  } = options
  const useAdminApi = shouldUseAdminInquiryApi(isAdmin, currentUser)

  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  })
  if (serviceType?.trim()) {
    params.append('serviceSlug', serviceType.trim())
  }
  if (q?.trim()) {
    params.append('q', q.trim())
  }
  const apiDateFrom = dateFrom ? toApiDateBound(dateFrom, false) : undefined
  const apiDateTo = dateTo ? toApiDateBound(dateTo, true) : undefined
  if (apiDateFrom) params.append('dateFrom', apiDateFrom)
  if (apiDateTo) params.append('dateTo', apiDateTo)

  if (!useAdminApi) {
    if (!currentUser?.id) {
      throw new Error('Please log in to view your inquiries.')
    }
    const response = await apiClient.get<PageResponse<InquiryRecord>>(
      `${API_CONFIG.INQUIRIES.USER_HISTORY(currentUser.id)}?${params.toString()}`,
      { signal }
    )
    if (!response.ok) throw new Error('Failed to fetch inquiries')
    const data = (await response.json()) as
      | PageResponse<InquiryRecord>
      | InquiryRecord[]
      | InquiryPageEnvelope
    return extractPage(data)
  }

  params.append('archived', archivedFilter)

  const response = await apiClient.get<PageResponse<InquiryRecord>>(
    `${API_CONFIG.INQUIRIES.ADMIN_BASE}?${params.toString()}`,
    { signal }
  )
  if (!response.ok) throw new Error('Failed to fetch inquiries')
  const data = (await response.json()) as
    | PageResponse<InquiryRecord>
    | InquiryRecord[]
    | InquiryPageEnvelope
  return extractPage(data)
}

export function useInquiryData(options: UseInquiryDataOptions = {}) {
  const { serviceType, isAdmin = false } = options
  const currentUser = useCurrentUser()
  const queryClient = useQueryClient()

  const [page, setPage] = useState(0)
  const [search, setSearchState] = useState('')
  const [dateFrom, setDateFromState] = useState('')
  const [dateTo, setDateToState] = useState('')
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'submittedAt', desc: true },
  ])
  const [archivedFilter, setArchivedFilterState] =
    useState<AdminArchivedFilter>('all')

  const debouncedSearch = useDebouncedValue(search, 300)
  const useAdminApi = shouldUseAdminInquiryApi(isAdmin, currentUser)

  const listQuery = useQuery({
    queryKey: [
      ...INQUIRIES_QUERY_ROOT,
      {
        serviceType: serviceType ?? '',
        isAdmin: useAdminApi,
        userId: currentUser?.id ?? null,
        page,
        size: INQUIRY_PAGE_SIZE,
        // Only API-backed filters belong in the key (FE-03).
        q: debouncedSearch,
        dateFrom,
        dateTo,
        archived: archivedFilter,
      },
    ],
    queryFn: ({ signal }) =>
      fetchInquiryPage({
        isAdmin,
        currentUser,
        serviceType,
        archivedFilter,
        page,
        size: INQUIRY_PAGE_SIZE,
        q: debouncedSearch,
        dateFrom,
        dateTo,
        signal,
      }),
    enabled: useAdminApi || Boolean(currentUser?.id),
  })

  const pageRows = listQuery.data?.content ?? []
  // Page-local sort only — not part of the query key / server contract.
  const inquiries = useMemo(
    () => sortRows(pageRows, sorting),
    [pageRows, sorting]
  )

  const totalElements = listQuery.data?.totalElements ?? 0
  const totalPages = listQuery.data?.totalPages ?? 0

  const setSearch = useCallback((value: string) => {
    setSearchState(value)
    setPage(0)
  }, [])

  const setDateFrom = useCallback((value: string) => {
    setDateFromState(value)
    setPage(0)
  }, [])

  const setDateTo = useCallback((value: string) => {
    setDateToState(value)
    setPage(0)
  }, [])

  const setArchivedFilter = useCallback((value: AdminArchivedFilter) => {
    setArchivedFilterState(value)
    setPage(0)
  }, [])

  const invalidateInquiries = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: INQUIRIES_QUERY_ROOT })
  }, [queryClient])

  const updateStatus = useCallback(
    async (id: number, status: string, serviceSlug?: string) => {
      if (!shouldUseAdminInquiryApi(isAdmin, currentUser)) {
        return { success: false }
      }
      const serviceName = toServiceTypeName(serviceSlug || serviceType)
      if (!serviceName) {
        throw new Error('serviceType is required to update status')
      }

      const response = await apiClient.patch(
        API_CONFIG.INQUIRIES.ADMIN_STATUS(serviceName, id),
        { status }
      )
      if (!response.ok) throw new Error('Failed to update status')

      await invalidateInquiries()
      return { success: true }
    },
    [currentUser, invalidateInquiries, isAdmin, serviceType]
  )

  const deleteInquiries = useCallback(
    async (ids: number[], mode: 'soft' | 'hard' = 'soft') => {
      const adminApi = shouldUseAdminInquiryApi(isAdmin, currentUser)
      const serviceSlug = toInquiryServiceSlug(serviceType)
      if (!serviceSlug) {
        throw new Error('A supported service is required to delete inquiries')
      }
      const endpoint = adminApi
        ? API_CONFIG.INQUIRIES.ADMIN_BATCH_DELETE(mode, serviceSlug)
        : API_CONFIG.INQUIRIES.USER_BATCH_DELETE(serviceSlug)

      const response = await apiClient.delete(endpoint, {
        body: JSON.stringify({ ids }),
      })

      if (!response.ok) {
        const body = (await response
          .json()
          .catch(() => null)) as ApiErrorBody | null
        throw new Error(
          body?.error?.message || body?.message || 'Failed to delete inquiries'
        )
      }

      await invalidateInquiries()
      return { success: true }
    },
    [currentUser, invalidateInquiries, isAdmin, serviceType]
  )

  const restoreInquiries = useCallback(
    async (ids: number[]) => {
      const endpoint = API_CONFIG.INQUIRIES.ADMIN_BATCH_RESTORE(serviceType)
      const response = await apiClient.post(endpoint, { ids })

      if (!response.ok) {
        const body = (await response
          .json()
          .catch(() => null)) as ApiErrorBody | null
        throw new Error(
          body?.error?.message || body?.message || 'Failed to restore inquiries'
        )
      }

      await invalidateInquiries()
      return { success: true }
    },
    [invalidateInquiries, serviceType]
  )

  const refreshInquiries = useCallback(() => {
    return invalidateInquiries()
  }, [invalidateInquiries])

  const fetchInquiries = refreshInquiries

  const error =
    listQuery.error instanceof Error
      ? listQuery.error.message
      : listQuery.error
        ? 'Could not load inquiries'
        : !useAdminApi && !currentUser?.id
          ? 'Please log in to view your inquiries.'
          : null

  return {
    inquiries,
    isLoading: listQuery.isLoading || listQuery.isFetching,
    error,
    page,
    setPage,
    pageSize: INQUIRY_PAGE_SIZE,
    totalElements,
    totalPages,
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    sorting,
    setSorting,
    fetchInquiries,
    deleteInquiries,
    restoreInquiries,
    archivedFilter,
    setArchivedFilter,
    updateStatus,
    refreshInquiries,
  }
}
