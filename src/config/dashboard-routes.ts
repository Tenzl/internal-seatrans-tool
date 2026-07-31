export const CANONICAL_CREATE_EPDA_PATH = '/epda/create-epda'
export const LEGACY_CREATE_EPDA_PATH = '/inquiries/create-epda'
export const CANONICAL_EPDA_HISTORY_PATH = '/epda/inquiry'
export const LEGACY_EPDA_HISTORY_PATH = '/inquiries'

export function canonicalizeDashboardPath(pathname: string): string {
  if (pathname === LEGACY_CREATE_EPDA_PATH) return CANONICAL_CREATE_EPDA_PATH
  if (pathname === LEGACY_EPDA_HISTORY_PATH) return CANONICAL_EPDA_HISTORY_PATH
  return pathname
}
