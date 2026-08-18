import { useState } from 'react'
import { buildEpdaLockSnapshotFromAdminInquiry } from '@/modules/inquiries/components/common/buildEpdaLockSnapshot'
import { quoteFormFromStored } from '@/modules/inquiries/components/common/quoteForm'
import { extractWorkingParams } from '@/modules/inquiries/components/common/quoteParameters'
import { inquiryService } from '@/modules/inquiries/services/inquiryService'
import { resolveEffectiveParams } from '@/modules/inquiries/services/resolveEffectiveParams'
import { shippingAgencyEpdaService } from '@/modules/inquiries/services/shippingAgencyEpdaService'
import type { ShippingAgencyAdminInquiry } from '@/modules/inquiries/types/shippingAgencyEpda'
import { buildDashboardUrl } from '@/shared/utils/dashboardNavigation'
import { toast } from '@/shared/utils/toast'
import { usePathname, useRouter } from 'next/navigation'
import type { InquiryHistoryRecord } from './inquiryHistory.types'
import {
  getShippingAgencyDetailParams,
  resolveInquiryServiceSlug,
} from './inquiryHistoryRules'
import { useInvoicePreview } from './useInvoicePreview'

type DeleteInquiries = (ids: number[]) => Promise<unknown>

type UseInquiryHistoryActionsOptions = {
  serviceType?: string
  isAdmin: boolean
  fetchInquiries: () => Promise<unknown>
  deleteInquiries: DeleteInquiries
}

export function useInquiryHistoryActions({
  serviceType,
  isAdmin,
  fetchInquiries,
  deleteInquiries,
}: UseInquiryHistoryActionsOptions) {
  const router = useRouter()
  const pathname = usePathname()
  const invoicePreview = useInvoicePreview()
  const [detailInquiry, setDetailInquiry] =
    useState<InquiryHistoryRecord | null>(null)
  const [quoteInquiry, setQuoteInquiry] = useState<InquiryHistoryRecord | null>(
    null
  )
  const [deleteTarget, setDeleteTarget] = useState<InquiryHistoryRecord | null>(
    null
  )
  const [lockTarget, setLockTarget] = useState<InquiryHistoryRecord | null>(
    null
  )
  const [unlockTarget, setUnlockTarget] = useState<InquiryHistoryRecord | null>(
    null
  )
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLocking, setIsLocking] = useState(false)
  const [isUnlocking, setIsUnlocking] = useState(false)

  const viewQuote = async (inquiry: InquiryHistoryRecord) => {
    setQuoteInquiry(inquiry)
    try {
      await invoicePreview.generateInvoicePreview(inquiry)
    } catch (error) {
      toast.error('Failed to load quote preview', error)
    }
  }

  const closeQuote = () => {
    setQuoteInquiry(null)
    invoicePreview.clearPreview()
  }

  const openDetail = (inquiry: InquiryHistoryRecord) => {
    const slug = resolveInquiryServiceSlug(inquiry, serviceType)
    if (isAdmin && slug === 'shipping-agency') {
      router.push(
        buildDashboardUrl(
          pathname,
          'shipping-agency-inquiry-detail',
          getShippingAgencyDetailParams(inquiry)
        ),
        { scroll: false }
      )
      return
    }
    setDetailInquiry(inquiry)
  }

  const viewInvoiceFromDetail = () => {
    if (!detailInquiry) return
    void viewQuote(detailInquiry)
    setDetailInquiry(null)
  }

  const openDelete = (inquiry: InquiryHistoryRecord) => {
    setDeleteTarget(inquiry)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteInquiries([deleteTarget.id])
      setDeleteTarget(null)
      toast.success('Inquiry permanently deleted.')
    } catch (error) {
      toast.error('Failed to delete inquiry', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const confirmLock = async () => {
    if (!lockTarget) return
    setIsLocking(true)
    try {
      const detail =
        await inquiryService.getShippingAgencyDetail<ShippingAgencyAdminInquiry>(
          lockTarget.id
        )
      if (detail.epdaLockedAt) {
        toast.error('This EPDA is already locked.')
        setLockTarget(null)
        await fetchInquiries()
        return
      }

      const quoteForm = quoteFormFromStored(detail.quoteForm)
      // Lock freezes the pinned soft-snapshot when present (Skip path);
      // otherwise resolve live tariffs (Apply / legacy drafts).
      const working = extractWorkingParams(detail.epdaWorkingParams)
      const params =
        working ??
        (await resolveEffectiveParams(
          quoteForm,
          detail.portOfCall,
          detail.portId
        ))
      const snapshot = buildEpdaLockSnapshotFromAdminInquiry(detail, params)
      await shippingAgencyEpdaService.lockEpda(lockTarget.id, snapshot)
      toast.success('EPDA locked — snapshot saved. Edit is disabled.')
      setLockTarget(null)
      await fetchInquiries()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to lock EPDA'
      )
    } finally {
      setIsLocking(false)
    }
  }

  const confirmUnlock = async () => {
    if (!unlockTarget) return
    setIsUnlocking(true)
    try {
      await shippingAgencyEpdaService.unlockEpda(unlockTarget.id)
      toast.success('EPDA unlocked — staff can edit it again.')
      setUnlockTarget(null)
      await fetchInquiries()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to unlock EPDA'
      )
    } finally {
      setIsUnlocking(false)
    }
  }

  return {
    detailInquiry,
    quoteInquiry,
    deleteTarget,
    lockTarget,
    unlockTarget,
    isDeleting,
    isLocking,
    isUnlocking,
    quoteHtml: invoicePreview.quoteHtml,
    isLoadingQuote: invoicePreview.isLoading,
    openDetail,
    closeDetail: () => setDetailInquiry(null),
    viewQuote,
    closeQuote,
    viewInvoiceFromDetail,
    openDelete,
    closeDelete: () => setDeleteTarget(null),
    confirmDelete,
    openLock: setLockTarget,
    closeLock: () => setLockTarget(null),
    confirmLock,
    openUnlock: setUnlockTarget,
    closeUnlock: () => setUnlockTarget(null),
    confirmUnlock,
  }
}

export type InquiryHistoryActions = ReturnType<typeof useInquiryHistoryActions>
