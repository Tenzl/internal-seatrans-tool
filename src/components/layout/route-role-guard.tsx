'use client'

import { type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Link } from '@/lib/router'
import { useAuthUser } from '@/hooks/use-current-user'
import { canAccessPath } from '@/config/section-catalog'

/**
 * Real route-level access gate. Blocks pages whose section the user's role was
 * not granted — even when reached by typing the URL directly. Admins and
 * unmapped routes render instantly. The backend enforces the same per section,
 * so this is the UX layer on top.
 */
export function RouteRoleGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, loading } = useAuthUser()

  // Allowed (admin, granted, or an unmapped route) → render immediately.
  if (canAccessPath(pathname, user)) {
    return <>{children}</>
  }

  // Restricted route, role not yet known → wait instead of flashing "denied".
  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Restricted route, role known and not permitted → block.
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 p-8 text-center">
      <h2 className="text-2xl font-bold tracking-tight">Access denied</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        You don&apos;t have permission to view this page.
      </p>
      <Link to="/" className="text-sm font-medium text-primary hover:underline">
        Return to home
      </Link>
    </div>
  )
}
