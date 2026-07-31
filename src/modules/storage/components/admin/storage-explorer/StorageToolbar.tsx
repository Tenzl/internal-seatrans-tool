import { prefixSegments } from '@/modules/storage/utils/storageUtils'
import {
  AdminToolbar,
  AdminToolbarGroup,
} from '@/shared/components/layout/dashboard/admin'
import { ChevronRight, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export function StorageToolbar({
  currentPrefix,
  refreshing,
  onPrefixChange,
  onRefresh,
}: {
  currentPrefix: string
  refreshing: boolean
  onPrefixChange: (prefix: string) => void
  onRefresh: () => void
}) {
  const breadcrumbs = prefixSegments(currentPrefix)

  return (
    <AdminToolbar>
      <AdminToolbarGroup className='min-w-0 flex-1'>
        <nav
          aria-label='Storage path'
          className='flex min-w-0 flex-wrap items-center gap-1 text-sm'
        >
          {breadcrumbs.map((segment, index) => (
            <span key={segment.prefix} className='flex items-center gap-1'>
              {index > 0 ? (
                <ChevronRight className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
              ) : null}
              <button
                type='button'
                onClick={() => onPrefixChange(segment.prefix)}
                className={cn(
                  'truncate rounded px-1.5 py-0.5 transition-colors hover:bg-muted',
                  index === breadcrumbs.length - 1
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {segment.label}
              </button>
            </span>
          ))}
        </nav>
      </AdminToolbarGroup>
      <AdminToolbarGroup>
        <Button
          variant='ghost'
          size='icon'
          onClick={onRefresh}
          disabled={refreshing}
          aria-label='Refresh'
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
        </Button>
      </AdminToolbarGroup>
    </AdminToolbar>
  )
}
