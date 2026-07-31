import {
  LEGACY_CREATE_EPDA_PATH,
  canonicalizeDashboardPath,
} from '@/config/dashboard-routes'
import { permanentRedirect } from 'next/navigation'

/** Permanent compatibility entry for the pre-EPDA navigation URL. */
export default function Page() {
  permanentRedirect(canonicalizeDashboardPath(LEGACY_CREATE_EPDA_PATH))
}
