import { type ReactNode } from 'react'
import type { Metadata } from 'next'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

// Next.js requires route metadata and its layout component to share this module.
// eslint-disable-next-line react-refresh/only-export-components
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
