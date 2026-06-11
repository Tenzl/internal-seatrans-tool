'use client'

import { SignUp } from '@clerk/nextjs'
import { Skeleton } from '@/components/ui/skeleton'

export default function Page() {
  return <SignUp fallback={<Skeleton className='h-120 w-100' />} />
}
