import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/shared/config/react-query.config'

const PARTNER_CACHE_RESET_KEY = 'seatrans:partner-cache-reset'

interface PartnerCacheResetOptions {
  broadcast?: boolean
}

/**
 * Clears every Party picker page/selection without touching unrelated caches.
 * Active pickers refetch page 0; inactive pickers stay empty until reopened.
 */
export async function hardResetPartnerCaches(
  queryClient: QueryClient,
  options: PartnerCacheResetOptions = {}
): Promise<void> {
  await queryClient.cancelQueries({ queryKey: queryKeys.partners() })
  await Promise.all([
    queryClient.resetQueries({
      queryKey: queryKeys.partnerDocumentPickerPrefix(),
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.partnersListPrefix(),
    }),
  ])

  if (options.broadcast !== false && typeof window !== 'undefined') {
    window.localStorage.setItem(
      PARTNER_CACHE_RESET_KEY,
      `${Date.now()}:${Math.random()}`
    )
  }
}

/** Keeps a Booking tab synchronized when Party is changed in another tab. */
export function subscribeToPartnerCacheResets(
  queryClient: QueryClient
): () => void {
  if (typeof window === 'undefined') return () => undefined

  const onStorage = (event: StorageEvent) => {
    if (event.key !== PARTNER_CACHE_RESET_KEY || event.newValue == null) return
    void hardResetPartnerCaches(queryClient, { broadcast: false })
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}
