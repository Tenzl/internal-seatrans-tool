import { StorageFolderTree } from '@/modules/storage/components/admin/StorageFolderTree'
import type { StorageObject } from '@/modules/storage/types/storage.types'
import {
  formatBytes,
  formatStorageDate,
  iconForStorageObject,
} from '@/modules/storage/utils/storageUtils'
import { AdminDataPanel } from '@/shared/components/layout/dashboard/admin'
import { Download, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type StorageBrowserProps = {
  currentPrefix: string
  items: StorageObject[]
  loading: boolean
  error: Error | null
  downloading: boolean
  onPrefixChange: (prefix: string) => void
  onOpenFolder: (object: StorageObject) => void
  onDownload: (key: string) => void
  onRename: (object: StorageObject) => void
  onDelete: (object: StorageObject) => void
  onRetry: () => void
}

export function StorageBrowser({
  currentPrefix,
  items,
  loading,
  error,
  downloading,
  onPrefixChange,
  onOpenFolder,
  onDownload,
  onRename,
  onDelete,
  onRetry,
}: StorageBrowserProps) {
  return (
    <div className='grid min-h-[28rem] flex-1 gap-4 lg:grid-cols-[240px_1fr]'>
      <aside className='hidden rounded-xl border bg-card/50 p-3 lg:block'>
        <p className='mb-2 px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
          Folders
        </p>
        <StorageFolderTree
          currentPrefix={currentPrefix}
          onSelectPrefix={onPrefixChange}
        />
      </aside>

      <AdminDataPanel
        loading={loading}
        empty={!loading && !error && items.length === 0}
        emptyMessage='This folder is empty. Upload files or create a subfolder to get started.'
        meta={
          !loading && !error
            ? `${items.length} item${items.length === 1 ? '' : 's'}`
            : undefined
        }
      >
        {error ? (
          <div className='admin-data-empty'>
            <p className='text-sm font-medium text-destructive'>
              Could not load storage
            </p>
            <p className='max-w-md text-sm text-pretty text-muted-foreground'>
              {error.message ||
                'The storage API is not available yet. Connect the R2 backend to enable this page.'}
            </p>
            <Button
              variant='outline'
              size='sm'
              className='mt-2'
              onClick={onRetry}
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className='overflow-hidden rounded-xl border'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='border-b bg-muted/40 text-left text-xs text-muted-foreground'>
                  <th className='px-4 py-2.5 font-medium'>Name</th>
                  <th className='hidden px-4 py-2.5 font-medium sm:table-cell'>
                    Size
                  </th>
                  <th className='hidden px-4 py-2.5 font-medium md:table-cell'>
                    Modified
                  </th>
                  <th className='w-12 px-2 py-2.5' />
                </tr>
              </thead>
              <tbody>
                {items.map((object) => {
                  const Icon = iconForStorageObject(object)
                  return (
                    <tr
                      key={object.key}
                      className='group border-b transition-colors last:border-0 hover:bg-muted/30'
                    >
                      <td className='px-4 py-2.5'>
                        <button
                          type='button'
                          className='flex max-w-full items-center gap-2.5 text-left'
                          onClick={() =>
                            object.type === 'folder'
                              ? onOpenFolder(object)
                              : onDownload(object.key)
                          }
                          onDoubleClick={() =>
                            object.type === 'folder' && onOpenFolder(object)
                          }
                        >
                          <Icon
                            className={cn(
                              'h-4 w-4 shrink-0',
                              object.type === 'folder'
                                ? 'text-amber-500'
                                : 'text-muted-foreground'
                            )}
                          />
                          <span className='truncate font-medium'>
                            {object.name}
                          </span>
                        </button>
                      </td>
                      <td className='hidden px-4 py-2.5 text-muted-foreground sm:table-cell'>
                        {object.type === 'folder'
                          ? '—'
                          : formatBytes(object.size)}
                      </td>
                      <td className='hidden px-4 py-2.5 text-muted-foreground md:table-cell'>
                        {formatStorageDate(object.lastModified)}
                      </td>
                      <td className='px-2 py-2.5'>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100'
                              aria-label={`Actions for ${object.name}`}
                            >
                              <MoreHorizontal className='h-4 w-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            {object.type === 'folder' ? (
                              <DropdownMenuItem
                                onClick={() => onOpenFolder(object)}
                              >
                                Open
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => onDownload(object.key)}
                                disabled={downloading}
                              >
                                <Download className='me-2 h-4 w-4' />
                                Download
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => onRename(object)}>
                              <Pencil className='me-2 h-4 w-4' />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className='text-destructive focus:text-destructive'
                              onClick={() => onDelete(object)}
                            >
                              <Trash2 className='me-2 h-4 w-4' />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminDataPanel>
    </div>
  )
}
