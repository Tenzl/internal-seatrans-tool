import { type ReactNode } from 'react'
import type { Metadata } from 'next'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

export default function Layout({ children }: { children: ReactNode }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>
}
