import { useState } from 'react'
import {
  buildEpdaPatchPayload,
  buildInternalCreatePayload,
} from '@/modules/inquiries/components/common/epdaApiMappers'
import { shippingAgencyEpdaService } from '@/modules/inquiries/services/shippingAgencyEpdaService'
import { toast } from '@/shared/utils/toast'

export type EpdaPersistenceInput = Parameters<typeof buildEpdaPatchPayload>[0]

type UseEpdaPersistenceOptions = {
  linkedInquiryId: number | null | undefined
  customerUserId: number | null
  onCreated: (inquiryId: number) => void
  onHistoryChanged: () => void
}

export function useEpdaPersistence({
  linkedInquiryId,
  customerUserId,
  onCreated,
  onHistoryChanged,
}: UseEpdaPersistenceOptions) {
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  const saveDraft = async (
    input: EpdaPersistenceInput,
    isComplete: boolean
  ) => {
    setIsSavingDraft(true)
    try {
      const patchBody = buildEpdaPatchPayload(input)
      // Soft-snapshot the params currently pinned on the form (Apply or Skip).
      patchBody.epdaWorkingParams = input.params
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
        epdaWorkingParams: input.params,
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

  return {
    isSavingDraft,
    saveDraft,
  }
}
