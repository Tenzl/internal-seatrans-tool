'use client'

import { type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { Link } from '@/lib/router'
import { useAuthUser } from '@/hooks/use-current-user'
import { canAccessRoute } from '@/config/nav-roles'

/**
 * Real route-level role gate. Blocks pages whose path is restricted in
 * src/config/nav-roles.ts (ROUTE_ROLE_ACCESS) for users without the role —
 * even when reached by typing the URL directly. Open routes render instantly.
 */
export function RouteRoleGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { user, loading } = useAuthUser()

  // Allowed (or an unrestricted route) → render immediately.
  if (canAccessRoute(pathname, user?.role)) {
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
