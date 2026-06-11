"use client"

import * as React from "react"
import { Eye, X, Paperclip, FileText as FileTextIcon, Download, Loader2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet"
import { Badge } from "@/shared/components/ui/badge"
import { Separator } from "@/shared/components/ui/separator"
import {
  InquiryFieldSchema,
  getFieldValue,
} from "./serviceInquirySchemas"
import { documentService, type InquiryDocument } from "@/modules/inquiries/services/documentService"
import { STATUS_QUOTED, STATUS_COMPLETED, STATUS_BADGE_CONFIG, InquiryStatus } from '@/shared/constants/inquiry-status'

interface InquiryDetailDrawerProps {
  inquiry: any | null
  schema: InquiryFieldSchema[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onViewInvoice?: () => void
  showInvoiceButton?: boolean
  serviceLabel?: string
  isAdmin?: boolean
  serviceSlug?: string // explicit slug fallback when inquiry.serviceType is missing (admin)
}

export function InquiryDetailDrawer({
  inquiry,
  schema,
  open,
  onOpenChange,
  onViewInvoice,
  showInvoiceButton = true,
  serviceLabel,
  isAdmin = false,
  serviceSlug,
}: InquiryDetailDrawerProps) {
  const [documents, setDocuments] = React.useState<InquiryDocument[]>([])
  const [loadingDocuments, setLoadingDocuments] = React.useState(false)

  // Load documents when drawer opens
  React.useEffect(() => {
    const slug = serviceSlug || inquiry?.serviceType?.name
    if (open && inquiry?.id && slug) {
      loadDocuments()
    } else {
      setDocuments([])
    }
  }, [open, inquiry?.id, inquiry?.serviceType?.name, serviceSlug])

  const loadDocuments = async () => {
    const slug = serviceSlug || inquiry?.serviceType?.name
    if (!inquiry?.id || !slug) return
    
    setLoadingDocuments(true)
    try {
      const docs = await documentService.getDocuments(inquiry.id, slug)
      setDocuments(docs)
    } catch (error) {
      console.error('Failed to load documents:', error)
      setDocuments([])
    } finally {
      setLoadingDocuments(false)
    }
  }

  const handleDownloadDocument = async (doc: InquiryDocument) => {
    const slug = serviceSlug || inquiry?.serviceType?.name
    if (!inquiry?.id || !slug) return
    
    try {
      const blob = await documentService.downloadDocument(
        inquiry.id,
        slug,
        doc.id
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.originalFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download document:', error)
      alert('Failed to download document')
    }
  }

  const handlePreviewDocument = (doc: InquiryDocument) => {
    const slug = serviceSlug || inquiry?.serviceType?.name
    if (!inquiry?.id || !slug) return
    
    const url = documentService.getPreviewUrl(
      inquiry.id,
      slug,
      doc.id
    )
    window.open(url, '_blank')
  }

  if (!inquiry) return null

  // Build field list from schema
  const fields: Array<[string, string]> = []
  
  for (const fieldDef of schema) {
    const value = getFieldValue(inquiry, fieldDef.key)
    
    // Skip if value is undefined, null, or empty string
    if (value === undefined || value === null || value === '') {
      continue
    }
    
    // Format value using schema formatter
    const formattedValue = fieldDef.format ? fieldDef.format(value) : String(value)
    
    // Skip if formatted value is empty
    if (!formattedValue) {
      continue
    }
    
    fields.push([fieldDef.label, formattedValue])
  }

  const getStatusBadge = (status: string) => {
    const config = STATUS_BADGE_CONFIG[status as InquiryStatus] || { variant: 'outline' as const, label: status }
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const canViewInvoice = inquiry.status === STATUS_QUOTED || inquiry.status === STATUS_COMPLETED

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Inquiry Details</SheetTitle>
          <SheetDescription>
            Information submitted for this inquiry
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Metadata Section */}
          <div className="space-y-3">
            {serviceLabel && (
              <div>
                <p className="text-sm text-muted-foreground">Service Type</p>
                <p className="font-medium">{serviceLabel}</p>
              </div>
            )}
            
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">{getStatusBadge(inquiry.status)}</div>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Submitted At</p>
              <p className="text-sm">{formatDate(inquiry.submittedAt)}</p>
            </div>

            {/* User information - only show for admin */}
            {isAdmin && (
              <div className="grid sm:grid-cols-2 gap-3">
                {inquiry.fullName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="text-sm">{inquiry.fullName}</p>
                  </div>
                )}

                {inquiry.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-sm">{inquiry.email}</p>
                  </div>
                )}

                {inquiry.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="text-sm">{inquiry.phone}</p>
                  </div>
                )}

                {inquiry.company && (
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="text-sm">{inquiry.company}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Schema-driven Fields Section */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Provided Details</h4>
            
            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground">No additional details provided</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {fields.map(([label, value]) => (
                  <div key={label} className="rounded-md border p-3 bg-muted/30">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {label}
                    </p>
                    <p className="text-sm mt-1 break-words">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attachments Section */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Attachments ({documents.length})
            </h4>
            
            {loadingDocuments ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-md">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileTextIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-sm">{doc.originalFileName}</div>
                        <div className="text-xs text-muted-foreground">
                          {(doc.fileSize / 1024).toFixed(1)} KB • {doc.documentType}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {(doc.mimeType === 'application/pdf' || doc.originalFileName.toLowerCase().endsWith('.pdf')) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePreviewDocument(doc)}
                          title="Preview PDF"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownloadDocument(doc)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No attachments</p>
            )}
          </div>

          <Separator />

          {/* Actions Section */}
          {showInvoiceButton && canViewInvoice && onViewInvoice && (
            <div className="flex justify-end gap-2">
              <Button
                variant="default"
                onClick={onViewInvoice}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                View Invoice
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
