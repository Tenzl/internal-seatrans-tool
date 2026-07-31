import { ManageCommodities } from '@/modules/gallery/components/admin/CommodityManagement'
import { AdminPageShell } from '@/components/layout/admin-page-shell'

/** Data Management: cargo definitions. */
export default function Page() {
  return (
    <AdminPageShell>
      <ManageCommodities />
    </AdminPageShell>
  )
}
