import type { ComponentProps, ReactNode } from 'react'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Header } from './header'
import { Main } from './main'

type AdminPageHeaderProps = Omit<ComponentProps<typeof Header>, 'children'>

type AdminPageShellProps = {
  children: ReactNode
  headerProps?: AdminPageHeaderProps
  mainProps?: Omit<ComponentProps<typeof Main>, 'children'>
}

/** Shared authenticated-page controls; callers may still provide custom page bodies. */
export function AdminPageHeader({
  fixed = true,
  ...props
}: AdminPageHeaderProps) {
  return (
    <Header fixed={fixed} {...props}>
      <Search className='me-auto' />
      <ThemeSwitch />
      <ConfigDrawer />
      <ProfileDropdown />
    </Header>
  )
}

/** Standard authenticated page frame with consistent header and content sizing. */
export function AdminPageShell({
  children,
  headerProps,
  mainProps,
}: AdminPageShellProps) {
  return (
    <>
      <AdminPageHeader {...headerProps} />
      <Main {...mainProps}>{children}</Main>
    </>
  )
}
