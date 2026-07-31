import { AdminPageShell } from '@/components/layout/admin-page-shell'
import { EpdaEditorScreen } from '@/features/admin/sections/epda-editor/EpdaEditorScreen'

/** Creates an EPDA with the shared editor workflow. */
export default function Page() {
  return (
    <AdminPageShell>
      <EpdaEditorScreen />
    </AdminPageShell>
  )
}
