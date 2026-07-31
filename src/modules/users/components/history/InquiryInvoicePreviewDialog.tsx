import { QuotePreview } from '@/modules/inquiries/components/common/Quote-hcm'
import { FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { InquiryHistoryRecord } from './inquiryHistory.types'
import { resolveInquiryServiceLabel } from './inquiryHistoryRules'

type InquiryInvoicePreviewDialogProps = {
  inquiry: InquiryHistoryRecord | null
  serviceLabel?: string
  html: string | null
  isLoading: boolean
  onClose: () => void
}

export function InquiryInvoicePreviewDialog({
  inquiry,
  serviceLabel,
  html,
  isLoading,
  onClose,
}: InquiryInvoicePreviewDialogProps) {
  if (!inquiry) return null

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-4xl overflow-y-auto bg-background p-4 sm:p-6'>
        <DialogHeader>
          <DialogTitle>Invoice Preview</DialogTitle>
          <DialogDescription>
            Invoice for{' '}
            <span className='font-medium'>
              {resolveInquiryServiceLabel(inquiry, serviceLabel)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-3'>
          <div className='flex min-h-[50dvh] flex-col gap-4 sm:min-h-[70vh]'>
            <div className='min-h-[50dvh] flex-1 overflow-hidden rounded-md border bg-background sm:min-h-[70vh]'>
              {isLoading ? (
                <div className='flex h-full items-center justify-center bg-muted'>
                  <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                </div>
              ) : html ? (
                <QuotePreview html={html} />
              ) : (
                <div className='flex h-full items-center justify-center bg-muted text-muted-foreground'>
                  <FileText className='mr-2 h-10 w-10' />
                  No invoice available
                </div>
              )}
            </div>
          </div>

          {html && (
            <div className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
              <Button
                variant='outline'
                onClick={() => void printInvoiceHtml(html)}
                className='h-11 gap-2 active:scale-[0.98] sm:h-10'
              >
                <FileText className='h-4 w-4' />
                Save PDF
              </Button>
              <Button
                variant='secondary'
                onClick={onClose}
                className='h-11 active:scale-[0.98] sm:h-10'
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

async function printInvoiceHtml(html: string) {
  // Printing in an isolated iframe preserves the generated invoice document styles.
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = 'none'
  document.body.appendChild(iframe)

  const iframeDocument = iframe.contentWindow?.document
  if (!iframeDocument) {
    document.body.removeChild(iframe)
    return
  }

  iframeDocument.open()
  iframeDocument.write(html)
  iframeDocument.close()

  await new Promise((resolve) => setTimeout(resolve, 1000))
  iframe.contentWindow?.focus()
  iframe.contentWindow?.print()
  setTimeout(() => document.body.removeChild(iframe), 1000)
}
