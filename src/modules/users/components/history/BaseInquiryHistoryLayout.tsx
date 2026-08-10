'use client'

import { isAdminRole } from '@/config/section-catalog'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useIsMobile } from '@/hooks/use-mobile'
import { toast } from '@/shared/utils/toast'
import type { InquiryDeleteMode } from './InquiryDataTable'
import { InquiryDetailOverlay } from './InquiryDetailOverlay'
import { InquiryHistoryCard } from './InquiryHistoryCard'
import { InquiryHistoryRowActions } from './InquiryHistoryRowActions'
import { InquiryInvoicePreviewDialog } from './InquiryInvoicePreviewDialog'
import { InquiryMutationDialogs } from './InquiryMutationDialogs'
import type {
  BaseInquiryHistoryLayoutProps,
  InquiryActionPermissions,
  InquiryHistoryRecord,
} from './inquiryHistory.types'
import { buildInquiryHistoryColumns } from './inquiryHistoryColumns'
import { useInquiryData } from './useInquiryData'
import { useInquiryHistoryActions } from './useInquiryHistoryActions'

export function BaseInquiryHistoryLayout({
  serviceType,
  serviceLabel,
  isAdmin = false,
  title,
  description = 'View and manage your inquiry submissions',
}: BaseInquiryHistoryLayoutProps) {
  const {
    inquiries,
    isLoading,
    error,
    fetchInquiries,
    deleteInquiries,
    restoreInquiries,
    archivedFilter,
    setArchivedFilter,
    page,
    setPage,
    totalPages,
    totalElements,
    search,
    setSearch,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    sorting,
    setSorting,
  } = useInquiryData({ serviceType, isAdmin })
  const currentUser = useCurrentUser()
  const isMobile = useIsMobile()
  const permissions: InquiryActionPermissions = {
    isAdmin,
    canSoftDelete: isAdmin && !isAdminRole(currentUser?.role),
    canHardDelete: isAdmin && isAdminRole(currentUser?.role),
  }
  const rows = inquiries as InquiryHistoryRecord[]
  const isShippingAgencyHistory = serviceType === 'shipping-agency'
  const actions = useInquiryHistoryActions({
    serviceType,
    isAdmin,
    archivedFilter,
    fetchInquiries,
    deleteInquiries,
    restoreInquiries,
  })

  const columns = buildInquiryHistoryColumns({
    isShippingAgencyHistory,
    showShippingParties: isAdmin && isShippingAgencyHistory,
    renderActions: (inquiry) => (
      <InquiryHistoryRowActions
        inquiry={inquiry}
        permissions={permissions}
        fallbackServiceType={serviceType}
        onOpenDetail={actions.openDetail}
        onViewQuote={actions.viewQuote}
        onDelete={actions.openDelete}
        onRestore={actions.openRestore}
        onLock={actions.openLock}
      />
    ),
  })

  const handleBulkDelete = async (ids: number[], mode: InquiryDeleteMode) => {
    await deleteInquiries(ids, mode)
    const count = ids.length
    toast.success(
      mode === 'hard'
        ? count === 1
          ? 'Inquiry permanently deleted.'
          : `${count} inquiries permanently deleted.`
        : count === 1
          ? 'Inquiry archived.'
          : `${count} inquiries archived.`
    )
  }

  return (
    <>
      <InquiryHistoryCard
        title={title}
        description={description}
        rows={rows}
        columns={columns}
        isLoading={isLoading}
        error={error}
        canHardDelete={permissions.canHardDelete}
        canDelete={permissions.canSoftDelete || permissions.canHardDelete}
        archivedFilter={archivedFilter}
        searchKey={
          isAdmin ? (isShippingAgencyHistory ? 'mv' : 'fullName') : undefined
        }
        searchPlaceholder={
          isShippingAgencyHistory
            ? 'Search by vessel name...'
            : 'Search by name...'
        }
        search={search}
        onSearchChange={setSearch}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
        sorting={sorting}
        onSortingChange={setSorting}
        pageIndex={page}
        pageCount={totalPages}
        totalElements={totalElements}
        onPageChange={setPage}
        initialColumnVisibility={
          isMobile
            ? {
                portOfCall: false,
                submittedAt: false,
                employeeInCharge: false,
                clientSubmittedBy: false,
              }
            : undefined
        }
        onArchivedFilterChange={setArchivedFilter}
        onReload={() => void fetchInquiries()}
        onDelete={handleBulkDelete}
      />

      <InquiryDetailOverlay
        inquiry={actions.detailInquiry}
        serviceType={serviceType}
        serviceLabel={serviceLabel}
        isAdmin={isAdmin}
        onClose={actions.closeDetail}
        onViewInvoice={actions.viewInvoiceFromDetail}
      />
      <InquiryInvoicePreviewDialog
        inquiry={actions.quoteInquiry}
        serviceLabel={serviceLabel}
        html={actions.quoteHtml}
        isLoading={actions.isLoadingQuote}
        onClose={actions.closeQuote}
      />
      <InquiryMutationDialogs actions={actions} />
    </>
  )
}
