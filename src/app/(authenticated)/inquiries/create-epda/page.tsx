import { permanentRedirect } from 'next/navigation'
import {
  LEGACY_CREATE_EPDA_PATH,
  canonicalizeDashboardPath,
} from '@/config/dashboard-routes'

/** Permanent compatibility entry for the pre-EPDA navigation URL. */
export default function Page() {
  permanentRedirect(canonicalizeDashboardPath(LEGACY_CREATE_EPDA_PATH))
}
