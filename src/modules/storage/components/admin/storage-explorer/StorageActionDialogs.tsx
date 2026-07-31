import type { Dispatch, SetStateAction } from 'react'
import type { StorageObject } from '@/modules/storage/types/storage.types'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { StorageFileDropzone } from '@/components/ui/file-upload'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function StorageUploadDialog({
  open,
  currentPrefix,
  files,
  uploadKey,
  uploading,
  onOpenChange,
  onFilesChange,
  onUpload,
}: {
  open: boolean
  currentPrefix: string
  files: File[]
  uploadKey: number
  uploading: boolean
  onOpenChange: (open: boolean) => void
  onFilesChange: Dispatch<SetStateAction<File[]>>
  onUpload: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Upload files</DialogTitle>
          <DialogDescription>
            Files will be stored under{' '}
            <span className='font-mono text-xs'>{currentPrefix || '/'}</span>
          </DialogDescription>
        </DialogHeader>
        <StorageFileDropzone key={uploadKey} onFilesChange={onFilesChange} />
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={files.length === 0 || uploading} onClick={onUpload}>
            {uploading ? (
              <Loader2 className='me-2 h-4 w-4 animate-spin' />
            ) : null}
            Upload {files.length > 0 ? `(${files.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CreateStorageFolderDialog({
  open,
  currentPrefix,
  name,
  creating,
  onOpenChange,
  onNameChange,
  onCreate,
}: {
  open: boolean
  currentPrefix: string
  name: string
  creating: boolean
  onOpenChange: (open: boolean) => void
  onNameChange: (name: string) => void
  onCreate: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>New folder</DialogTitle>
          <DialogDescription>
            Create a folder inside{' '}
            <span className='font-mono text-xs'>{currentPrefix || '/'}</span>
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-2'>
          <Label htmlFor='folder-name'>Folder name</Label>
          <Input
            id='folder-name'
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder='e.g. contracts'
            onKeyDown={(event) => {
              if (event.key === 'Enter' && name.trim()) onCreate()
            }}
          />
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!name.trim() || creating} onClick={onCreate}>
            {creating ? (
              <Loader2 className='me-2 h-4 w-4 animate-spin' />
            ) : null}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function RenameStorageObjectDialog({
  target,
  value,
  renaming,
  onClose,
  onValueChange,
  onRename,
}: {
  target: StorageObject | null
  value: string
  renaming: boolean
  onClose: () => void
  onValueChange: (value: string) => void
  onRename: () => void
}) {
  return (
    <Dialog open={target != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Rename {target?.type}</DialogTitle>
        </DialogHeader>
        <div className='space-y-2'>
          <Label htmlFor='rename-value'>Name</Label>
          <Input
            id='rename-value'
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && target && value.trim()) onRename()
            }}
          />
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!value.trim() || renaming} onClick={onRename}>
            {renaming ? (
              <Loader2 className='me-2 h-4 w-4 animate-spin' />
            ) : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DeleteStorageObjectDialog({
  target,
  deleting,
  onClose,
  onDelete,
}: {
  target: StorageObject | null
  deleting: boolean
  onClose: () => void
  onDelete: () => void
}) {
  return (
    <Dialog open={target != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>Delete {target?.type}?</DialogTitle>
          <DialogDescription>
            <span className='font-medium text-foreground'>{target?.name}</span>{' '}
            will be permanently removed from storage. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button variant='destructive' disabled={deleting} onClick={onDelete}>
            {deleting ? (
              <Loader2 className='me-2 h-4 w-4 animate-spin' />
            ) : null}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
