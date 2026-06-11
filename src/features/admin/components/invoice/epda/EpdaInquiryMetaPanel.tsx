'use client'

import { Badge } from '@/shared/components/ui/badge'
import { STATUS_BADGE_CONFIG, type InquiryStatus } from '@/shared/constants/inquiry-status'
import type { ShippingAgencyAdminInquiry } from '@/features/admin/components/invoice/epda/epdaApiMappers'

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString()
}

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium break-words">{value || '—'}</p>
    </div>
  )
}

export function EpdaInquiryMetaPanel({
  inquiry,
  showCustomerAccount = true,
}: {
  inquiry: ShippingAgencyAdminInquiry
  /** Hidden for internally-created EPDAs (no real customer account). */
  showCustomerAccount?: boolean
}) {
  const statusConfig =
    STATUS_BADGE_CONFIG[inquiry.status as InquiryStatus] ?? {
      variant: 'outline' as const,
      label: inquiry.status ?? 'Unknown',
    }

  const customerName =
    inquiry.fullName?.trim() ||
    inquiry.toName?.trim() ||
    inquiry.company?.trim() ||
    '—'

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold tracking-tight">Inquiry #{inquiry.id}</p>
          <p className="text-xs text-muted-foreground">
            Submitted {formatDateTime(inquiry.submittedAt)}
          </p>
        </div>
        <Badge variant={statusConfig.variant} className={statusConfig.className}>
          {statusConfig.label}
        </Badge>
      </div>

      {showCustomerAccount ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Customer account
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <MetaField label="Full name" value={customerName} />
            <MetaField label="Email" value={inquiry.email?.trim() ?? '—'} />
            <MetaField label="Phone" value={inquiry.phone?.trim() ?? '—'} />
            <MetaField label="Company" value={inquiry.company?.trim() ?? '—'} />
          </div>
        </div>
      ) : null}

      {inquiry.notes?.trim() ? (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Notes
          </p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{inquiry.notes}</p>
        </div>
      ) : null}
    </div>
  )
}
