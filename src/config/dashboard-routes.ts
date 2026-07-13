export const CANONICAL_CREATE_EPDA_PATH = '/epda/create-epda'
export const LEGACY_CREATE_EPDA_PATH = '/inquiries/create-epda'

export function canonicalizeDashboardPath(pathname: string): string {
  return pathname === LEGACY_CREATE_EPDA_PATH
    ? CANONICAL_CREATE_EPDA_PATH
    : pathname
}
