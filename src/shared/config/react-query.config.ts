import { QueryClient, DefaultOptions } from "@tanstack/react-query"

const defaultQueryOptions: DefaultOptions = {
  queries: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (replaces cacheTime in TanStack v5)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  },
}

export const queryClientOptions: DefaultOptions = defaultQueryOptions

export const createQueryClient = () => new QueryClient({ defaultOptions: queryClientOptions })

/** Stable references across calls for queryKey memoization. */
const STATIC_LIST_KEYS = {
  ports: ["ports"],
  provinces: ["provinces"],
  partners: ["partners"],
} as const

export const queryKeys = {
  inquiries: (type: string = "all") => ["inquiries", type] as const,
  services: () => ["services"] as const,
  ports: () => STATIC_LIST_KEYS.ports,
  portsList: (q: string, searchIn: string) => ['ports', 'list', q, searchIn] as const,
  portsListPrefix: () => ['ports', 'list'] as const,
  provinces: () => STATIC_LIST_KEYS.provinces,
  partners: () => STATIC_LIST_KEYS.partners,
  partnersList: (
    page: number,
    q: string,
    additionType: string,
    customerStatus: string,
    customerType: string,
  ) => ['partners', 'list', page, q, additionType, customerStatus, customerType] as const,
  partnersListPrefix: () => ['partners', 'list'] as const,
  user: (id: number | string) => ["user", id] as const,
  dashboardAdmin: () => ["dashboard", "admin"] as const,
  dashboardCustomer: () => ["dashboard", "customer"] as const,
  bookingShipping: (partnerId: number) => ["bookingShipping", partnerId] as const,
  /** Cached partner typeahead (q = normalized search string) */
  partnerOptions: (q = "") => [...queryKeys.partners(), "options", q] as const,
  /** Cached port typeahead */
  portOptionsSearch: (q = "") => [...queryKeys.ports(), "options", "search", q] as const,
  portOptionsByIds: (idsKey: string) => [...queryKeys.ports(), "options", "ids", idsKey] as const,
  adminUsers: (params: { roleGroup: string; q?: string; roleName?: string }) =>
    ['adminUsers', params.roleGroup, params.q ?? '', params.roleName ?? ''] as const,
  adminUserRoles: (roleGroup: string) => ['adminUserRoles', roleGroup] as const,
}
