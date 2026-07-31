// @vitest-environment jsdom
import type { ComponentProps } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminPageHeader, AdminPageShell } from './admin-page-shell'

afterEach(cleanup)

vi.mock('./header', () => ({
  Header: ({
    fixed,
    children,
    ...props
  }: ComponentProps<'header'> & { fixed?: boolean }) => (
    <header data-fixed={fixed} {...props}>
      {children}
    </header>
  ),
}))

vi.mock('./main', () => ({
  Main: ({
    fixed,
    fluid,
    children,
    ...props
  }: ComponentProps<'main'> & { fixed?: boolean; fluid?: boolean }) => (
    <main data-fixed={fixed} data-fluid={fluid} {...props}>
      {children}
    </main>
  ),
}))

vi.mock('@/components/search', () => ({
  Search: () => <div>Search</div>,
}))
vi.mock('@/components/theme-switch', () => ({
  ThemeSwitch: () => <div>Theme</div>,
}))
vi.mock('@/components/config-drawer', () => ({
  ConfigDrawer: () => <div>Config</div>,
}))
vi.mock('@/components/profile-dropdown', () => ({
  ProfileDropdown: () => <div>Profile</div>,
}))

describe('AdminPageShell', () => {
  it('renders the standard fixed header and page content', () => {
    render(
      <AdminPageShell>
        <div>Page content</div>
      </AdminPageShell>
    )

    expect(screen.getByRole('banner')).toHaveAttribute('data-fixed', 'true')
    expect(screen.getByRole('main')).toHaveTextContent('Page content')
    expect(screen.getByText('Search')).toBeInTheDocument()
    expect(screen.getByText('Theme')).toBeInTheDocument()
    expect(screen.getByText('Config')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('forwards page-specific header and main options', () => {
    render(
      <AdminPageShell
        headerProps={{ fixed: false, className: 'custom-header' }}
        mainProps={{ fixed: true, fluid: true, className: 'custom-main' }}
      >
        Settings
      </AdminPageShell>
    )

    expect(screen.getByRole('banner')).toHaveAttribute('data-fixed', 'false')
    expect(screen.getByRole('banner')).toHaveClass('custom-header')
    expect(screen.getByRole('main')).toHaveAttribute('data-fixed', 'true')
    expect(screen.getByRole('main')).toHaveAttribute('data-fluid', 'true')
    expect(screen.getByRole('main')).toHaveClass('custom-main')
  })

  it('supports the shared header without imposing a main layout', () => {
    render(<AdminPageHeader className='error-header' />)

    expect(screen.getByRole('banner')).toHaveClass('error-header')
    expect(screen.queryByRole('main')).not.toBeInTheDocument()
  })
})
