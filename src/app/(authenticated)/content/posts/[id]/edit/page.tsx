'use client'

import { useParams } from 'next/navigation'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { PostEditorPage } from '@/modules/posts/components/admin/PostEditor'

/** Content Management → Posts → Edit (ported from the legacy admin dashboard). */
export default function Page() {
  const params = useParams()
  const postId = params?.id ? Number(params.id) : undefined

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main>
        <PostEditorPage postId={postId} />
      </Main>
    </>
  )
}
