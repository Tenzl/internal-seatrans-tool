'use client'

import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { CreateEpdaScreen } from '@/features/admin/epda-create/CreateEpdaScreen'

/** Dedicated EPDA screen — create a new EPDA from scratch (legacy "create" flow). */
export default function Page() {
  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main>
        <CreateEpdaScreen />
      </Main>
    </>
  )
}
