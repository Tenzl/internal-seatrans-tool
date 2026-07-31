'use client'

import { type ReactNode } from 'react'
import { canAccessAuthenticatedPath } from '@/config/section-catalog'
import { Loader2 } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useAuthUser } from '@/hooks/use-current-user'
import { useSignOut } from '@/hooks/use-sign-out'
import { Button } from '@/components/ui/button'

/**
 * UX authorization gate for direct navigation. The API remains the final
 * authority for every protected operation.
 */
export function RouteRoleGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, loading } = useAuthUser()
  const { isSigningOut, signOut } = useSignOut()

  if (canAccessAuthenticatedPath(pathname, user)) {
    return <>{children}</>
  }

  // Wait for the verified server session to avoid flashing "Access denied".
  if (loading) {
    return (
      <div className='flex min-h-svh items-center justify-center'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    )
  }

  return (
    <div className='flex min-h-svh flex-col items-center justify-center gap-3 p-8 text-center'>
      <h2 className='text-2xl font-bold tracking-tight'>Access denied</h2>
      <p className='max-w-md text-sm text-muted-foreground'>
        You don&apos;t have permission to view this page.
      </p>
      <Button
        variant='link'
        className='text-sm font-medium text-primary'
        disabled={isSigningOut}
        onClick={() => void signOut()}
      >
        Logout
      </Button>
    </div>
  )
}
