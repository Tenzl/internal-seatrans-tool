import { useState } from 'react'
import { buildInvoiceQuoteData } from '@/modules/inquiries/components/common/buildInvoiceQuoteData'
import {
  buildEpdaPatchPayload,
  buildInternalCreatePayload,
  type ShippingAgencyAdminInquiry,
} from '@/modules/inquiries/components/common/epdaApiMappers'
import { extractParamsSnapshot } from '@/modules/inquiries/components/common/quoteParameters'
import type { EpdaParameterValues } from '@/modules/inquiries/services/epdaParametersService'
import { shippingAgencyEpdaService } from '@/modules/inquiries/services/shippingAgencyEpdaService'
import { toast } from '@/shared/utils/toast'
import { resolveIssuedLockedAt } from './epdaPersistenceRules'

export type EpdaPersistenceInput = Parameters<typeof buildEpdaPatchPayload>[0]

type UseEpdaPersistenceOptions = {
  linkedInquiryId: number | null | undefined
  customerUserId: number | null
  isLocked: boolean
  onCreated: (inquiryId: number) => void
  onIssued: (result: {
    saved: ShippingAgencyAdminInquiry
    lockedAt: string
    frozenParams: EpdaParameterValues | null
  }) => void
  onHistoryChanged: () => void
  onIssueComplete?: () => void
}

export function useEpdaPersistence({
  linkedInquiryId,
  customerUserId,
  isLocked,
  onCreated,
  onIssued,
  onHistoryChanged,
  onIssueComplete,
}: UseEpdaPersistenceOptions) {
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isIssuing, setIsIssuing] = useState(false)

  const saveDraft = async (
    input: EpdaPersistenceInput,
    isComplete: boolean
  ) => {
    setIsSavingDraft(true)
    try {
      const patchBody = buildEpdaPatchPayload(input)
      // Drafts stay on live tariff parameters; snapshots are created only on issue.
      patchBody.isComplete = isComplete

      if (linkedInquiryId) {
        await shippingAgencyEpdaService.updateEpda(linkedInquiryId, patchBody)
        toast.success(
          isComplete
            ? 'EPDA draft saved (Completed)'
            : 'EPDA draft saved (Processing)'
        )
        onHistoryChanged()
        return
      }

      if (!customerUserId || customerUserId < 1) {
        toast.error(
          'Could not determine the EPDA creator. Please sign in again.'
        )
        return
      }

      const created = await shippingAgencyEpdaService.createInternalInquiry({
        ...buildInternalCreatePayload(customerUserId, input),
        isComplete,
      })
      onCreated(created.id)
      toast.success(`Inquiry #${created.id} created with EPDA draft`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to save EPDA draft'
      )
    } finally {
      setIsSavingDraft(false)
    }
  }

  const issue = async (input: EpdaPersistenceInput) => {
    if (!linkedInquiryId) return

    setIsIssuing(true)
    try {
      const snapshot = buildInvoiceQuoteData(input) as unknown as Record<
        string,
        unknown
      >
      if (!isLocked) {
        await shippingAgencyEpdaService.updateEpda(
          linkedInquiryId,
          buildEpdaPatchPayload(input)
        )
      }
      const saved = await shippingAgencyEpdaService.issueEpda(
        linkedInquiryId,
        snapshot
      )
      onIssued({
        saved,
        lockedAt: resolveIssuedLockedAt(saved, new Date()),
        frozenParams: extractParamsSnapshot(snapshot),
      })
      toast.success('EPDA issued — customer can access the quote')
      onHistoryChanged()
      onIssueComplete?.()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to issue EPDA'
      )
    } finally {
      setIsIssuing(false)
    }
  }

  return {
    isSavingDraft,
    isIssuing,
    saveDraft,
    issue,
  }
}
