'use client'

import { type ReactNode } from 'react'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export default function Layout({ children }: { children: ReactNode }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>
}
