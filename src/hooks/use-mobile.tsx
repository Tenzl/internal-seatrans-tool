import * as React from 'react'

const MOBILE_BREAKPOINT = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/** Tablet + mobile: use sheet sidebar and icon-collapsed nav below lg. */
const COMPACT_NAV_BREAKPOINT = 1024
const COMPACT_NAV_QUERY = `(max-width: ${COMPACT_NAV_BREAKPOINT - 1}px)`

function useMediaQuery(query: string) {
  return React.useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', callback)
      return () => mql.removeEventListener('change', callback)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}

export function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY)
}

export function useIsCompactNav() {
  return useMediaQuery(COMPACT_NAV_QUERY)
}
