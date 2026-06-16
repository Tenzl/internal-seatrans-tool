/**
 * Centralized API configuration — aligned with backend2.0.
 * Only endpoints used by the frontend are listed here.
 */

// Backend origin for the client. Leave EMPTY to call the API same-origin via the
// Next.js rewrite proxy (BFF) — recommended in production so the HttpOnly session
// cookie stays first-party and works on mobile (cross-site cookies are blocked
// there). Set an absolute origin only for direct cross-origin calls (dev/testing).
const rawBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || '')
  .replace(/\/+$/, '')
  .replace(/\/api(?:\/v\d+)?$/, '')

const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || 'api'
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || 'v1'
const API_BASE_PATH = `/${API_PREFIX}/${API_VERSION}`

const API_URL = `${rawBaseUrl}${API_BASE_PATH}`
const ASSET_BASE_URL = rawBaseUrl

export const API_CONFIG = {
  API_ORIGIN: rawBaseUrl,
  API_PREFIX,
  API_VERSION,
  API_BASE_PATH,
  API_URL,
  BASE_URL: API_URL,
  ASSET_BASE_URL,
  TIMEOUT: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10),
  ENABLE_LOGS: process.env.NEXT_PUBLIC_ENABLE_API_LOGS === 'true',

  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me',
    LOGOUT: '/auth/logout',
    SESSION: '/auth/session',
    GOOGLE_OAUTH: '/auth/oauth2/google',
  },

  PROVINCES: {
    BASE: '/provinces',
    ACTIVE: '/provinces/active',
    BY_ID: (id: number) => `/provinces/${id}`,
    ADMIN_BASE: '/admin/provinces',
    ADMIN_BY_ID: (id: number) => `/admin/provinces/${id}`,
  },

  PORTS: {
    BASE: '/ports',
    OPTIONS: '/ports/options',
    ACTIVE: '/ports/active',
    BY_PROVINCE: (provinceId: number) => `/ports/province/${provinceId}`,
    BY_ID: (id: number) => `/ports/${id}`,
    ADMIN_BASE: '/admin/ports',
    ADMIN_BY_ID: (id: number) => `/admin/ports/${id}`,
    ADMIN_HAS_INFO: (id: number) => `/admin/ports/${id}/has-info`,
  },

  OFFICES: {
    ACTIVE: '/offices/active',
    ADMIN_BASE: '/admin/offices',
    ADMIN_BY_ID: (id: number) => `/admin/offices/${id}`,
  },

  BOOKING_PARTNERS: {
    OPTIONS: '/admin/booking-management/partners/options',
    ADMIN_BASE: '/admin/booking-management/partners',
    ADMIN_BY_ID: (id: number) => `/admin/booking-management/partners/${id}`,
    UPDATE_CUSTOMER_STATUS: (id: number) =>
      `/admin/booking-management/partners/${id}/customer-status`,
    IMPORT_PREVIEW: '/admin/booking-management/partners/import/preview',
    IMPORT_COMMIT: '/admin/booking-management/partners/import/commit',
    IMPORT_TEMPLATE: '/admin/booking-management/partners/import/template',
    BY_PARTNER: (partnerId: number) =>
      `/admin/booking-management/partners/${partnerId}/shipping`,
  },

  SERVICE_TYPES: {
    BASE: '/service-types',
    ACTIVE: '/service-types/active',
    BY_ID: (id: number) => `/service-types/${id}`,
  },

  COMMODITIES: {
    BY_SERVICE_TYPE: (serviceTypeId: number) => `/commodities/service-type/${serviceTypeId}`,
    ADMIN_BASE: '/admin/commodities',
    ADMIN_BY_ID: (id: number) => `/admin/commodities/${id}`,
  },


  GALLERY: {
    PUBLIC_IMAGES: '/gallery/images',
    ADMIN_BASE: '/admin/gallery-images',
    ADMIN_BATCH: '/admin/gallery-images/batch',
    ADMIN_FROM_URL: '/admin/gallery-images/from-url',
    ADMIN_BY_ID: (id: number) => `/admin/gallery-images/${id}`,
  },

  POSTS: {
    LATEST: '/posts/latest',
    PUBLIC_BASE: '/posts',
    PUBLIC_BY_ID: (id: number) => `/posts/${id}`,
    PUBLIC_RECORD_VIEW: (id: number) => `/posts/${id}/view`,
    ADMIN_BASE: '/admin/posts',
    ADMIN_BY_ID: (id: number) => `/admin/posts/${id}`,
  },

  CATEGORIES: {
    PUBLIC_BASE: '/categories',
    ADMIN_BASE: '/admin/categories',
    ADMIN_BY_ID: (id: number) => `/admin/categories/${id}`,
  },

  USERS: {
    ADMIN_EXTERNAL_CUSTOMERS: '/admin/users/external-customers',
    ADMIN_USERS: '/admin/users',
    ADMIN_USER_ROLES: '/admin/users/roles',
    ADMIN_USER_BY_ID: (id: number) => `/admin/users/${id}`,
    ADMIN_USER_RESET_PASSWORD: (id: number) => `/admin/users/${id}/reset-password`,
    ADMIN_USER_REACTIVATE: (id: number) => `/admin/users/${id}/reactivate`,
  },

  INQUIRIES: {
    SUBMIT: '/inquiries',
    USER_HISTORY: (userId: number) => `/inquiries/user/${userId}`,
    ADMIN_BASE: '/admin/inquiries',
    ADMIN_DETAIL: (serviceType: string, id: number) =>
      `/admin/inquiries/${encodeURIComponent(serviceType)}/${id}`,
    ADMIN_STATUS: (serviceType: string, id: number) =>
      `/admin/inquiries/${encodeURIComponent(serviceType)}/${id}/status`,
    ADMIN_FORM: (serviceType: string, id: number) =>
      `/admin/inquiries/${encodeURIComponent(serviceType)}/${id}/form`,
    ADMIN_HOURS: (serviceType: string, id: number) =>
      `/admin/inquiries/${encodeURIComponent(serviceType)}/${id}/hours`,
    ADMIN_SHIPPING_AGENCY_CREATE: '/admin/inquiries/shipping-agency',
    ADMIN_SHIPPING_AGENCY_EPDA: (id: number) =>
      `/admin/inquiries/shipping-agency/${id}/epda`,
    ADMIN_SHIPPING_AGENCY_EPDA_ISSUE: (id: number) =>
      `/admin/inquiries/shipping-agency/${id}/epda/issue`,
    ADMIN_SHIPPING_AGENCY_FIELD_CHANGES: (id: number, page = 0, size = 6) =>
      `/admin/inquiries/shipping-agency/${id}/epda/field-changes?page=${page}&size=${size}`,
    ADMIN_SHIPPING_AGENCY_CUSTOMER_FIELD_CHANGES: (id: number) =>
      `/admin/inquiries/shipping-agency/${id}/epda/customer-field-changes`,
    USER_BATCH_DELETE: '/inquiries/batch',
    ADMIN_BATCH_DELETE: '/admin/inquiries/batch',
  },

  DOCUMENTS: {
    ADMIN_UPLOAD: (serviceSlug: string, targetId: number) =>
      `/admin/inquiries/${serviceSlug}/${targetId}/documents`,
    ADMIN_DELETE: (serviceSlug: string, targetId: number, documentId: number) =>
      `/admin/inquiries/${serviceSlug}/${targetId}/documents/${documentId}`,
    LIST: (serviceSlug: string, targetId: number) =>
      `/inquiries/${serviceSlug}/${targetId}/documents`,
    LIST_BY_TYPE: (serviceSlug: string, targetId: number) =>
      `/inquiries/${serviceSlug}/${targetId}/documents/by-type`,
    CONTENT: (serviceSlug: string, targetId: number, documentId: number, disposition?: 'inline' | 'attachment') => {
      const base = `/inquiries/${serviceSlug}/${targetId}/documents/${documentId}/content`
      return disposition ? `${base}?disposition=${disposition}` : base
    },
  },

  NOTIFICATIONS: {
    BASE: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    READ_ALL: '/notifications/read-all',
    MARK_READ: (id: number) => `/notifications/${id}/read`,
  },

  EPDA_PARAMETERS: {
    LIST: '/admin/epda-parameters',
    EFFECTIVE: (area: string, portId?: number) => {
      const qs = new URLSearchParams({ area })
      if (portId != null) qs.set('portId', String(portId))
      return `/admin/epda-parameters/effective?${qs.toString()}`
    },
    AREA: (area: string) => `/admin/epda-parameters/area/${encodeURIComponent(area)}`,
    PORT: (portId: number) => `/admin/epda-parameters/port/${portId}`,
    LOGS: (opts?: { area?: string; portId?: number; limit?: number }) => {
      const qs = new URLSearchParams()
      if (opts?.area) qs.set('area', opts.area)
      if (opts?.portId != null) qs.set('portId', String(opts.portId))
      if (opts?.limit != null) qs.set('limit', String(opts.limit))
      const s = qs.toString()
      return `/admin/epda-parameters/logs${s ? `?${s}` : ''}`
    },
    GROUPS: (area: string) =>
      `/admin/epda-parameters/groups?area=${encodeURIComponent(area)}`,
    GROUPS_CREATE: '/admin/epda-parameters/groups',
    GROUP: (id: number) => `/admin/epda-parameters/groups/${id}`,
    GROUP_MEMBERS: (id: number) => `/admin/epda-parameters/groups/${id}/members`,
  },

  ROLES: {
    LIST: '/admin/roles',
    CREATE: '/admin/roles',
    BY_ID: (id: number) => `/admin/roles/${id}`,
    SECTION_CATALOG: '/admin/roles/sections/catalog',
  },
} as const

export type ApiConfig = typeof API_CONFIG
