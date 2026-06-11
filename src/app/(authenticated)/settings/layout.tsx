'use client'

import { type ReactNode } from 'react'
import { Settings } from '@/features/settings'

export default function Layout({ children }: { children: ReactNode }) {
  return <Settings>{children}</Settings>
}
