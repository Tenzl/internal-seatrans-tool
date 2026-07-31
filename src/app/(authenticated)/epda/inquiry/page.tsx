'use client'

import { BaseInquiryHistoryLayout } from '@/modules/users/components/history/BaseInquiryHistoryLayout'
import { isShippingAgencyInquiryDetailSection } from '@/shared/utils/dashboardNavigation'
import { Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { AdminPageShell } from '@/components/layout/admin-page-shell'

// The EPDA worksheet is large; load it only when a record is opened.
const EpdaInquiryDetail = dynamic(
  () =>
    import('@/features/admin/sections/epda-inquiries/EpdaInquiryDetail').then(
      (module) => module.EpdaInquiryDetail
    ),
  {
    loading: () => (
      <div className='flex min-h-[240px] items-center justify-center'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    ),
  }
)

/**
 * Section router for shipping-agency inquiries — mirrors the legacy MainDashboard:
 * `?section=shipping-agency-inquiry-detail&inquiryId=…` shows the EPDA editor,
 * otherwise the inquiry list.
 */
export default function Page() {
  const searchParams = useSearchParams()
  const isDetail = isShippingAgencyInquiryDetailSection(
    searchParams.get('section')
  )

  return (
    <AdminPageShell>
      {isDetail ? (
        <EpdaInquiryDetail />
      ) : (
        <BaseInquiryHistoryLayout
          serviceType='shipping-agency'
          serviceLabel='Shipping Agency'
          isAdmin
          description='Manage all shipping agency service inquiries'
        />
      )}
    </AdminPageShell>
  )
}
