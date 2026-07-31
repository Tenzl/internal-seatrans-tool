'use client'

import { AdminSection } from '@/shared/components/layout/dashboard/admin'
import { FolderPlus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  CreateStorageFolderDialog,
  DeleteStorageObjectDialog,
  RenameStorageObjectDialog,
  StorageUploadDialog,
} from './storage-explorer/StorageActionDialogs'
import { StorageBrowser } from './storage-explorer/StorageBrowser'
import { StorageToolbar } from './storage-explorer/StorageToolbar'
import { useStorageExplorer } from './storage-explorer/useStorageExplorer'

export function StorageExplorer() {
  const explorer = useStorageExplorer()
  const {
    currentPrefix,
    setCurrentPrefix,
    items,
    listQuery,
    openFolder,
    openRename,
    uploadOpen,
    setUploadOpen,
    folderOpen,
    setFolderOpen,
    renameTarget,
    setRenameTarget,
    deleteTarget,
    setDeleteTarget,
    pendingFiles,
    setPendingFiles,
    folderName,
    setFolderName,
    renameValue,
    setRenameValue,
    uploadKey,
    uploadMutation,
    createFolderMutation,
    renameMutation,
    deleteMutation,
    downloadMutation,
  } = explorer

  return (
    <AdminSection
      description='Browse and manage files in object storage. Folders and files are organized hierarchically like S3/R2.'
      actions={
        <>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setFolderOpen(true)}
          >
            <FolderPlus className='me-2 h-4 w-4' />
            New folder
          </Button>
          <Button size='sm' onClick={() => setUploadOpen(true)}>
            <Upload className='me-2 h-4 w-4' />
            Upload
          </Button>
        </>
      }
      toolbar={
        <StorageToolbar
          currentPrefix={currentPrefix}
          refreshing={listQuery.isFetching}
          onPrefixChange={setCurrentPrefix}
          onRefresh={() => void listQuery.refetch()}
        />
      }
    >
      <StorageBrowser
        currentPrefix={currentPrefix}
        items={items}
        loading={listQuery.isLoading}
        error={listQuery.isError ? (listQuery.error as Error) : null}
        downloading={downloadMutation.isPending}
        onPrefixChange={setCurrentPrefix}
        onOpenFolder={openFolder}
        onDownload={(key) => downloadMutation.mutate(key)}
        onRename={openRename}
        onDelete={setDeleteTarget}
        onRetry={() => void listQuery.refetch()}
      />

      <StorageUploadDialog
        open={uploadOpen}
        currentPrefix={currentPrefix}
        files={pendingFiles}
        uploadKey={uploadKey}
        uploading={uploadMutation.isPending}
        onOpenChange={setUploadOpen}
        onFilesChange={setPendingFiles}
        onUpload={() => uploadMutation.mutate(pendingFiles)}
      />
      <CreateStorageFolderDialog
        open={folderOpen}
        currentPrefix={currentPrefix}
        name={folderName}
        creating={createFolderMutation.isPending}
        onOpenChange={setFolderOpen}
        onNameChange={setFolderName}
        onCreate={() => createFolderMutation.mutate(folderName.trim())}
      />
      <RenameStorageObjectDialog
        target={renameTarget}
        value={renameValue}
        renaming={renameMutation.isPending}
        onClose={() => setRenameTarget(null)}
        onValueChange={setRenameValue}
        onRename={() => {
          if (renameTarget) {
            renameMutation.mutate({
              object: renameTarget,
              newName: renameValue.trim(),
            })
          }
        }}
      />
      <DeleteStorageObjectDialog
        target={deleteTarget}
        deleting={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onDelete={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.key)
        }}
      />
    </AdminSection>
  )
}
