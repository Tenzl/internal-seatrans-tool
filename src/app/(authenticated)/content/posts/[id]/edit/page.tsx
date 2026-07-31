'use client'

import { PostEditorPage } from '@/modules/posts/components/admin/PostEditor'
import { useParams } from 'next/navigation'
import { AdminPageShell } from '@/components/layout/admin-page-shell'

/** Content Management: edit a post. */
export default function Page() {
  const params = useParams()
  const postId = params?.id ? Number(params.id) : undefined

  return (
    <AdminPageShell>
      <PostEditorPage postId={postId} />
    </AdminPageShell>
  )
}
