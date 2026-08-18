import {
  Eye,
  FileText,
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
  InquiryActionPermissions,
  InquiryHistoryRecord,
} from './inquiryHistory.types'
import { getInquiryRowCapabilities } from './inquiryHistoryRules'

/** Same semantic action tints as booking document history actions. */
const ACTION_VIEW_CLASS =
  'border-sky-500/40 bg-sky-500/10 text-sky-800 hover:bg-sky-500/15 hover:text-sky-900 dark:border-sky-400/35 dark:bg-sky-400/10 dark:text-sky-200 dark:hover:bg-sky-400/15 dark:hover:text-sky-100'
const ACTION_LOCK_CLASS =
  'border-amber-500/45 bg-amber-500/10 text-amber-900 hover:bg-amber-500/15 hover:text-amber-950 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-200 dark:hover:bg-amber-400/15 dark:hover:text-amber-100'
const ACTION_UNLOCK_CLASS =
  'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/15 hover:text-emerald-900 dark:border-emerald-400/35 dark:bg-emerald-400/10 dark:text-emerald-200 dark:hover:bg-emerald-400/15 dark:hover:text-emerald-100'

type InquiryHistoryRowActionsProps = {
  inquiry: InquiryHistoryRecord
  permissions: InquiryActionPermissions
  fallbackServiceType?: string
  onOpenDetail: (inquiry: InquiryHistoryRecord) => void
  onViewQuote: (inquiry: InquiryHistoryRecord) => void
  onDelete: (inquiry: InquiryHistoryRecord) => void
  onLock: (inquiry: InquiryHistoryRecord) => void
  onUnlock: (inquiry: InquiryHistoryRecord) => void
}

export function InquiryHistoryRowActions(props: InquiryHistoryRowActionsProps) {
  const capabilities = getInquiryRowCapabilities({
    inquiry: props.inquiry,
    ...props.permissions,
    fallbackServiceType: props.fallbackServiceType,
  })

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

type RowCapabilities = ReturnType<typeof getInquiryRowCapabilities>

function DesktopRowActions({
  inquiry,
  permissions,
  capabilities,
  onOpenDetail,
  onViewQuote,
  onDelete,
  onLock,
  onUnlock,
}: InquiryHistoryRowActionsProps & { capabilities: RowCapabilities }) {
  if (!permissions.isAdmin) {
    return (
      <div className='flex gap-2'>
        <ViewDetailsButton onClick={() => onOpenDetail(inquiry)} />
        {capabilities.canViewInvoice && (
          <Button
            variant='secondary'
            size='sm'
            onClick={() => onViewQuote(inquiry)}
            className='gap-2'
          >
            <FileText className='h-4 w-4' />
            View Invoice
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className='flex gap-2'>
      <ViewDetailsButton onClick={() => onOpenDetail(inquiry)} />
      {capabilities.canLock && (
        <Button
          variant='outline'
          size='sm'
          onClick={() => onLock(inquiry)}
          className={`gap-2 ${ACTION_LOCK_CLASS}`}
        >
          <Lock className='h-4 w-4' />
          Lock edit
        </Button>
      )}
      {capabilities.canUnlock && (
        <Button
          variant='outline'
          size='sm'
          onClick={() => onUnlock(inquiry)}
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
      {capabilities.canDelete && (
        <DeleteButton onClick={() => onDelete(inquiry)} />
      )}
    </div>
  )
}

function MobileRowActions({
  inquiry,
  permissions,
  capabilities,
  onOpenDetail,
  onViewQuote,
  onDelete,
  onLock,
  onUnlock,
}: InquiryHistoryRowActionsProps & { capabilities: RowCapabilities }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='icon'
          className='h-10 w-10 active:scale-[0.98]'
          aria-label='Row actions'
        >
          <MoreHorizontal className='h-4 w-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        <DropdownMenuItem
          onClick={() => onOpenDetail(inquiry)}
          className='text-sky-800 focus:bg-sky-500/10 focus:text-sky-900 dark:text-sky-200'
        >
          <Eye className='mr-2 h-4 w-4' />
          View Details
        </DropdownMenuItem>
        {capabilities.canLock && (
          <DropdownMenuItem
            onClick={() => onLock(inquiry)}
            className='text-amber-900 focus:bg-amber-500/10 focus:text-amber-950 dark:text-amber-200'
          >
            <Lock className='mr-2 h-4 w-4' />
            Lock edit
          </DropdownMenuItem>
        )}
        {capabilities.canUnlock && (
          <DropdownMenuItem
            onClick={() => onUnlock(inquiry)}
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
        {permissions.isAdmin && capabilities.canDelete && (
          <DropdownMenuItem
            onClick={() => onDelete(inquiry)}
            className='text-destructive focus:text-destructive'
          >
            <Trash2 className='mr-2 h-4 w-4' />
            Delete permanently
          </DropdownMenuItem>
        )}
        {capabilities.canViewInvoice && (
          <DropdownMenuItem onClick={() => onViewQuote(inquiry)}>
            <FileText className='mr-2 h-4 w-4' />
            View Invoice
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ViewDetailsButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant='outline'
      size='sm'
      onClick={onClick}
      className={`gap-2 ${ACTION_VIEW_CLASS}`}
    >
      <Eye className='h-4 w-4' />
      View Details
    </Button>
  )
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant='outline'
      size='sm'
      onClick={onClick}
      className='gap-2 text-destructive hover:text-destructive'
    >
      <Trash2 className='h-4 w-4' />
      Delete
    </Button>
  )
}
