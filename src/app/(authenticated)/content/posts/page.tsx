import { ManagePosts } from '@/modules/posts/components/admin/PostManagement'
import { AdminPageShell } from '@/components/layout/admin-page-shell'

/** Content Management: posts. */
export default function Page() {
  return (
    <AdminPageShell>
      <ManagePosts />
    </AdminPageShell>
  )
}
