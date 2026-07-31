import { GalleryImageHub } from '@/modules/gallery/components/admin/GalleryImageHub'
import { AdminPageShell } from '@/components/layout/admin-page-shell'

/** Data Management: gallery images. */
export default function Page() {
  return (
    <AdminPageShell>
      <GalleryImageHub />
    </AdminPageShell>
  )
}
