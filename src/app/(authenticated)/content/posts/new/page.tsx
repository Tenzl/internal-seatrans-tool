import { PostEditorPage } from '@/modules/posts/components/admin/PostEditor'
import { AdminPageShell } from '@/components/layout/admin-page-shell'

/** Content Management: create a post. */
export default function Page() {
  return (
    <AdminPageShell>
      <PostEditorPage postId={undefined} />
    </AdminPageShell>
  )
}
