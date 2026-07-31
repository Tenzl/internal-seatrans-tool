import { useState } from 'react'
import {
  buildInvoiceQuoteData,
  type BuildInvoiceQuoteDataParams,
} from '@/modules/inquiries/components/common/buildInvoiceQuoteData'
import { renderQuoteHtmlForVariant } from '@/modules/inquiries/components/common/quoteVariantRenderer'
import {
  epdaParametersService,
  type EpdaParameterValues,
} from '@/modules/inquiries/services/epdaParametersService'
import { delay, EPDA_PREVIEW_LOAD_DELAY_MS } from '@/shared/utils/epdaExport'
import { toast } from '@/shared/utils/toast'
import type { EpdaArea } from '@/features/admin/components/invoice/epda/EpdaPortSelector'
import {
  buildEpdaExportFileName,
  shouldRefreshPreviewParameters,
  type EpdaQuoteForm,
} from './epdaPreviewRules'

type UseEpdaPreviewOptions = {
  quoteForm: EpdaQuoteForm
  linkedInquiryId: number | null | undefined
  selectedArea: EpdaArea | ''
  selectedPortId: number | null
  isLocked: boolean
  frozenParams: EpdaParameterValues | null
  effectiveParams: EpdaParameterValues
  buildQuoteInput: () => BuildInvoiceQuoteDataParams
  onEffectiveParamsChange: (params: EpdaParameterValues) => void
}

export function useEpdaPreview({
  quoteForm,
  linkedInquiryId,
  selectedArea,
  selectedPortId,
  isLocked,
  frozenParams,
  effectiveParams,
  buildQuoteInput,
  onEffectiveParamsChange,
}: UseEpdaPreviewOptions) {
  const [isLoading, setIsLoading] = useState(false)
  const [html, setHtml] = useState<string | null>(null)
  const [fileName, setFileName] = useState('EPDA.html')
  const [isOpen, setIsOpen] = useState(false)
  const [isPdfGenerating, setIsPdfGenerating] = useState(false)

  const generate = async () => {
    setIsLoading(true)
    setIsPdfGenerating(true)
    setHtml(null)
    setIsOpen(true)

    try {
      const response = await fetch('/templates/quote.html')
      if (!response.ok) throw new Error('Template not found')
      const template = await response.text()

      let paramsForQuote = effectiveParams
      if (
        shouldRefreshPreviewParameters({
          isLocked,
          hasFrozenParams: Boolean(frozenParams),
          hasSelectedArea: Boolean(selectedArea),
        })
      ) {
        try {
          paramsForQuote = await epdaParametersService.getEffective(
            selectedPortId ? undefined : selectedArea || undefined,
            selectedPortId ?? undefined
          )
          onEffectiveParamsChange(paramsForQuote)
        } catch (error) {
          const detail =
            error instanceof Error ? error.message : 'Request failed'
          toast.error(`Could not refresh port tariff parameters (${detail}).`)
        }
      }

      const quoteData = buildInvoiceQuoteData({
        ...buildQuoteInput(),
        params: paramsForQuote,
      })
      const previewHtml = renderQuoteHtmlForVariant(
        quoteForm,
        template,
        quoteData
      )
      setFileName(
        buildEpdaExportFileName({
          inquiryId: linkedInquiryId,
          quoteForm,
          date: new Date(),
        })
      )

      await delay(EPDA_PREVIEW_LOAD_DELAY_MS)
      setHtml(previewHtml)
    } catch {
      toast.error('Failed to generate invoice preview')
      setIsOpen(false)
    } finally {
      setIsPdfGenerating(false)
      setIsLoading(false)
    }
  }

  const setOpen = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      setHtml(null)
      setIsPdfGenerating(false)
    }
  }

  const reset = () => {
    setHtml(null)
    setIsOpen(false)
  }

  return {
    isLoading,
    html,
    fileName,
    isOpen,
    isPdfGenerating,
    generate,
    setOpen,
    reset,
  }
}
