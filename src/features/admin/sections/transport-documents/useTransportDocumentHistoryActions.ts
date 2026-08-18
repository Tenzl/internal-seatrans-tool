import { useState } from 'react'
import { toast } from '@/shared/utils/toast'
import { useRouter } from 'next/navigation'
import type { TransportDocumentRecord } from './transportDocument.types'
import {
  buildBookingCopyUrl,
  buildTransportDocumentDetailUrl,
} from './transportDocumentHistoryRules'
import { transportDocumentService } from './transportDocumentService'

export function useTransportDocumentHistoryActions(options: {
  onMutated: () => Promise<unknown> | void
}) {
  const router = useRouter()
  const [deleteTarget, setDeleteTarget] =
    useState<TransportDocumentRecord | null>(null)
  const [lockTarget, setLockTarget] = useState<TransportDocumentRecord | null>(
    null
  )
  const [unlockTarget, setUnlockTarget] =
    useState<TransportDocumentRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLocking, setIsLocking] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)

  const openDetail = (record: TransportDocumentRecord) => {
    router.push(buildTransportDocumentDetailUrl(record), { scroll: false })
  }

  const copyBooking = (record: TransportDocumentRecord) => {
    router.push(buildBookingCopyUrl(record), { scroll: false })
  }

  const openDelete = (record: TransportDocumentRecord) => {
    setDeleteTarget(record)
  }

  const closeDelete = () => setDeleteTarget(null)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await transportDocumentService.delete(
        deleteTarget.documentType,
        deleteTarget.id
      )
      toast.success('Document record permanently deleted')
      setDeleteTarget(null)
      await options.onMutated()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete document record'
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
      await transportDocumentService.lock(
        lockTarget.documentType,
        lockTarget.id,
        lockTarget.version
      )
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

  const openUnlock = (record: TransportDocumentRecord) => {
    setUnlockTarget(record)
  }

  const closeUnlock = () => setUnlockTarget(null)

  const confirmUnlock = async () => {
    if (!unlockTarget) return
    setIsUnlocking(true)
    try {
      await transportDocumentService.unlock(
        unlockTarget.documentType,
        unlockTarget.id,
        unlockTarget.version
      )
      toast.success('Document record unlocked')
      setUnlockTarget(null)
      await options.onMutated()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to unlock document record'
      )
    } finally {
      setIsUnlocking(false)
    }
  }

  return {
    deleteTarget,
    lockTarget,
    unlockTarget,
    isDeleting,
    isLocking,
    isUnlocking,
    openDetail,
    copyBooking,
    openDelete,
    closeDelete,
    confirmDelete,
    openLock,
    closeLock,
    confirmLock,
    openUnlock,
    closeUnlock,
    confirmUnlock,
  }
}
