'use client'

import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { CreateInvoiceTab } from '@/features/admin/components/CreateInvoiceTab'

/** Create a new EPDA from scratch (legacy "Port Charge" / create flow). */
export default function Page() {
  const { t } = useI18n()
  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main>
        <div className='mb-4 space-y-1.5'>
          <h2 className='text-3xl font-bold tracking-tight'>{t('epda.pageTitle')}</h2>
          <p className='max-w-2xl text-base text-muted-foreground'>{t('epda.pageSubtitle')}</p>
        </div>
        <CreateInvoiceTab flow='create' />
      </Main>
    </>
  )
}
