'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

import { CreateInvoiceTab } from '@/features/admin/components/CreateInvoiceTab'

/**
 * View / edit EPDA for one shipping-agency inquiry (opened from the inquiry list,
 * not from the Create EPDA menu).
 *
 * NOTE: Do NOT trigger any `router.replace` from this component. URL routing is
 * owned by `MainDashboard`; replacing here causes a stale exit-animation render
 * to bounce the user back to `shipping-agency-inquiries` when they navigate to
 * an unrelated section (the URL has already changed before this component
 * unmounts).
 */
export function ShippingAgencyInquiryDetailTab() {
  const searchParams = useSearchParams()

  const inquiryId = useMemo(() => {
    const raw = searchParams.get('inquiryId')
    if (!raw) return undefined
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
  }, [searchParams])

  // Default to a read-only EPDA view; the "Edit" button adds `&mode=edit`.
  const isEditMode = searchParams.get('mode') === 'edit'

  if (!inquiryId) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return <CreateInvoiceTab inquiryId={inquiryId} flow="inquiry-detail" readOnly={!isEditMode} />
}
