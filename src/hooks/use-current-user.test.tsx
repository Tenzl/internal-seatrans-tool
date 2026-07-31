// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { authService } from '@/modules/auth/services/authService'
import type { User } from '@/shared/types/dashboard'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCurrentUser } from './use-current-user'

vi.mock('@/modules/auth/services/authService', () => ({
  authService: {
    getUser: vi.fn(() => null),
    getCurrentUser: vi.fn(),
  },
}))

const user = {
  id: 8,
  email: 'shared-session@seatrans.test',
  role: 'ROLE_OPERATOR',
} as User

function SessionConsumer({ label }: { label: string }) {
  const currentUser = useCurrentUser()
  return <span>{`${label}:${currentUser?.email ?? 'loading'}`}</span>
}

describe('useCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deduplicates /auth/me across all session consumers', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue({
      success: true,
      message: 'ok',
      data: user,
    })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <SessionConsumer label='sidebar' />
        <SessionConsumer label='guard' />
        <SessionConsumer label='profile' />
      </QueryClientProvider>
    )

    expect(
      await screen.findByText('sidebar:shared-session@seatrans.test')
    ).toBeInTheDocument()
    expect(
      screen.getByText('guard:shared-session@seatrans.test')
    ).toBeInTheDocument()
    expect(authService.getCurrentUser).toHaveBeenCalledTimes(1)
  })
})
