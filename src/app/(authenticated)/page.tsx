'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { firstAccessibleDashboardPath } from '@/config/section-catalog'
import { Loader2, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthUser } from '@/hooks/use-current-user'
import { Button } from '@/components/ui/button'

/** Sends signed-in users to their first permitted module; otherwise stays on home. */
export default function RootPage() {
  const router = useRouter()
  const { user, loading } = useAuthUser()

  useEffect(() => {
    if (loading || !user) return
    const destination = firstAccessibleDashboardPath(user)
    if (destination) router.replace(destination)
  }, [loading, router, user])

  if (loading) {
    return (
      <div className='flex min-h-svh items-center justify-center'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    )
  }

  if (!user) {
    return (
      <div className='flex min-h-svh items-center justify-center'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    )
  }

  return (
    <div className='flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center'>
      <h1 className='text-2xl font-semibold tracking-tight'>
        Welcome to Seatrans Admin
      </h1>
      <p className='max-w-md text-sm text-muted-foreground'>
        Choose a module from the sidebar to get started. If you need access to
        operational tools, contact your administrator.
      </p>
      <Button asChild variant='outline' size='sm'>
        <Link href='/settings'>
          <Settings className='mr-2 h-4 w-4' />
          Account settings
        </Link>
      </Button>
    </div>
  )
}
