'use client'

import { useQuery } from '@tanstack/react-query'
import { authService } from '@/modules/auth/services/authService'
import {
  AUTH_SESSION_QUERY_KEY,
  loadAuthSession,
} from '@/modules/auth/services/authSession'
import type { User } from '@/shared/types/dashboard'

/**
 * The signed-in user with a loading flag. `loading` stays true until we have
 * either a cached user (storage) or the /auth/me response — used by guards so
 * they don't deny access before the role is known.
 */
export function useAuthUser(): { user: User | null; loading: boolean } {
  const session = useQuery({
    queryKey: AUTH_SESSION_QUERY_KEY,
    queryFn: loadAuthSession,
    placeholderData: () => authService.getUser(),
    staleTime: 60_000,
    retry: false,
  })

  return {
    user: session.data ?? null,
    // A cached browser profile is only placeholder UI. Route access waits for
    // /auth/me so stale local role data can never grant a page optimistically.
    loading: session.isPending || session.isPlaceholderData,
  }
}

/** The signed-in user, loaded from storage and refreshed from /auth/me. */
export function useCurrentUser(): User | null {
  return useAuthUser().user
}

/** Display name, email, and avatar initials for the current user. */
export function userDisplay(user: User | null): {
  name: string
  email: string
  initials: string
} {
  const name =
    user?.fullName?.trim() ||
    user?.username?.trim() ||
    user?.email?.split('@')[0] ||
    'User'
  const email = user?.email ?? ''
  const initials =
    (name.match(/\b\w/g) ?? []).slice(0, 2).join('').toUpperCase() || 'U'
  return { name, email, initials }
}
