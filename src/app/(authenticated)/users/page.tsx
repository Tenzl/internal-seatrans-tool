import { AdminPageShell } from '@/components/layout/admin-page-shell'
import { UserManagementScreen } from '@/features/admin/sections/user-management/UserManagementScreen'

/** Data Management: user accounts. */
export default function Page() {
  return (
    <AdminPageShell>
      <UserManagementScreen />
    </AdminPageShell>
  )
}
