/** Stable references across calls for queryKey memoization. */
const STATIC_LIST_KEYS = {
  ports: ['ports'],
  provinces: ['provinces'],
  partners: ['partners'],
} as const

export const queryKeys = {
  inquiries: (params?: {
    type?: string
    page?: number
    size?: number
    search?: string
    dateFrom?: string
    dateTo?: string
    sort?: string
    archived?: string
  }) =>
    params
      ? ([
          'inquiries',
          params.type ?? 'all',
          params.page ?? 0,
          params.size ?? 20,
          params.search ?? '',
          params.dateFrom ?? '',
          params.dateTo ?? '',
          params.sort ?? '',
          params.archived ?? '',
        ] as const)
      : (['inquiries'] as const),
  adminPosts: (params: { page: number; size: number; q?: string }) =>
    ['adminPosts', params.page, params.size, params.q ?? ''] as const,
  adminPostsRoot: () => ['adminPosts'] as const,
  services: () => ['services'] as const,
  ports: () => STATIC_LIST_KEYS.ports,
  portsList: (q: string, searchIn: string) =>
    ['ports', 'list', q, searchIn] as const,
  portsListPrefix: () => ['ports', 'list'] as const,
  provinces: () => STATIC_LIST_KEYS.provinces,
  partners: () => STATIC_LIST_KEYS.partners,
  partnersList: (
    page: number,
    q: string,
    additionType: string,
    customerStatus: string,
    customerType: string
  ) =>
    [
      'partners',
      'list',
      page,
      q,
      additionType,
      customerStatus,
      customerType,
    ] as const,
  partnersListPrefix: () => ['partners', 'list'] as const,
  partnerDocumentPickerPrefix: () =>
    ['partners', 'document-party-picker'] as const,
  partnerDocumentOptions: (
    additionType: string | null,
    customerType: string | null,
    q: string
  ) =>
    [
      'partners',
      'document-party-picker',
      'options',
      additionType,
      customerType,
      q,
    ] as const,
  partnerDocumentSelected: (id: number) =>
    ['partners', 'document-party-picker', 'selected', id] as const,
  user: (id: number | string) => ['user', id] as const,
  dashboardAdmin: () => ['dashboard', 'admin'] as const,
  dashboardCustomer: () => ['dashboard', 'customer'] as const,
  /** Legacy cached partner typeahead (q = normalized search string). */
  partnerOptions: (q = '') => [...queryKeys.partners(), 'options', q] as const,
  /** Cached port typeahead */
  portOptionsSearch: (q = '') =>
    [...queryKeys.ports(), 'options', 'search', q] as const,
  portOptionsByIds: (idsKey: string) =>
    [...queryKeys.ports(), 'options', 'ids', idsKey] as const,
  adminUsers: (params: {
    roleGroup: string
    q?: string
    roleName?: string
    page?: number
    limit?: number
  }) =>
    [
      'adminUsers',
      params.roleGroup,
      params.q ?? '',
      params.roleName ?? '',
      params.page ?? 0,
      params.limit ?? 20,
    ] as const,
  /** Booking Person In Charge picker (empty q = prefetch / open cache). */
  picOptions: (q = '') => ['users', 'internal-pic-picker', q] as const,
  adminUserRoles: (roleGroup: string) => ['adminUserRoles', roleGroup] as const,
  storageList: (prefix: string) => ['storage', 'list', prefix] as const,
  storageListPrefix: () => ['storage', 'list'] as const,
  bookingHistoryList: (page: number, size: number) =>
    ['transportDocuments', 'bookings', page, size] as const,
  bookingWorkflow: (bookingId: number) =>
    ['transportDocuments', 'workflow', bookingId] as const,
}
