import type { InquiryRecord } from './useInquiryData'
import type { InquiryParty } from '@/modules/inquiries/types/shippingAgencyEpda'

export interface BaseInquiryHistoryLayoutProps {
  serviceType?: string
  serviceLabel?: string
  isAdmin?: boolean
  title?: string
  description?: string
}

export type InquiryHistoryRecord = InquiryRecord & {
  status: string
  submittedAt: string
  serviceType?: { name?: string; displayName?: string }
  code?: string
  mv?: string
  vesselName?: string
  toName?: string
  fullName?: string
  name?: string
  contactName?: string
  loadingPort?: string
  dischargingPort?: string
  portOfCall?: string
  epdaLockedAt?: string | null
  employeeInCharge?: InquiryParty | null
  clientSubmittedBy?: InquiryParty | null
}

export type InquiryActionPermissions = {
  isAdmin: boolean
  canSoftDelete: boolean
  canHardDelete: boolean
}
