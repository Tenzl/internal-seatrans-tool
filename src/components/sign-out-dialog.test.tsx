// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSignOut } from '@/hooks/use-sign-out'
import { SignOutDialog } from './sign-out-dialog'

vi.mock('@/hooks/use-sign-out', () => ({
  useSignOut: vi.fn(),
}))

describe('SignOutDialog', () => {
  const signOut = vi.fn()

  beforeEach(() => {
    vi.mocked(useSignOut).mockReturnValue({
      isSigningOut: false,
      signOut,
    })
  })

  it('terminates the real session when the user confirms', async () => {
    const user = userEvent.setup()
    render(<SignOutDialog open onOpenChange={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(signOut).toHaveBeenCalledTimes(1)
  })

  it('prevents duplicate confirmation while logout is in progress', () => {
    vi.mocked(useSignOut).mockReturnValue({
      isSigningOut: true,
      signOut,
    })

    render(<SignOutDialog open onOpenChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Sign out' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })
})
