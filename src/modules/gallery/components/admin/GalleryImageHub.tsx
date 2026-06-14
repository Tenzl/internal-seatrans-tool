'use client'

import { memo, useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Layers, Upload } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { AddImageTab } from './ImageUpload'
import { ManageImagesTab } from './ImageManagement'
import { GalleryImageFilters, GalleryManageProvider } from './galleryManageContext'

export type GalleryImageTab = 'add' | 'manage'

const TAB_MOTION = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const },
}

const MODE_OPTIONS: {
  id: GalleryImageTab
  label: string
  title: string
  description: string
  icon: typeof Upload
}[] = [
  {
    id: 'add',
    label: 'Add',
    title: 'Upload assets',
    description:
      'Choose area, port, service, and cargo in the left filters, then attach field photos on the right.',
    icon: Upload,
  },
  {
    id: 'manage',
    label: 'Manage',
    title: 'Browse library',
    description:
      'Use the same filters to narrow the table, then edit or delete images from the list.',
    icon: Layers,
  },
]

function ModeRail({
  activeTab,
  onSelect,
}: {
  activeTab: GalleryImageTab
  onSelect: (tab: GalleryImageTab) => void
}) {
  return (
    <nav
      className="flex gap-2 lg:flex-col lg:gap-1"
      aria-label="Gallery workspace mode"
    >
      {MODE_OPTIONS.map((mode) => {
        const Icon = mode.icon
        const isActive = activeTab === mode.id
        return (
          <button
            key={mode.id}
            type="button"
            onClick={() => onSelect(mode.id)}
            className={cn(
              'group flex flex-1 items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all duration-200 lg:flex-none lg:px-3.5 lg:py-3',
              'active:scale-[0.98]',
              isActive
                ? 'border-primary/25 bg-primary/[0.06] shadow-sm shadow-primary/[0.06]'
                : 'border-transparent bg-transparent hover:border-border/80 hover:bg-muted/40',
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <span
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors',
                isActive
                  ? 'border-primary/20 bg-primary/10 text-primary'
                  : 'border-border/60 bg-background text-muted-foreground group-hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 hidden sm:block lg:block">
              <span
                className={cn(
                  'block text-sm font-medium tracking-tight',
                  isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
                )}
              >
                {mode.label}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {mode.id === 'add' ? 'New uploads' : 'Library'}
              </span>
            </span>
          </button>
        )
      })}
    </nav>
  )
}

const WorkspaceAside = memo(function WorkspaceAside({
  activeTab,
  onSelectTab,
}: {
  activeTab: GalleryImageTab
  onSelectTab: (tab: GalleryImageTab) => void
}) {
  return (
    <aside className="shrink-0 border-b border-border/60 bg-muted/20 lg:w-[15.5rem] lg:border-b-0 lg:border-r">
      <div className="px-4 py-4 lg:px-5 lg:py-6">
        <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground lg:mb-4">
          Workspace
        </p>
        <ModeRail activeTab={activeTab} onSelect={onSelectTab} />
        <GalleryImageFilters layout="sidebar" mode={activeTab} className="!mt-5 !border-t-0 !pt-0" />
      </div>
    </aside>
  )
})

function GalleryHubContent({
  activeTab,
  activeMode,
  onSelectTab,
}: {
  activeTab: GalleryImageTab
  activeMode: (typeof MODE_OPTIONS)[number]
  onSelectTab: (tab: GalleryImageTab) => void
}) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
      <WorkspaceAside activeTab={activeTab} onSelectTab={onSelectTab} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background/80">
        <header className="border-b border-border/60 px-4 py-4 md:px-7 md:py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <p className="min-w-0 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {activeMode.description}
            </p>
            <div
              className={cn(
                'inline-flex items-center gap-2 self-start rounded-full border px-3 py-1 text-xs font-medium',
                activeTab === 'add'
                  ? 'border-primary/20 bg-primary/[0.06] text-primary'
                  : 'border-border/80 bg-muted/50 text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  activeTab === 'add' ? 'animate-pulse bg-primary' : 'bg-muted-foreground/50',
                )}
              />
              {activeTab === 'add' ? 'Upload mode' : 'Library mode'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5 md:px-7 md:py-6">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} {...TAB_MOTION}>
              {activeTab === 'add' ? (
                <AddImageTab embedded onUploadSuccess={() => onSelectTab('manage')} />
              ) : (
                <ManageImagesTab embedded hideFilters />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export function GalleryImageHub() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const tabParam = searchParams.get('tab')
  const activeTab: GalleryImageTab = tabParam === 'manage' ? 'manage' : 'add'
  const activeMode = MODE_OPTIONS.find((m) => m.id === activeTab) ?? MODE_OPTIONS[0]

  const setTab = useCallback(
    (tab: GalleryImageTab) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', tab)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  return (
    <div className="relative flex min-h-0 flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 maritime-grid-subtle opacity-[0.35]"
        aria-hidden
      />

      <GalleryManageProvider>
        <div className="relative flex min-h-0 flex-1 flex-col">
          <GalleryHubContent
            activeTab={activeTab}
            activeMode={activeMode}
            onSelectTab={setTab}
          />
        </div>
      </GalleryManageProvider>
    </div>
  )
}
