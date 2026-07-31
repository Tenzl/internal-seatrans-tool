import { AdminPageShell } from '@/components/layout/admin-page-shell'
import { PartnerManagementScreen } from '@/features/admin/sections/partner-management/PartnerManagementScreen'

/** Data Management: partners. */
export default function Page() {
  return (
    <AdminPageShell>
      <PartnerManagementScreen />
    </AdminPageShell>
  )
}
