import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/shared/utils/toast'
import type {
  TransportDocumentDeleteMode,
  TransportDocumentRecord,
} from './transportDocument.types'
import { buildTransportDocumentDetailUrl } from './transportDocumentHistoryRules'
import { transportDocumentService } from './transportDocumentService'

export function useTransportDocumentHistoryActions(options: {
  onMutated: () => Promise<unknown> | void
}) {
  const router = useRouter()
  const [deleteTarget, setDeleteTarget] =
    useState<TransportDocumentRecord | null>(null)
  const [deleteMode, setDeleteMode] =
    useState<TransportDocumentDeleteMode>('soft')
  const [lockTarget, setLockTarget] =
    useState<TransportDocumentRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLocking, setIsLocking] = useState(false)

  const openDetail = (record: TransportDocumentRecord) => {
    router.push(buildTransportDocumentDetailUrl(record), { scroll: false })
  }

  const openDelete = (
    record: TransportDocumentRecord,
    mode: TransportDocumentDeleteMode
  ) => {
    setDeleteTarget(record)
    setDeleteMode(mode)
  }

  const closeDelete = () => setDeleteTarget(null)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      if (deleteMode === 'hard') {
        await transportDocumentService.permanentDelete(deleteTarget.id)
        toast.success('Document record deleted')
      } else {
        await transportDocumentService.archive(deleteTarget.id)
        toast.success('Document record archived')
      }
      setDeleteTarget(null)
      await options.onMutated()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : deleteMode === 'hard'
            ? 'Failed to delete document record'
            : 'Failed to archive document record'
      )
    } finally {
      setIsDeleting(false)
    }
  }

  const openLock = (record: TransportDocumentRecord) => {
    setLockTarget(record)
  }

  const closeLock = () => setLockTarget(null)

  const confirmLock = async () => {
    if (!lockTarget) return
    setIsLocking(true)
    try {
      await transportDocumentService.lock(lockTarget.id)
      toast.success('Document record locked')
      setLockTarget(null)
      await options.onMutated()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to lock document record'
      )
    } finally {
      setIsLocking(false)
    }
  }

  return {
    deleteTarget,
    deleteMode,
    lockTarget,
    isDeleting,
    isLocking,
    openDetail,
    openDelete,
    closeDelete,
    confirmDelete,
    openLock,
    closeLock,
    confirmLock,
  }
}
