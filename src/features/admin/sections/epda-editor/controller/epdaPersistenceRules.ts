import type { ShippingAgencyAdminInquiry } from '@/modules/inquiries/types/shippingAgencyEpda'

export function resolveIssuedLockedAt(
  saved: ShippingAgencyAdminInquiry,
  fallback: Date
) {
  return saved.epdaLockedAt
    ? String(saved.epdaLockedAt)
    : fallback.toISOString()
}

export function mergeIssuedInquiryMeta(
  current: ShippingAgencyAdminInquiry | null,
  saved: ShippingAgencyAdminInquiry
) {
  if (!current) return current
  return {
    ...current,
    status: saved.status ? String(saved.status) : current.status,
    epdaLockedAt: saved.epdaLockedAt
      ? String(saved.epdaLockedAt)
      : current.epdaLockedAt,
  }
}
