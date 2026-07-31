import {
  STATUS_COMPLETED,
  STATUS_QUOTED,
} from '@/shared/constants/inquiry-status'
import type { InquiryHistoryRecord } from './inquiryHistory.types'
import { getServiceSlugFromInquiry } from './serviceInquirySchemas'

export function resolveInquiryServiceSlug(
  inquiry: InquiryHistoryRecord,
  fallback?: string
) {
  return getServiceSlugFromInquiry(inquiry) || fallback
}

export function resolveInquiryServiceLabel(
  inquiry: InquiryHistoryRecord,
  fallback?: string
) {
  return (
    inquiry.serviceType?.displayName ||
    inquiry.serviceType?.name ||
    fallback ||
    'Service'
  )
}

export function getInquiryDisplayName(
  inquiry: InquiryHistoryRecord,
  isShippingAgencyHistory: boolean
) {
  if (isShippingAgencyHistory) {
    return inquiry.mv || inquiry.vesselName || '—'
  }
  return (
    inquiry.fullName ||
    inquiry.contactName ||
    inquiry.name ||
    inquiry.toName ||
    '—'
  )
}

export function getInquiryPort(inquiry: InquiryHistoryRecord) {
  return (
    inquiry.portOfCall || inquiry.loadingPort || inquiry.dischargingPort || '—'
  )
}

export function canLockInquiryEpda(
  inquiry: InquiryHistoryRecord,
  isAdmin: boolean,
  fallbackServiceType?: string
) {
  return (
    isAdmin &&
    resolveInquiryServiceSlug(inquiry, fallbackServiceType) ===
      'shipping-agency' &&
    !inquiry.isArchived &&
    !inquiry.epdaLockedAt
  )
}

export function getShippingAgencyDetailParams(inquiry: InquiryHistoryRecord) {
  const isLocked = Boolean(inquiry.epdaLockedAt)
  const showPreview =
    inquiry.status === STATUS_COMPLETED ||
    inquiry.status === STATUS_QUOTED ||
    isLocked
  const params: Record<string, string> = {
    inquiryId: String(inquiry.id),
  }

  if (!isLocked) params.mode = 'edit'
  if (showPreview) params.preview = '1'
  return params
}

export function getInquiryRowCapabilities({
  inquiry,
  isAdmin,
  canSoftDelete,
  canHardDelete,
  fallbackServiceType,
}: {
  inquiry: InquiryHistoryRecord
  isAdmin: boolean
  canSoftDelete: boolean
  canHardDelete: boolean
  fallbackServiceType?: string
}) {
  const isShippingAgency =
    resolveInquiryServiceSlug(inquiry, fallbackServiceType) ===
    'shipping-agency'

  return {
    isShippingAgency,
    canLock: canLockInquiryEpda(inquiry, isAdmin, fallbackServiceType),
    showLocked: isAdmin && isShippingAgency && Boolean(inquiry.epdaLockedAt),
    canArchive: isAdmin && canSoftDelete && !inquiry.isArchived,
    canDelete: isAdmin && canHardDelete,
    canRestore: isAdmin && canHardDelete && Boolean(inquiry.isArchived),
    canViewInvoice:
      !isAdmin && isShippingAgency && inquiry.status === STATUS_QUOTED,
  }
}
