import { QueryClient } from '@tanstack/react-query'
import type { User } from '@/shared/types/dashboard'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from './authService'
import {
  AUTH_SESSION_QUERY_KEY,
  cacheAuthSession,
  loadAuthSession,
  terminateAuthSession,
} from './authSession'

vi.mock('./authService', () => ({
  authService: {
    getCurrentUser: vi.fn(),
    logout: vi.fn(),
  },
}))

const user = {
  id: 7,
  email: 'operator@seatrans.test',
  role: 'ROLE_OPERATOR',
  sections: ['epda-create'],
} as User

describe('auth session coordinator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads the authenticated user into the shared session shape', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue({
      success: true,
      message: 'ok',
      data: user,
    })

    await expect(loadAuthSession()).resolves.toEqual(user)
  })

  it('returns null when the backend reports no active session', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue({
      success: false,
      message: 'Unauthorized',
      data: null,
    })

    await expect(loadAuthSession()).resolves.toBeNull()
  })

  it('uses one query-cache entry and clears all sensitive cache on logout', async () => {
    const queryClient = new QueryClient()
    cacheAuthSession(queryClient, user)
    queryClient.setQueryData(['inquiries'], [{ id: 1 }])

    expect(queryClient.getQueryData(AUTH_SESSION_QUERY_KEY)).toEqual(user)

    await terminateAuthSession(queryClient)

    expect(authService.logout).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  it('clears cached data even when backend logout fails', async () => {
    const queryClient = new QueryClient()
    cacheAuthSession(queryClient, user)
    vi.mocked(authService.logout).mockRejectedValue(new Error('offline'))

    await expect(terminateAuthSession(queryClient)).rejects.toThrow('offline')
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })
})
