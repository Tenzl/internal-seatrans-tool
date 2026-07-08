"use client"

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Alert, AlertDescription } from '@/shared/components/ui/alert'
import { Loader2, AlertCircle, RefreshCw, FileText, ArrowUpDown, Trash2, Archive, RotateCcw } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { useCurrentUser } from '@/hooks/use-current-user'
import { isAdminRole } from '@/config/section-catalog'
import { QuotePreview } from '@/modules/inquiries/components/common/Quote-hcm'
import { InquiryDataTable, type InquiryDeleteMode } from './InquiryDataTable'
import { InquiryDetailDrawer } from './InquiryDetailDrawer'
import { buildDashboardUrl } from '@/shared/utils/dashboardNavigation'
import { useInquiryData } from './useInquiryData'
import { useInvoicePreview } from './useInvoicePreview'
import {
  getSchemaForService,
  getServiceSlugFromInquiry,
} from './serviceInquirySchemas'
import { STATUS_QUOTED, STATUS_COMPLETED, STATUS_BADGE_CONFIG, InquiryStatus } from '@/shared/constants/inquiry-status'

interface BaseInquiryHistoryLayoutProps {
  serviceType?: string
  serviceLabel?: string
  isAdmin?: boolean
  title?: string
  description?: string
}

export function BaseInquiryHistoryLayout({
  serviceType,
  serviceLabel,
  isAdmin = false,
  title,
  description = 'View and manage your inquiry submissions',
}: BaseInquiryHistoryLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const {
    inquiries,
    isLoading,
    error,
    fetchInquiries,
    deleteInquiries,
    restoreInquiries,
    archivedFilter,
    setArchivedFilter,
  } = useInquiryData({
    serviceType,
    isAdmin,
  })

  const { quoteHtml, isLoading: loadingQuote, generateInvoicePreview, clearPreview } = useInvoicePreview()

  const currentUser = useCurrentUser()
  const canSoftDelete = isAdmin && !isAdminRole(currentUser?.role)
  const canHardDelete = isAdmin && isAdminRole(currentUser?.role)

  const [detailInquiry, setDetailInquiry] = useState<any | null>(null)
  const [quoteInquiry, setQuoteInquiry] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [deleteMode, setDeleteMode] = useState<InquiryDeleteMode>('soft')
  const [restoreTarget, setRestoreTarget] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)

  useEffect(() => {
    fetchInquiries()
  }, [fetchInquiries])

  const getStatusBadge = (status: string) => {
    const config = STATUS_BADGE_CONFIG[status as InquiryStatus] || { variant: 'outline' as const, label: status }
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
  }

  const getInquiryStatusBadge = (inquiry: any) => {
    if (inquiry?.isArchived) {
      return <Badge variant="secondary" className="bg-muted text-muted-foreground">Archived</Badge>
    }
    return getStatusBadge(inquiry?.status)
  }

  const formatDate = (value: string) => new Date(value).toLocaleString()

  const renderService = (inquiry: any) => {
    const label = inquiry.serviceType?.displayName || inquiry.serviceType?.name || serviceLabel || 'Service'
    return <span className="font-medium">{label}</span>
  }

  const handleViewQuote = async (inquiry: any) => {
    setQuoteInquiry(inquiry)
    try {
      await generateInvoicePreview(inquiry)
    } catch (err) {
      console.error('Failed to load quote preview:', err)
    }
  }

  const handleOpenDetail = (inquiry: any) => {
    const slug = getServiceSlugFromInquiry(inquiry) || serviceType
    if (isAdmin && slug === 'shipping-agency') {
      const status = inquiry.status
      // Always open straight into the EPDA edit screen. For a finalised EPDA
      // (Completed / Quoted) also auto-open the quote preview (preview=1).
      const wantPreview = status === STATUS_COMPLETED || status === STATUS_QUOTED
      const extra: Record<string, string> = { inquiryId: String(inquiry.id), mode: 'edit' }
      if (wantPreview) extra.preview = '1'
      router.push(buildDashboardUrl(pathname, 'shipping-agency-inquiry-detail', extra), {
        scroll: false,
      })
      return
    }
    setDetailInquiry(inquiry)
  }

  const handleDeleteInquiries = async (ids: number[], mode: InquiryDeleteMode) => {
    try {
      await deleteInquiries(ids, mode)
    } catch (error) {
      console.error('Error deleting inquiries:', error)
      throw error
    }
  }

  const openDeleteDialog = (inquiry: any, mode: InquiryDeleteMode) => {
    setDeleteTarget(inquiry)
    setDeleteMode(mode)
  }

  const confirmDeleteInquiry = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteInquiries([deleteTarget.id], deleteMode)
      setDeleteTarget(null)
    } catch (error) {
      console.error('Error deleting inquiry:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const confirmRestoreInquiry = async () => {
    if (!restoreTarget) return
    setIsRestoring(true)
    try {
      await restoreInquiries([restoreTarget.id])
      setRestoreTarget(null)
      if (archivedFilter === 'archived') {
        await fetchInquiries()
      }
    } catch (error) {
      console.error('Error restoring inquiry:', error)
    } finally {
      setIsRestoring(false)
    }
  }

  const handleDetailClose = () => {
    setDetailInquiry(null)
  }

  const handleViewInvoiceFromDetail = () => {
    if (detailInquiry) {
      handleViewQuote(detailInquiry)
      setDetailInquiry(null)
    }
  }

  const isShippingAgencyHistory = serviceType === 'shipping-agency'

  // Define columns
  const columns: ColumnDef<any>[] = [
    {
      id: 'no',
      header: 'No.',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {row.original.code || `#${row.original.id}`}
        </span>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: isShippingAgencyHistory ? 'mv' : 'fullName',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          {isShippingAgencyHistory ? 'Vessel name' : 'Customer'}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const inq = row.original
        const name = isShippingAgencyHistory
          ? inq.mv || inq.vesselName || '—'
          : inq.fullName || inq.contactName || inq.name || inq.toName || '—'
        return <span className="font-medium">{name}</span>
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      // Archived rows are only shown to admins; users never see them.
      cell: ({ row }) => getInquiryStatusBadge(row.original),
    },
  ]

  if (serviceType === 'shipping-agency') {
    columns.push(
      {
        accessorKey: 'portOfCall',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Port
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const val = row.original.portOfCall || row.original.loadingPort || row.original.dischargingPort || '—'
          return <span className="text-sm">{val}</span>
        },
      }
    )
  }
  
  columns.push(
    {
      accessorKey: 'submittedAt',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm whitespace-nowrap">
          {formatDate(row.original.submittedAt)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const inq = row.original
        const slug = getServiceSlugFromInquiry(inq) || serviceType
        const isShippingAgency = slug === 'shipping-agency'

        // Admin actions
        if (isAdmin) {
          return (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenDetail(inq)}
                className="gap-2"
              >
                View Details
              </Button>
              {canSoftDelete && !inq.isArchived && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDeleteDialog(inq, 'soft')}
                  className="gap-2"
                >
                  <Archive className="h-4 w-4" />
                  Archive
                </Button>
              )}
              {canHardDelete && (
                <>
                  {!inq.isArchived ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteDialog(inq, 'hard')}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRestoreTarget(inq)}
                        className="gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restore
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(inq, 'hard')}
                        className="gap-2 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          )
        }

        // User actions
        if (isShippingAgency) {
          // Shipping agency: View Invoice only available when status is QUOTED
          const isQuoted = inq.status === STATUS_QUOTED
          return (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenDetail(inq)}
                className="gap-2"
              >
                View Details
              </Button>
              {isQuoted && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleViewQuote(inq)}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  View Invoice
                </Button>
              )}
            </div>
          )
        }

        // Other services: only View Details
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenDetail(inq)}
            className="gap-2"
          >
            View Details
          </Button>
        )
      },
    }
  )

  const detailSchema = detailInquiry 
    ? getSchemaForService(getServiceSlugFromInquiry(detailInquiry) || serviceType || '')
    : []

  return (
    <>
      <Card>
        <CardHeader className="border-b border-border/50 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              {title ? (
                <CardTitle className="text-lg font-semibold tracking-tight">{title}</CardTitle>
              ) : null}
              {description ? (
                <CardDescription className="max-w-2xl text-sm leading-relaxed">{description}</CardDescription>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              {canHardDelete ? (
                <Select
                  value={archivedFilter}
                  onValueChange={(value) => setArchivedFilter(value as 'active' | 'archived' | 'all')}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchInquiries}
                disabled={isLoading}
                className="gap-2 shrink-0"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Reload
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : inquiries.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No inquiries yet.
            </div>
          ) : (
            <InquiryDataTable
              columns={columns}
              data={inquiries}
              searchKey={isAdmin ? (isShippingAgencyHistory ? 'mv' : 'fullName') : undefined}
              searchPlaceholder={
                isShippingAgencyHistory ? 'Search by vessel name...' : 'Search by name...'
              }
              onDelete={canSoftDelete || canHardDelete ? handleDeleteInquiries : undefined}
              canHardDelete={canHardDelete}
            />
          )}
        </CardContent>
      </Card>

      {/* Detail Drawer */}
      <InquiryDetailDrawer
        inquiry={detailInquiry}
        schema={detailSchema}
        open={!!detailInquiry}
        onOpenChange={(open) => !open && handleDetailClose()}
        onViewInvoice={handleViewInvoiceFromDetail}
        serviceLabel={detailInquiry ? renderService(detailInquiry).props.children : undefined}
        serviceSlug={detailInquiry ? getServiceSlugFromInquiry(detailInquiry) || serviceType : serviceType}
        isAdmin={isAdmin}
      />

      {/* Invoice Preview Dialog */}
      {quoteInquiry && (
        <Dialog 
          open={!!quoteInquiry} 
          onOpenChange={(open) => {
            if (!open) {
              setQuoteInquiry(null)
              clearPreview()
            }
          }}
        >
          <DialogContent className="max-w-4xl w-full">
            <DialogHeader>
              <DialogTitle>Invoice Preview</DialogTitle>
              <DialogDescription>
                Invoice for {renderService(quoteInquiry)}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-4 min-h-[70vh]">
                <div className="flex-1 min-h-[70vh] rounded-md border overflow-hidden bg-white">
                  {loadingQuote ? (
                    <div className="flex items-center justify-center h-full bg-muted">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : quoteHtml ? (
                    <QuotePreview html={quoteHtml} />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-muted text-muted-foreground">
                      <FileText className="h-10 w-10 mr-2" />
                      No invoice available
                    </div>
                  )}
                </div>
              </div>

              {quoteHtml && (
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!quoteHtml) return
                      
                      const iframe = document.createElement('iframe')
                      iframe.style.position = 'fixed'
                      iframe.style.right = '0'
                      iframe.style.bottom = '0'
                      iframe.style.width = '0'
                      iframe.style.height = '0'
                      iframe.style.border = 'none'
                      document.body.appendChild(iframe)
                      
                      const iframeDoc = iframe.contentWindow?.document
                      if (!iframeDoc) {
                        document.body.removeChild(iframe)
                        return
                      }
                      
                      iframeDoc.open()
                      iframeDoc.write(quoteHtml)
                      iframeDoc.close()
                      
                      await new Promise(resolve => setTimeout(resolve, 1000))
                      
                      iframe.contentWindow?.focus()
                      iframe.contentWindow?.print()
                      
                      setTimeout(() => {
                        document.body.removeChild(iframe)
                      }, 1000)
                    }}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Save PDF
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setQuoteInquiry(null)
                      clearPreview()
                    }}
                  >
                    Close
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation (admin only) */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deleteMode === 'hard' ? 'Permanently delete inquiry?' : 'Archive inquiry?'}
            </DialogTitle>
            <DialogDescription>
              {deleteMode === 'hard' ? (
                <>
                  Inquiry #{deleteTarget?.id} and its attached documents will be permanently
                  removed. This cannot be undone.
                </>
              ) : (
                <>
                  Inquiry #{deleteTarget?.id} will be archived and hidden from user/staff history.
                  Administrators will still see it as archived.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant={deleteMode === 'hard' ? 'destructive' : 'default'}
              onClick={confirmDeleteInquiry}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : deleteMode === 'hard' ? <Trash2 className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
              {deleteMode === 'hard' ? 'Delete permanently' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!restoreTarget} onOpenChange={(open) => !open && !isRestoring && setRestoreTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore inquiry?</DialogTitle>
            <DialogDescription>
              Inquiry #{restoreTarget?.id} will be moved back to the active list.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setRestoreTarget(null)} disabled={isRestoring}>
              Cancel
            </Button>
            <Button onClick={confirmRestoreInquiry} disabled={isRestoring} className="gap-2">
              {isRestoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
