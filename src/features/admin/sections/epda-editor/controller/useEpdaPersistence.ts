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
  onCreated: (inquiryId: number) => void
  onHistoryChanged: () => void
}

export function useEpdaPersistence({
  linkedInquiryId,
  onCreated,
  onHistoryChanged,
}: UseEpdaPersistenceOptions) {
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  const saveDraft = async (
    input: EpdaPersistenceInput,
    isComplete: boolean,
    options?: { successMessage?: string }
  ) => {
    setIsSavingDraft(true)
    try {
      const patchBody = buildEpdaPatchPayload(input)
      // Soft-snapshot the params currently pinned on the form (Apply or Skip).
      patchBody.epdaWorkingParams = input.params

      if (linkedInquiryId) {
        await shippingAgencyEpdaService.updateEpda(linkedInquiryId, patchBody)
        toast.success(
          options?.successMessage ??
            (isComplete
              ? 'EPDA draft saved (Completed)'
              : 'EPDA draft saved (Processing)')
        )
        onHistoryChanged()
        return
      }

      const created = await shippingAgencyEpdaService.createInternalInquiry({
        ...buildInternalCreatePayload(input),
      })
      onCreated(created.id)
      toast.success(
        options?.successMessage ??
          `Inquiry #${created.id} created with EPDA draft`
      )
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
