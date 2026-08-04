import type { Port } from '@/modules/logistics/services/portService'
import type { PageResponse } from '@/shared/types/api.types'
import { describe, expect, it } from 'vitest'
import { getNextPortPage, PORT_SEARCH_PAGE_SIZE } from './portSearchPagination'

const page = (current: number, totalPages: number): PageResponse<Port> => ({
  content: [],
  page: current,
  size: PORT_SEARCH_PAGE_SIZE,
  totalElements: totalPages * PORT_SEARCH_PAGE_SIZE,
  totalPages,
})

describe('PortNameSearchSelect pagination', () => {
  it('requests ports in pages of 10', () => {
    expect(PORT_SEARCH_PAGE_SIZE).toBe(10)
  })

  it('continues until the last page', () => {
    expect(getNextPortPage(page(0, 3))).toBe(1)
    expect(getNextPortPage(page(1, 3))).toBe(2)
    expect(getNextPortPage(page(2, 3))).toBeUndefined()
  })
})
