'use client'

import { useEffect } from 'react'
import { firstAccessibleDashboardPath } from '@/config/section-catalog'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthUser } from '@/hooks/use-current-user'

/** Sends each user to their first permitted dashboard section. */
export default function RootPage() {
  const router = useRouter()
  const { user, loading } = useAuthUser()

  useEffect(() => {
    if (loading) return
    const destination = firstAccessibleDashboardPath(user)
    if (destination) router.replace(destination)
  }, [loading, router, user])

  return (
    <div className='flex min-h-svh items-center justify-center'>
      <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
    </div>
  )
}
