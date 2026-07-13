'use client'

import { Suspense, useState, useSyncExternalStore, type ReactNode } from 'react'
import { AxiosError } from 'axios'
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { handleServerError } from '@/lib/handle-server-error'
import { DirectionProvider } from '@/context/direction-provider'
import { FontProvider } from '@/context/font-provider'
import { ThemeProvider } from '@/context/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { NavigationProgress } from '@/components/navigation-progress'
import { I18nProvider } from '@/shared/i18n/I18nProvider'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          if (failureCount >= 0 && process.env.NODE_ENV === 'development')
            return false
          if (failureCount > 3 && process.env.NODE_ENV === 'production')
            return false
          return !(
            error instanceof AxiosError &&
            [401, 403].includes(error.response?.status ?? 0)
          )
        },
        refetchOnWindowFocus: process.env.NODE_ENV === 'production',
        staleTime: 10 * 1000, // 10s
      },
      mutations: {
        onError: (error) => {
          handleServerError(error)
          if (error instanceof AxiosError) {
            if (error.response?.status === 304) {
              toast.error('Content not modified!')
            }
          }
        },
      },
    },
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof AxiosError) {
          if (error.response?.status === 401) {
            toast.error('Session expired!')
            useAuthStore.getState().auth.reset()
            if (typeof window !== 'undefined') {
              const redirect = window.location.href
              window.location.href = `/sign-in?redirect=${encodeURIComponent(redirect)}`
            }
          }
          if (error.response?.status === 500) {
            toast.error('Internal Server Error!')
          }
        }
      },
    }),
  })
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)

  // The shadcn-admin template reads cookies / `window` during render
  // (theme, font, direction, sidebar state). Gate the tree behind a
  // client mount so the server never executes that browser-only code.
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  )
  if (!mounted) return null

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FontProvider>
          <DirectionProvider>
            <I18nProvider>
              <NavigationProgress />
              <Suspense fallback={null}>{children}</Suspense>
              <Toaster duration={5000} />
            </I18nProvider>
          </DirectionProvider>
        </FontProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
