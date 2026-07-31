import { AdminPageShell } from '@/components/layout/admin-page-shell'
import { OfficeManagementScreen } from '@/features/admin/sections/office-management/OfficeManagementScreen'

/** Data Management → Offices (ported from the legacy admin dashboard). */
export default function Page() {
  return (
    <AdminPageShell>
      <OfficeManagementScreen />
    </AdminPageShell>
  )
}
