import { useState } from 'react'
import { buildEpdaLockSnapshotFromAdminInquiry } from '@/modules/inquiries/components/common/buildEpdaLockSnapshot'
import { quoteFormFromStored } from '@/modules/inquiries/components/common/quoteForm'
import { inquiryService } from '@/modules/inquiries/services/inquiryService'
import { resolveEffectiveParams } from '@/modules/inquiries/services/resolveEffectiveParams'
import { shippingAgencyEpdaService } from '@/modules/inquiries/services/shippingAgencyEpdaService'
import type { ShippingAgencyAdminInquiry } from '@/modules/inquiries/types/shippingAgencyEpda'
import { buildDashboardUrl } from '@/shared/utils/dashboardNavigation'
import { toast } from '@/shared/utils/toast'
import { extractWorkingParams } from '@/modules/inquiries/components/common/quoteParameters'
import { usePathname, useRouter } from 'next/navigation'
import type { InquiryDeleteMode } from './InquiryDataTable'
import type { InquiryHistoryRecord } from './inquiryHistory.types'
import {
  getShippingAgencyDetailParams,
  resolveInquiryServiceSlug,
} from './inquiryHistoryRules'
import type { AdminArchivedFilter } from './useInquiryData'
import { useInvoicePreview } from './useInvoicePreview'

type DeleteInquiries = (
  ids: number[],
  mode: InquiryDeleteMode
) => Promise<unknown>
type RestoreInquiries = (ids: number[]) => Promise<unknown>

type UseInquiryHistoryActionsOptions = {
  serviceType?: string
  isAdmin: boolean
  archivedFilter: AdminArchivedFilter
  fetchInquiries: () => Promise<unknown>
  deleteInquiries: DeleteInquiries
  restoreInquiries: RestoreInquiries
}

export function useInquiryHistoryActions({
  serviceType,
  isAdmin,
  archivedFilter,
  fetchInquiries,
  deleteInquiries,
  restoreInquiries,
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
  const [deleteMode, setDeleteMode] = useState<InquiryDeleteMode>('soft')
  const [restoreTarget, setRestoreTarget] =
    useState<InquiryHistoryRecord | null>(null)
  const [lockTarget, setLockTarget] = useState<InquiryHistoryRecord | null>(
    null
  )
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isLocking, setIsLocking] = useState(false)

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

  const openDelete = (
    inquiry: InquiryHistoryRecord,
    mode: InquiryDeleteMode
  ) => {
    setDeleteTarget(inquiry)
    setDeleteMode(mode)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteInquiries([deleteTarget.id], deleteMode)
      setDeleteTarget(null)
    } catch (error) {
      toast.error('Failed to delete inquiry', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const confirmRestore = async () => {
    if (!restoreTarget) return
    setIsRestoring(true)
    try {
      await restoreInquiries([restoreTarget.id])
      setRestoreTarget(null)
      if (archivedFilter === 'archived') {
        await fetchInquiries()
      }
    } catch (error) {
      toast.error('Failed to restore inquiry', error)
    } finally {
      setIsRestoring(false)
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

  return {
    detailInquiry,
    quoteInquiry,
    deleteTarget,
    deleteMode,
    restoreTarget,
    lockTarget,
    isDeleting,
    isRestoring,
    isLocking,
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
    openRestore: setRestoreTarget,
    closeRestore: () => setRestoreTarget(null),
    confirmRestore,
    openLock: setLockTarget,
    closeLock: () => setLockTarget(null),
    confirmLock,
  }
}

export type InquiryHistoryActions = ReturnType<typeof useInquiryHistoryActions>
