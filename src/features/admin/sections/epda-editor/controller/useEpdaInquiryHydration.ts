import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import type { Commodity } from '@/modules/gallery/services/commodityService'
import type { InquiryCargoFields } from '@/modules/gallery/shippingAgencyCargoCatalog'
import {
  applyAdminInquiryToForm,
  type ShippingAgencyAdminInquiry,
} from '@/modules/inquiries/components/common/epdaApiMappers'
import { quoteFormFromStored } from '@/modules/inquiries/components/common/quoteForm'
import { extractParamsSnapshot } from '@/modules/inquiries/components/common/quoteParameters'
import type { EpdaParameterValues } from '@/modules/inquiries/services/epdaParametersService'
import { inquiryService } from '@/modules/inquiries/services/inquiryService'
import { findPortSelectionFromInquiry } from '@/modules/logistics/shippingAgencyPortCatalog'
import { toast } from '@/shared/utils/toast'
import {
  isTallyFeeEligibleCargo,
  resolveInquiryCargo,
} from '@/features/admin/components/invoice/epda/epdaBusinessRules'
import { extractWorkingParams } from './epdaParameterDiff'
import type { EpdaQuoteForm } from './epdaPreviewRules'

type InquiryFormSetters = Parameters<typeof applyAdminInquiryToForm>[1]
type ShippingAgencyPortSelection = Awaited<
  ReturnType<typeof findPortSelectionFromInquiry>
>

export type EpdaInquiryHydrationBindings = {
  setInquiry: (inquiry: ShippingAgencyAdminInquiry) => void
  setLockedAt: (lockedAt: string | null) => void
  setFrozenParams: (params: EpdaParameterValues | null) => void
  setEffectiveParams: (params: EpdaParameterValues) => void
  setWorkingParams: (params: EpdaParameterValues | null) => void
  setQuoteForm: (quoteForm: EpdaQuoteForm) => void
  setCargoType: (cargoType: string) => void
  setCargoName: (cargoName: string) => void
  clearTallyFee: () => void
  setPendingCargo: (cargo: InquiryCargoFields | null) => void
  applyPortSelection: (selection: ShippingAgencyPortSelection) => void
  setCustomer: (userId: number, label: string | null) => void
  formSetters: InquiryFormSetters
}

type UseEpdaInquiryHydrationOptions = {
  inquiryId: number | null | undefined
  reloadKey: boolean
  autoPreviewTriggeredRef: MutableRefObject<boolean>
  cargoCatalogRef: MutableRefObject<Commodity[]>
  pendingCargoRef: MutableRefObject<InquiryCargoFields | null>
  pendingPortRef: MutableRefObject<string | null>
  bindings: EpdaInquiryHydrationBindings
}

export function useEpdaInquiryHydration({
  inquiryId,
  reloadKey,
  autoPreviewTriggeredRef,
  cargoCatalogRef,
  pendingCargoRef,
  pendingPortRef,
  bindings,
}: UseEpdaInquiryHydrationOptions) {
  const [isLoading, setIsLoading] = useState(false)
  const bindingsRef = useRef(bindings)

  useEffect(() => {
    bindingsRef.current = bindings
  }, [bindings])

  useEffect(() => {
    if (!inquiryId) return

    autoPreviewTriggeredRef.current = false
    let cancelled = false

    const hydrate = async () => {
      setIsLoading(true)
      try {
        const inquiry =
          await inquiryService.getShippingAgencyDetail<ShippingAgencyAdminInquiry>(
            inquiryId
          )
        if (cancelled) return

        const current = bindingsRef.current
        current.setInquiry(inquiry)

        // Locked records use their frozen tariff snapshot.
        // Unlocked drafts expose soft-snapshotted working params for Apply/Skip.
        const snapshot = extractParamsSnapshot(inquiry.epdaSnapshot)
        const working = extractWorkingParams(inquiry.epdaWorkingParams)
        const lockedAt = inquiry.epdaLockedAt
          ? String(inquiry.epdaLockedAt)
          : null
        current.setLockedAt(lockedAt)
        if (lockedAt && snapshot) {
          current.setFrozenParams(snapshot)
          current.setEffectiveParams(snapshot)
          current.setWorkingParams(null)
        } else {
          current.setFrozenParams(null)
          current.setWorkingParams(working)
          if (working) current.setEffectiveParams(working)
          else if (snapshot) current.setEffectiveParams(snapshot)
        }
        current.setQuoteForm(quoteFormFromStored(inquiry.quoteForm))

        hydrateCargo(inquiry, cargoCatalogRef, pendingCargoRef, current)

        if (inquiry.portId || inquiry.portOfCall?.trim()) {
          const selection = await findPortSelectionFromInquiry(
            inquiry.portOfCall,
            inquiry.portId
          )
          if (cancelled) return
          pendingPortRef.current = selection.portOfCall
          current.applyPortSelection(selection)
        }

        applyAdminInquiryToForm(inquiry, current.formSetters)
        if (inquiry.userId) {
          current.setCustomer(inquiry.userId, buildCustomerLabel(inquiry))
        }
      } catch {
        bindingsRef.current.setWorkingParams(null)
        toast.error('Could not load inquiry EPDA data')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void hydrate()
    return () => {
      cancelled = true
    }
  }, [
    inquiryId,
    reloadKey,
    autoPreviewTriggeredRef,
    cargoCatalogRef,
    pendingCargoRef,
    pendingPortRef,
  ])

  return isLoading
}

function hydrateCargo(
  inquiry: ShippingAgencyAdminInquiry,
  cargoCatalogRef: MutableRefObject<Commodity[]>,
  pendingCargoRef: MutableRefObject<InquiryCargoFields | null>,
  bindings: EpdaInquiryHydrationBindings
) {
  const inquiryCargo: InquiryCargoFields = {
    cargoType: inquiry.cargoType,
    cargoName: inquiry.cargoName,
    cargoNameOther: inquiry.cargoNameOther,
  }
  const catalog = cargoCatalogRef.current

  if (catalog.length > 0) {
    const resolved = resolveInquiryCargo(inquiryCargo, catalog)
    if (resolved.cargoType) bindings.setCargoType(resolved.cargoType)
    bindings.setCargoName(resolved.cargoName)
    if (!isTallyFeeEligibleCargo(resolved.cargoType)) {
      bindings.clearTallyFee()
    }
    pendingCargoRef.current = null
    bindings.setPendingCargo(null)
    return
  }

  pendingCargoRef.current = inquiryCargo
  bindings.setPendingCargo(inquiryCargo)
}

function buildCustomerLabel(inquiry: ShippingAgencyAdminInquiry) {
  return (
    inquiry.fullName?.trim() ||
    inquiry.toName?.trim() ||
    (inquiry.company
      ? `${inquiry.toName ?? inquiry.fullName ?? 'Customer'} — ${inquiry.company}`
      : null)
  )
}
