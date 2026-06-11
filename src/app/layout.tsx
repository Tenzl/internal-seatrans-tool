import '../styles/index.css'
import { type ReactNode } from 'react'
import { type Metadata } from 'next'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Seatrans Admin',
  description: 'Seatrans internal admin dashboard',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body className='group/body'>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
