import type { Port } from '@/modules/logistics/services/portService'
import type { PageResponse } from '@/shared/types/api.types'

export const PORT_SEARCH_PAGE_SIZE = 10

export function getNextPortPage(page: PageResponse<Port>): number | undefined {
  const currentPage = page.page ?? 0
  return currentPage + 1 < page.totalPages ? currentPage + 1 : undefined
}
