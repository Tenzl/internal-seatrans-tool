'use client'

import { useEffect, useState } from 'react'
import { authService } from '@/modules/auth/services/authService'
import type { User } from '@/shared/types/dashboard'

/**
 * The signed-in user with a loading flag. `loading` stays true until we have
 * either a cached user (storage) or the /auth/me response — used by guards so
 * they don't deny access before the role is known.
 */
export function useAuthUser(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const cached = authService.getUser()
    if (cached) {
      setUser(cached)
      setLoading(false)
    }
    void authService
      .getCurrentUser()
      .then((res) => {
        if (res.data) setUser(res.data)
      })
      .finally(() => setLoading(false))
  }, [])
  return { user, loading }
}

/** The signed-in user, loaded from storage and refreshed from /auth/me. */
export function useCurrentUser(): User | null {
  return useAuthUser().user
}

/** Display name, email, and avatar initials for the current user. */
export function userDisplay(user: User | null): { name: string; email: string; initials: string } {
  const name =
    user?.fullName?.trim() ||
    user?.username?.trim() ||
    user?.email?.split('@')[0] ||
    'User'
  const email = user?.email ?? ''
  const initials = (name.match(/\b\w/g) ?? []).slice(0, 2).join('').toUpperCase() || 'U'
  return { name, email, initials }
}
