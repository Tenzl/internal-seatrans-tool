import { ManageCategories } from '@/modules/categories/components/admin/CategoryManagement'
import { AdminPageShell } from '@/components/layout/admin-page-shell'

/** Content Management: post categories. */
export default function Page() {
  return (
    <AdminPageShell>
      <ManageCategories />
    </AdminPageShell>
  )
}
