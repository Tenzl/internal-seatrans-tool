import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { storageService } from '@/modules/storage/services/storageService'
import type { StorageObject } from '@/modules/storage/types/storage.types'
import { queryKeys } from '@/shared/config/react-query.config'
import { toast } from '@/shared/utils/toast'
import {
  buildRenamedStorageKey,
  folderPrefix,
  uploadedFilesLabel,
} from './storagePathRules'

export function useStorageExplorer() {
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

  const listQuery = useQuery({
    queryKey: queryKeys.storageList(currentPrefix),
    queryFn: ({ signal }) => storageService.list(currentPrefix, signal),
  })

  const invalidateList = useCallback(
    (prefix?: string) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.storageListPrefix(),
      })
      if (prefix != null) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.storageList(prefix),
        })
      }
    },
    [queryClient]
  )

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      for (const file of files) {
        await storageService.upload(file, currentPrefix)
      }
    },
    onSuccess: () => {
      toast.success(uploadedFilesLabel(pendingFiles.length))
      setPendingFiles([])
      setUploadKey((key) => key + 1)
      setUploadOpen(false)
      invalidateList(currentPrefix)
    },
    onError: (error: Error) => toast.error(error.message || 'Upload failed'),
  })

  const createFolderMutation = useMutation({
    mutationFn: (name: string) =>
      storageService.createFolder(currentPrefix, name),
    onSuccess: () => {
      toast.success('Folder created')
      setFolderName('')
      setFolderOpen(false)
      invalidateList(currentPrefix)
    },
    onError: (error: Error) =>
      toast.error(error.message || 'Failed to create folder'),
  })

  const renameMutation = useMutation({
    mutationFn: ({
      object,
      newName,
    }: {
      object: StorageObject
      newName: string
    }) =>
      storageService.rename({
        fromKey: object.key,
        toKey: buildRenamedStorageKey(object, newName),
      }),
    onSuccess: () => {
      toast.success('Renamed successfully')
      setRenameTarget(null)
      setRenameValue('')
      invalidateList(currentPrefix)
    },
    onError: (error: Error) => toast.error(error.message || 'Rename failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (key: string) => storageService.delete(key),
    onSuccess: () => {
      toast.success('Deleted successfully')
      setDeleteTarget(null)
      invalidateList(currentPrefix)
    },
    onError: (error: Error) => toast.error(error.message || 'Delete failed'),
  })

  const downloadMutation = useMutation({
    mutationFn: (key: string) => storageService.download(key),
    onError: (error: Error) => toast.error(error.message || 'Download failed'),
  })

  const openFolder = (object: StorageObject) => {
    const prefix = folderPrefix(object)
    if (prefix != null) setCurrentPrefix(prefix)
  }

  const openRename = (object: StorageObject) => {
    setRenameTarget(object)
    setRenameValue(object.name)
  }

  return {
    currentPrefix,
    setCurrentPrefix,
    items: [
      ...(listQuery.data?.folders ?? []),
      ...(listQuery.data?.files ?? []),
    ] as StorageObject[],
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
  }
}
