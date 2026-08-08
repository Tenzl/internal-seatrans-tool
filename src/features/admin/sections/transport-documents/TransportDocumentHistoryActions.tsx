import {
  Archive,
  Eye,
  Lock,
  MoreHorizontal,
  Trash2,
  Unlock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type {
  TransportDocumentActionPermissions,
  TransportDocumentDeleteMode,
  TransportDocumentRecord,
} from './transportDocument.types'
import { getTransportDocumentRowCapabilities } from './transportDocumentHistoryRules'

/** Semantic action tints — muted character, distinct hue roles (info / warning / archive). */
const ACTION_VIEW_CLASS =
  'border-sky-500/40 bg-sky-500/10 text-sky-800 hover:bg-sky-500/15 hover:text-sky-900 dark:border-sky-400/35 dark:bg-sky-400/10 dark:text-sky-200 dark:hover:bg-sky-400/15 dark:hover:text-sky-100'
const ACTION_LOCK_CLASS =
  'border-amber-500/45 bg-amber-500/10 text-amber-900 hover:bg-amber-500/15 hover:text-amber-950 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200 dark:hover:bg-amber-400/15 dark:hover:text-amber-100'
const ACTION_ARCHIVE_CLASS =
  'border-rose-500/40 bg-rose-500/10 text-rose-800 hover:bg-rose-500/15 hover:text-rose-900 dark:border-rose-400/35 dark:bg-rose-400/10 dark:text-rose-200 dark:hover:bg-rose-400/15 dark:hover:text-rose-100'
const ACTION_UNLOCK_CLASS =
  'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/15 hover:text-emerald-900 dark:border-emerald-400/35 dark:bg-emerald-400/10 dark:text-emerald-200 dark:hover:bg-emerald-400/15 dark:hover:text-emerald-100'

interface TransportDocumentHistoryActionsProps {
  record: TransportDocumentRecord
  permissions: TransportDocumentActionPermissions
  onViewDetails: (record: TransportDocumentRecord) => void
  onLock: (record: TransportDocumentRecord) => void
  onUnlock: (record: TransportDocumentRecord) => void
  onDelete: (
    record: TransportDocumentRecord,
    mode: TransportDocumentDeleteMode
  ) => void
}

/** Row actions matching EPDA InquiryHistoryRowActions interaction pattern. */
export function TransportDocumentHistoryActions(
  props: TransportDocumentHistoryActionsProps
) {
  const capabilities = getTransportDocumentRowCapabilities(
    props.record,
    props.permissions
  )

  return (
    <div className='flex justify-end'>
      <div className='hidden md:block'>
        <DesktopRowActions {...props} capabilities={capabilities} />
      </div>
      <div className='md:hidden'>
        <MobileRowActions {...props} capabilities={capabilities} />
      </div>
    </div>
  )
}

type RowCapabilities = ReturnType<typeof getTransportDocumentRowCapabilities>

function DesktopRowActions({
  record,
  capabilities,
  onViewDetails,
  onLock,
  onUnlock,
  onDelete,
}: TransportDocumentHistoryActionsProps & { capabilities: RowCapabilities }) {
  return (
    <div className='flex gap-2'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={() => onViewDetails(record)}
        className={`gap-2 ${ACTION_VIEW_CLASS}`}
      >
        <Eye className='h-4 w-4' />
        View
      </Button>
      {capabilities.canLock && (
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => onLock(record)}
          className={`gap-2 ${ACTION_LOCK_CLASS}`}
        >
          <Lock className='h-4 w-4' />
          Lock edit
        </Button>
      )}
      {capabilities.canUnlock && (
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => onUnlock(record)}
          className={`gap-2 ${ACTION_UNLOCK_CLASS}`}
        >
          <Unlock className='h-4 w-4' />
          Unlock edit
        </Button>
      )}
      {capabilities.showLocked && (
        <Badge
          variant='outline'
          className='h-8 gap-1 border-amber-500/40 bg-amber-500/10 px-2 text-amber-800 dark:text-amber-200'
        >
          <Lock className='h-3.5 w-3.5' />
          Locked
        </Badge>
      )}
      {capabilities.canArchive && (
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => onDelete(record, 'soft')}
          className={`gap-2 ${ACTION_ARCHIVE_CLASS}`}
        >
          <Archive className='h-4 w-4' />
          Archive
        </Button>
      )}
      {capabilities.canDelete && (
        <Button
          type='button'
          variant='destructive'
          size='sm'
          onClick={() => onDelete(record, 'hard')}
          className='gap-2'
        >
          <Trash2 className='h-4 w-4' />
          Delete
        </Button>
      )}
    </div>
  )
}

function MobileRowActions({
  record,
  capabilities,
  onViewDetails,
  onLock,
  onUnlock,
  onDelete,
}: TransportDocumentHistoryActionsProps & { capabilities: RowCapabilities }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type='button'
          variant='outline'
          size='icon'
          className='h-10 w-10 active:scale-[0.98]'
          aria-label='Document actions'
        >
          <MoreHorizontal className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        <DropdownMenuItem
          onClick={() => onViewDetails(record)}
          className='text-sky-800 focus:bg-sky-500/10 focus:text-sky-900 dark:text-sky-200'
        >
          <Eye className='mr-2 h-4 w-4' />
          View
        </DropdownMenuItem>
        {capabilities.canLock && (
          <DropdownMenuItem
            onClick={() => onLock(record)}
            className='text-amber-900 focus:bg-amber-500/10 focus:text-amber-950 dark:text-amber-200'
          >
            <Lock className='mr-2 h-4 w-4' />
            Lock edit
          </DropdownMenuItem>
        )}
        {capabilities.canUnlock && (
          <DropdownMenuItem
            onClick={() => onUnlock(record)}
            className='text-emerald-800 focus:bg-emerald-500/10 focus:text-emerald-900 dark:text-emerald-200'
          >
            <Unlock className='mr-2 h-4 w-4' />
            Unlock edit
          </DropdownMenuItem>
        )}
        {capabilities.showLocked && (
          <DropdownMenuItem disabled>
            <Lock className='mr-2 h-4 w-4' />
            Locked
          </DropdownMenuItem>
        )}
        {capabilities.canArchive && (
          <DropdownMenuItem
            onClick={() => onDelete(record, 'soft')}
            className='text-rose-800 focus:bg-rose-500/10 focus:text-rose-900 dark:text-rose-200'
          >
            <Archive className='mr-2 h-4 w-4' />
            Archive
          </DropdownMenuItem>
        )}
        {capabilities.canDelete && (
          <DropdownMenuItem
            className='text-destructive focus:text-destructive'
            onClick={() => onDelete(record, 'hard')}
          >
            <Trash2 className='mr-2 h-4 w-4' />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
