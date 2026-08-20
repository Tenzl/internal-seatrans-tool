import { Edit2, MoreHorizontal, Save, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const ACTION_EDIT_CLASS =
  'gap-2 border-sky-500/40 bg-sky-500/10 text-sky-800 hover:bg-sky-500/15 hover:text-sky-900 dark:border-sky-400/35 dark:bg-sky-400/10 dark:text-sky-200 dark:hover:bg-sky-400/15 dark:hover:text-sky-100'
const ACTION_SAVE_CLASS =
  'gap-2 border-emerald-500/40 bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/15 hover:text-emerald-900 dark:border-emerald-400/35 dark:bg-emerald-400/10 dark:text-emerald-200 dark:hover:bg-emerald-400/15 dark:hover:text-emerald-100'

interface CatalogRowActionsProps {
  editing: boolean
  itemLabel: string
  loading: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
}

/** Matches the EPDA history pattern: labeled desktop actions and a mobile menu. */
export function CatalogRowActions({
  editing,
  itemLabel,
  loading,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: CatalogRowActionsProps) {
  if (editing) {
    return (
      <div className='flex justify-end gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className={ACTION_SAVE_CLASS}
          disabled={loading}
          aria-label={`Save ${itemLabel}`}
          onClick={onSave}
        >
          <Save className='h-4 w-4' />
          <span className='hidden sm:inline'>Save</span>
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='gap-2'
          disabled={loading}
          aria-label={`Cancel ${itemLabel} edit`}
          onClick={onCancel}
        >
          <X className='h-4 w-4' />
          <span className='hidden sm:inline'>Cancel</span>
        </Button>
      </div>
    )
  }

  return (
    <div className='flex justify-end'>
      <div className='hidden gap-2 sm:flex'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className={ACTION_EDIT_CLASS}
          aria-label={`Edit ${itemLabel}`}
          onClick={onEdit}
        >
          <Edit2 className='h-4 w-4' />
          Edit
        </Button>
        <Button
          type='button'
          variant='destructive'
          size='sm'
          className='gap-2'
          disabled={loading}
          aria-label={`Delete ${itemLabel}`}
          onClick={onDelete}
        >
          <Trash2 className='h-4 w-4' />
          Delete
        </Button>
      </div>

      <div className='sm:hidden'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type='button'
              variant='outline'
              size='icon'
              className='h-9 w-9 active:scale-[0.98]'
              aria-label={`${itemLabel} actions`}
            >
              <MoreHorizontal className='h-4 w-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-44'>
            <DropdownMenuItem
              onClick={onEdit}
              className='text-sky-800 focus:bg-sky-500/10 focus:text-sky-900 dark:text-sky-200'
            >
              <Edit2 className='mr-2 h-4 w-4' />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              disabled={loading}
              className='text-destructive focus:text-destructive'
            >
              <Trash2 className='mr-2 h-4 w-4' />
              Delete permanently
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
