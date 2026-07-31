import { InquiryDetailDrawer } from './InquiryDetailDrawer'
import type { InquiryHistoryRecord } from './inquiryHistory.types'
import {
  resolveInquiryServiceLabel,
  resolveInquiryServiceSlug,
} from './inquiryHistoryRules'
import { getSchemaForService } from './serviceInquirySchemas'

type InquiryDetailOverlayProps = {
  inquiry: InquiryHistoryRecord | null
  serviceType?: string
  serviceLabel?: string
  isAdmin: boolean
  onClose: () => void
  onViewInvoice: () => void
}

export function InquiryDetailOverlay({
  inquiry,
  serviceType,
  serviceLabel,
  isAdmin,
  onClose,
  onViewInvoice,
}: InquiryDetailOverlayProps) {
  const serviceSlug = inquiry
    ? resolveInquiryServiceSlug(inquiry, serviceType)
    : serviceType
  const schema = inquiry ? getSchemaForService(serviceSlug || '') : []

  return (
    <InquiryDetailDrawer
      inquiry={inquiry}
      schema={schema}
      open={Boolean(inquiry)}
      onOpenChange={(open) => !open && onClose()}
      onViewInvoice={onViewInvoice}
      serviceLabel={
        inquiry ? resolveInquiryServiceLabel(inquiry, serviceLabel) : undefined
      }
      serviceSlug={serviceSlug}
      isAdmin={isAdmin}
    />
  )
}
