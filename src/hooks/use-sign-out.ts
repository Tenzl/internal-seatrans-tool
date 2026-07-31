'use client'

import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { terminateAuthSession } from '@/modules/auth/services/authSession'
import { useLocation, useNavigate } from '@/lib/router'

/** Owns the logout side effects; the dialog remains presentation-only. */
export function useSignOut() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const signOut = useCallback(async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    const currentPath = location.href

    try {
      await terminateAuthSession(queryClient)
    } finally {
      navigate({
        to: '/sign-in',
        search: { redirect: currentPath },
        replace: true,
      })
    }
  }, [isSigningOut, location.href, navigate, queryClient])

  return { isSigningOut, signOut }
}
