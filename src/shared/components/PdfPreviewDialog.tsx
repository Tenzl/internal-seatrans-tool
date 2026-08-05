'use client'

import { useRef, useState } from 'react'
import {
  downloadPdfBlobUrl,
  printPreviewIframe,
} from '@/shared/utils/epdaExport'
import { toast } from '@/shared/utils/toast'
import { Download, Loader2, Pencil, Printer, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface PdfPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  html?: string | null
  previewUrl?: string | null
  fileName: string
  isGenerating?: boolean
  onEdit?: () => void
  loadingLabel?: string
  /** Explicit action: download blob PDF vs browser-print HTML. */
  actionMode?: 'print' | 'download'
}

export function PdfPreviewDialog({
  open,
  onOpenChange,
  html = null,
  previewUrl = null,
  fileName,
  isGenerating = false,
  onEdit,
  loadingLabel = 'Building EPDA preview…',
  actionMode,
}: PdfPreviewDialogProps) {
  const [isExporting, setIsExporting] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  const showGenerating = isGenerating || (!html && !previewUrl)
  const isDownloadMode =
    actionMode === 'download' ||
    (actionMode !== 'print' && Boolean(previewUrl) && !html)

  const handlePrintPdf = async () => {
    if (!html && !previewUrl) return

    // Booking / transport: download the generated PDF immediately.
    if (isDownloadMode && previewUrl) {
      setIsExporting(true)
      try {
        await downloadPdfBlobUrl(previewUrl, fileName)
        onOpenChange(false)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to download PDF'
        )
      } finally {
        setIsExporting(false)
      }
      return
    }

    setIsExporting(true)
    try {
      const frame = iframeRef.current
      if (!frame) {
        toast.error('Preview is not ready yet. Please try again.')
        return
      }
      // EPDA HTML: keep iframe mounted until afterprint.
      await printPreviewIframe(frame)
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to open print dialog'
      )
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className='flex h-[92dvh] w-[96vw] max-w-7xl flex-col gap-0 p-0 sm:max-w-7xl'
      >
        <DialogHeader className='shrink-0 gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0'>
          <div className='min-w-0 flex-1 space-y-1'>
            <DialogTitle className='truncate'>{fileName}</DialogTitle>
            <DialogDescription className='text-xs text-muted-foreground'>
              {isDownloadMode
                ? 'Download will save the generated PDF to your device.'
                : 'Print will open the browser Save as PDF dialog.'}
            </DialogDescription>
          </div>
          <div className='flex shrink-0 items-center justify-end gap-2'>
            {onEdit ? (
              <Button
                size='sm'
                variant='outline'
                onClick={onEdit}
                className='gap-2'
              >
                <Pencil className='h-4 w-4' />
                Edit
              </Button>
            ) : null}
            {!showGenerating ? (
              <Button
                size='sm'
                onClick={handlePrintPdf}
                disabled={(isDownloadMode ? !previewUrl : !html) || isExporting}
                className='gap-2'
              >
                {isExporting ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : isDownloadMode ? (
                  <Download className='h-4 w-4' />
                ) : (
                  <Printer className='h-4 w-4' />
                )}
                {isDownloadMode ? 'Download PDF' : 'Print / Save PDF'}
              </Button>
            ) : null}
            <DialogClose asChild>
              <Button
                type='button'
                variant='outline'
                size='icon'
                className='h-9 w-9 shrink-0'
              >
                <X className='h-4 w-4' />
                <span className='sr-only'>Close</span>
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className='min-h-0 flex-1 overflow-hidden bg-muted'>
          {showGenerating ? (
            <div className='flex h-full flex-col items-center justify-center gap-3 p-12'>
              <Loader2 className='h-10 w-10 animate-spin text-primary' />
              <p className='text-sm text-muted-foreground'>{loadingLabel}</p>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              {...(html
                ? { srcDoc: html }
                : previewUrl
                  ? { src: previewUrl }
                  : { srcDoc: '' })}
              title={fileName}
              className='h-full w-full border-0 bg-white'
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
