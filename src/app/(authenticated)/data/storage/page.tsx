import { StorageExplorer } from '@/modules/storage/components/admin/StorageExplorer'
import { AdminPageShell } from '@/components/layout/admin-page-shell'

/** Data Management → Object storage browser (Cloudflare R2). */
export default function Page() {
  return (
    <AdminPageShell>
      <StorageExplorer />
    </AdminPageShell>
  )
}
