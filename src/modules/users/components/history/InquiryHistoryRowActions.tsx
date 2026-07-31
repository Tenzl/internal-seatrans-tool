import {
  Archive,
  FileText,
  Lock,
  MoreHorizontal,
  RotateCcw,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { InquiryDeleteMode } from './InquiryDataTable'
import type {
  InquiryActionPermissions,
  InquiryHistoryRecord,
} from './inquiryHistory.types'
import { getInquiryRowCapabilities } from './inquiryHistoryRules'

type InquiryHistoryRowActionsProps = {
  inquiry: InquiryHistoryRecord
  permissions: InquiryActionPermissions
  fallbackServiceType?: string
  onOpenDetail: (inquiry: InquiryHistoryRecord) => void
  onViewQuote: (inquiry: InquiryHistoryRecord) => void
  onDelete: (inquiry: InquiryHistoryRecord, mode: InquiryDeleteMode) => void
  onRestore: (inquiry: InquiryHistoryRecord) => void
  onLock: (inquiry: InquiryHistoryRecord) => void
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
  onRestore,
  onLock,
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
          className='gap-2'
        >
          <Lock className='h-4 w-4' />
          Lock edit
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
          variant='outline'
          size='sm'
          onClick={() => onDelete(inquiry, 'soft')}
          className='gap-2'
        >
          <Archive className='h-4 w-4' />
          Archive
        </Button>
      )}
      {capabilities.canDelete &&
        (capabilities.canRestore ? (
          <>
            <Button
              variant='outline'
              size='sm'
              onClick={() => onRestore(inquiry)}
              className='gap-2'
            >
              <RotateCcw className='h-4 w-4' />
              Restore
            </Button>
            <DeleteButton onClick={() => onDelete(inquiry, 'hard')} />
          </>
        ) : (
          <DeleteButton onClick={() => onDelete(inquiry, 'hard')} />
        ))}
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
  onRestore,
  onLock,
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
        <DropdownMenuItem onClick={() => onOpenDetail(inquiry)}>
          View Details
        </DropdownMenuItem>
        {capabilities.canLock && (
          <DropdownMenuItem onClick={() => onLock(inquiry)}>
            <Lock className='mr-2 h-4 w-4' />
            Lock edit
          </DropdownMenuItem>
        )}
        {capabilities.showLocked && (
          <DropdownMenuItem disabled>
            <Lock className='mr-2 h-4 w-4' />
            Locked
          </DropdownMenuItem>
        )}
        {capabilities.canArchive && (
          <DropdownMenuItem onClick={() => onDelete(inquiry, 'soft')}>
            <Archive className='mr-2 h-4 w-4' />
            Archive
          </DropdownMenuItem>
        )}
        {permissions.isAdmin &&
          capabilities.canDelete &&
          !capabilities.canRestore && (
            <DropdownMenuItem
              onClick={() => onDelete(inquiry, 'hard')}
              className='text-destructive focus:text-destructive'
            >
              <Trash2 className='mr-2 h-4 w-4' />
              Delete
            </DropdownMenuItem>
          )}
        {capabilities.canRestore && (
          <>
            <DropdownMenuItem onClick={() => onRestore(inquiry)}>
              <RotateCcw className='mr-2 h-4 w-4' />
              Restore
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(inquiry, 'hard')}
              className='text-destructive focus:text-destructive'
            >
              <Trash2 className='mr-2 h-4 w-4' />
              Delete permanently
            </DropdownMenuItem>
          </>
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
    <Button variant='outline' size='sm' onClick={onClick} className='gap-2'>
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
