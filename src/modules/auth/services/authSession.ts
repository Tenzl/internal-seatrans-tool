import type { QueryClient } from '@tanstack/react-query'
import type { User } from '@/shared/types/dashboard'
import { authService } from './authService'

export const AUTH_SESSION_QUERY_KEY = ['auth', 'session'] as const

export async function loadAuthSession(): Promise<User | null> {
  const response = await authService.getCurrentUser()
  return response.success ? response.data : null
}

export function cacheAuthSession(queryClient: QueryClient, user: User): void {
  queryClient.setQueryData(AUTH_SESSION_QUERY_KEY, user)
}

export async function terminateAuthSession(
  queryClient: QueryClient
): Promise<void> {
  try {
    await authService.logout()
  } finally {
    // Admin responses can contain sensitive operational data. Never retain any
    // query cache after the session is terminated or a logout request fails.
    queryClient.clear()
  }
}
