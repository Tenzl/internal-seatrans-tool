'use client'

import { useSearchParams } from 'next/navigation'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ShippingAgencyInquiriesTab } from '@/features/admin/components/ShippingAgencyInquiriesTab'
import { ShippingAgencyInquiryDetailTab } from '@/features/admin/components/ShippingAgencyInquiryDetailTab'
import { isShippingAgencyInquiryDetailSection } from '@/shared/utils/dashboardNavigation'
import { LanguageToggle } from '@/shared/i18n/LanguageToggle'

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
    <>
      <Header fixed>
        <Search className='me-auto' />
        <LanguageToggle />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main>
        {isDetail ? (
          <ShippingAgencyInquiryDetailTab />
        ) : (
          <ShippingAgencyInquiriesTab />
        )}
      </Main>
    </>
  )
}
