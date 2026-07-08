'use client'

import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronRight,
  Download,
  FolderPlus,
  Loader2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react'
import { StorageFileDropzone } from '@/components/ui/file-upload'
import {
  AdminDataPanel,
  AdminSection,
  AdminToolbar,
  AdminToolbarGroup,
} from '@/shared/components/layout/dashboard/admin'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { queryKeys } from '@/shared/config/react-query.config'
import { cn } from '@/shared/lib/utils'
import { toast } from '@/shared/utils/toast'
import { storageService } from '@/modules/storage/services/storageService'
import type { StorageObject } from '@/modules/storage/types/storage.types'
import {
  formatBytes,
  formatStorageDate,
  iconForStorageObject,
  parentPrefixOf,
  prefixSegments,
} from '@/modules/storage/utils/storageUtils'
import { StorageFolderTree } from './StorageFolderTree'

export function StorageExplorer() {
  const queryClient = useQueryClient()
  const [currentPrefix, setCurrentPrefix] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [folderOpen, setFolderOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<StorageObject | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StorageObject | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [folderName, setFolderName] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [uploadKey, setUploadKey] = useState(0)

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.storageList(currentPrefix),
    queryFn: ({ signal }) => storageService.list(currentPrefix, signal),
  })

  const invalidateList = useCallback(
  (prefix?: string) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.storageListPrefix() })
      if (prefix != null) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.storageList(prefix) })
      }
    },
    [queryClient],
  )

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        await storageService.upload(file, currentPrefix)
      }
    },
    onSuccess: () => {
      toast.success(filesUploadedLabel(pendingFiles.length))
      setPendingFiles([])
      setUploadKey((k) => k + 1)
      setUploadOpen(false)
      invalidateList(currentPrefix)
    },
    onError: (err: Error) => toast.error(err.message || 'Upload failed'),
  })

  const createFolderMutation = useMutation({
    mutationFn: (name: string) => storageService.createFolder(currentPrefix, name),
    onSuccess: () => {
      toast.success('Folder created')
      setFolderName('')
      setFolderOpen(false)
      invalidateList(currentPrefix)
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create folder'),
  })

  const renameMutation = useMutation({
    mutationFn: ({ obj, newName }: { obj: StorageObject; newName: string }) => {
      const parent =
        obj.type === 'folder'
          ? parentPrefixOf(obj.key) ?? ''
          : obj.key.includes('/')
            ? obj.key.slice(0, obj.key.lastIndexOf('/') + 1)
            : ''
      const toKey =
        obj.type === 'folder'
          ? parent
            ? `${parent}${newName}/`
            : `${newName}/`
          : parent
            ? `${parent}${newName}`
            : newName
      return storageService.rename({ fromKey: obj.key, toKey })
    },
    onSuccess: () => {
      toast.success('Renamed successfully')
      setRenameTarget(null)
      setRenameValue('')
      invalidateList(currentPrefix)
    },
    onError: (err: Error) => toast.error(err.message || 'Rename failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (key: string) => storageService.delete(key),
    onSuccess: () => {
      toast.success('Deleted successfully')
      setDeleteTarget(null)
      invalidateList(currentPrefix)
    },
    onError: (err: Error) => toast.error(err.message || 'Delete failed'),
  })

  const downloadMutation = useMutation({
    mutationFn: (key: string) => storageService.download(key),
    onError: (err: Error) => toast.error(err.message || 'Download failed'),
  })

  const items: StorageObject[] = [
    ...(data?.folders ?? []),
    ...(data?.files ?? []),
  ]

  const openFolder = (obj: StorageObject) => {
    if (obj.type !== 'folder') return
    setCurrentPrefix(obj.key.endsWith('/') ? obj.key : `${obj.key}/`)
  }

  const breadcrumbs = prefixSegments(currentPrefix)

  return (
    <AdminSection
      description="Browse and manage files in object storage. Folders and files are organized hierarchically like S3/R2."
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setFolderOpen(true)}>
            <FolderPlus className="me-2 h-4 w-4" />
            New folder
          </Button>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="me-2 h-4 w-4" />
            Upload
          </Button>
        </>
      }
      toolbar={
        <AdminToolbar>
          <AdminToolbarGroup className="flex-1 min-w-0">
            <nav aria-label="Storage path" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
              {breadcrumbs.map((seg, i) => (
                <span key={seg.prefix} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                  <button
                    type="button"
                    onClick={() => setCurrentPrefix(seg.prefix)}
                    className={cn(
                      'truncate rounded px-1.5 py-0.5 transition-colors hover:bg-muted',
                      i === breadcrumbs.length - 1
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {seg.label}
                  </button>
                </span>
              ))}
            </nav>
          </AdminToolbarGroup>
          <AdminToolbarGroup>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Refresh"
            >
              <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
            </Button>
          </AdminToolbarGroup>
        </AdminToolbar>
      }
    >
      <div className="grid min-h-[28rem] flex-1 gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="hidden rounded-xl border bg-card/50 p-3 lg:block">
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Folders
          </p>
          <StorageFolderTree
            currentPrefix={currentPrefix}
            onSelectPrefix={setCurrentPrefix}
          />
        </aside>

        <AdminDataPanel
          loading={isLoading}
          empty={!isLoading && !isError && items.length === 0}
          emptyMessage="This folder is empty. Upload files or create a subfolder to get started."
          meta={
            !isLoading && !isError
              ? `${items.length} item${items.length === 1 ? '' : 's'}`
              : undefined
          }
        >
          {isError ? (
            <div className="admin-data-empty">
              <p className="text-sm font-medium text-destructive">Could not load storage</p>
              <p className="max-w-md text-pretty text-sm text-muted-foreground">
                {(error as Error)?.message ||
                  'The storage API is not available yet. Connect the R2 backend to enable this page.'}
              </p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Size</th>
                    <th className="hidden px-4 py-2.5 font-medium md:table-cell">Modified</th>
                    <th className="w-12 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((obj) => {
                    const Icon = iconForStorageObject(obj)
                    return (
                      <tr
                        key={obj.key}
                        className="group border-b last:border-0 transition-colors hover:bg-muted/30"
                      >
                        <td className="px-4 py-2.5">
                          <button
                            type="button"
                            className="flex max-w-full items-center gap-2.5 text-left"
                            onClick={() =>
                              obj.type === 'folder' ? openFolder(obj) : downloadMutation.mutate(obj.key)
                            }
                            onDoubleClick={() => obj.type === 'folder' && openFolder(obj)}
                          >
                            <Icon
                              className={cn(
                                'h-4 w-4 shrink-0',
                                obj.type === 'folder' ? 'text-amber-500' : 'text-muted-foreground',
                              )}
                            />
                            <span className="truncate font-medium">{obj.name}</span>
                          </button>
                        </td>
                        <td className="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">
                          {obj.type === 'folder' ? '—' : formatBytes(obj.size)}
                        </td>
                        <td className="hidden px-4 py-2.5 text-muted-foreground md:table-cell">
                          {formatStorageDate(obj.lastModified)}
                        </td>
                        <td className="px-2 py-2.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
                                aria-label={`Actions for ${obj.name}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {obj.type === 'folder' ? (
                                <DropdownMenuItem onClick={() => openFolder(obj)}>
                                  Open
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => downloadMutation.mutate(obj.key)}
                                  disabled={downloadMutation.isPending}
                                >
                                  <Download className="me-2 h-4 w-4" />
                                  Download
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  setRenameTarget(obj)
                                  setRenameValue(obj.name)
                                }}
                              >
                                <Pencil className="me-2 h-4 w-4" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(obj)}
                              >
                                <Trash2 className="me-2 h-4 w-4" />
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

      {/* Upload dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload files</DialogTitle>
            <DialogDescription>
              Files will be stored under{' '}
              <span className="font-mono text-xs">
                {currentPrefix || '/'}
              </span>
            </DialogDescription>
          </DialogHeader>
          <StorageFileDropzone key={uploadKey} onFilesChange={setPendingFiles} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pendingFiles.length === 0 || uploadMutation.isPending}
              onClick={() => uploadMutation.mutate(pendingFiles)}
            >
              {uploadMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Upload {pendingFiles.length > 0 ? `(${pendingFiles.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create folder dialog */}
      <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>
              Create a folder inside{' '}
              <span className="font-mono text-xs">{currentPrefix || '/'}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input
              id="folder-name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g. contracts"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && folderName.trim()) {
                  createFolderMutation.mutate(folderName.trim())
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFolderOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!folderName.trim() || createFolderMutation.isPending}
              onClick={() => createFolderMutation.mutate(folderName.trim())}
            >
              {createFolderMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename {renameTarget?.type}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-value">Name</Label>
            <Input
              id="rename-value"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameTarget && renameValue.trim()) {
                  renameMutation.mutate({ obj: renameTarget, newName: renameValue.trim() })
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={!renameValue.trim() || renameMutation.isPending}
              onClick={() =>
                renameTarget &&
                renameMutation.mutate({ obj: renameTarget, newName: renameValue.trim() })
              }
            >
              {renameMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.type}?</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{deleteTarget?.name}</span> will be
              permanently removed from storage. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.key)}
            >
              {deleteMutation.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminSection>
  )
}

function filesUploadedLabel(count: number): string {
  return count === 1 ? '1 file uploaded' : `${count} files uploaded`
}
