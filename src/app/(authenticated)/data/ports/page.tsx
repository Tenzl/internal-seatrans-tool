import { AdminPageShell } from '@/components/layout/admin-page-shell'
import { PortManagementScreen } from '@/features/admin/sections/port-management/PortManagementScreen'

/** Data Management: ports. */
export default function Page() {
  return (
    <AdminPageShell>
      <PortManagementScreen />
    </AdminPageShell>
  )
}
