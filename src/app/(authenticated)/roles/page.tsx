import { AdminPageShell } from '@/components/layout/admin-page-shell'
import { RoleManagementScreen } from '@/features/admin/sections/role-management/RoleManagementScreen'

/** Data Management → Roles: create roles and grant per-page (section) access. */
export default function Page() {
  return (
    <AdminPageShell>
      <RoleManagementScreen />
    </AdminPageShell>
  )
}
