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
        className='gap-2'
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
          className='gap-2'
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
          className='gap-2'
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
          className='gap-2'
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
        <DropdownMenuItem onClick={() => onViewDetails(record)}>
          <Eye className='mr-2 h-4 w-4' />
          View
        </DropdownMenuItem>
        {capabilities.canLock && (
          <DropdownMenuItem onClick={() => onLock(record)}>
            <Lock className='mr-2 h-4 w-4' />
            Lock edit
          </DropdownMenuItem>
        )}
        {capabilities.canUnlock && (
          <DropdownMenuItem onClick={() => onUnlock(record)}>
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
          <DropdownMenuItem onClick={() => onDelete(record, 'soft')}>
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
