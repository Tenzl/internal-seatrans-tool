'use client'

import { SignIn } from '@clerk/nextjs'
import { Skeleton } from '@/components/ui/skeleton'

export default function Page() {
  return (
    <SignIn
      initialValues={{
        emailAddress: 'your_mail+shadcn_admin@gmail.com',
      }}
      fallback={<Skeleton className='h-120 w-100' />}
    />
  )
}
