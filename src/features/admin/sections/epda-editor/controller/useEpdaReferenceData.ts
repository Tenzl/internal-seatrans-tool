import { useEffect, useMemo, useRef, useState } from 'react'
import {
  commodityService,
  type CargoType,
  type Commodity,
  type CommodityType,
} from '@/modules/gallery/services/commodityService'
import { type InquiryCargoFields } from '@/modules/gallery/shippingAgencyCargoCatalog'
import { quoteFormFromArea } from '@/modules/inquiries/components/common/quoteForm'
import {
  epdaParametersService,
  type EpdaParameterValues,
} from '@/modules/inquiries/services/epdaParametersService'
import {
  portService,
  type Port as LogisticsPort,
} from '@/modules/logistics/services/portService'
import { serviceTypeService } from '@/modules/service-types/services/serviceTypeService'
import { toast } from '@/shared/utils/toast'
import type { EpdaArea } from '@/features/admin/components/invoice/epda/EpdaPortSelector'
import {
  isTallyFeeEligibleCargo,
  resolveInquiryCargo,
} from '@/features/admin/components/invoice/epda/epdaBusinessRules'
import { defaultParameterValues } from '@/features/admin/components/invoice/epdaFormParameters'
import type { EpdaQuoteForm } from './epdaPreviewRules'
import {
  buildCargoNameOptions,
  buildCargoTypeOptions,
  buildPortOptions,
  findShippingAgencyServiceTypeId,
  resolveSelectedPortId,
  resolveEpdaTypeSnapshot,
} from './epdaReferenceDataRules'

type ReferenceDataBindings = {
  setCommodityTypeId: (commodityTypeId: number | null) => void
  setCargoType: (cargoType: CargoType) => void
  setCargoName: (cargoName: string) => void
  clearTallyFee: () => void
  setPort: (port: string) => void
  applyNewParameterDefaults: (params: EpdaParameterValues) => void
}

type UseEpdaReferenceDataOptions = {
  commodityTypeId: number | null
  cargoType: CargoType | ''
  cargoName: string
  port: string
  dischargeLoadingLocation: string
  linkedInquiryId: number | null | undefined
  bindings: ReferenceDataBindings
}

export function useEpdaReferenceData({
  commodityTypeId,
  cargoType,
  cargoName,
  port,
  dischargeLoadingLocation,
  linkedInquiryId,
  bindings,
}: UseEpdaReferenceDataOptions) {
  const [cargoTypeCatalog, setCargoTypeCatalog] = useState<CommodityType[]>([])
  const [cargoCatalog, setCargoCatalog] = useState<Commodity[]>([])
  const [isLoadingCargoCatalog, setIsLoadingCargoCatalog] = useState(false)
  const [ports, setPorts] = useState<LogisticsPort[]>([])
  const [selectedPortId, setSelectedPortId] = useState<number | null>(null)
  const [isLoadingPorts, setIsLoadingPorts] = useState(false)
  const [selectedArea, setSelectedArea] = useState<EpdaArea | ''>('')
  const [loadedInquiryQuoteForm, setLoadedInquiryQuoteForm] =
    useState<EpdaQuoteForm | null>(null)
  const [effectiveParams, setEffectiveParams] = useState<EpdaParameterValues>(
    () => defaultParameterValues('HCM')
  )
  const [frozenParams, setFrozenParams] = useState<EpdaParameterValues | null>(
    null
  )
  const [pendingInquiryCargo, setPendingInquiryCargo] =
    useState<InquiryCargoFields | null>(null)
  const cargoTypeCatalogRef = useRef<CommodityType[]>([])
  const cargoCatalogRef = useRef<Commodity[]>([])
  const pendingInquiryCargoRef = useRef<InquiryCargoFields | null>(null)
  const pendingPortOfCallRef = useRef<string | null>(null)
  const bindingsRef = useRef(bindings)

  useEffect(() => {
    bindingsRef.current = bindings
  }, [bindings])

  const quoteForm = useMemo<EpdaQuoteForm>(() => {
    if (selectedArea) return quoteFormFromArea(selectedArea)
    if (loadedInquiryQuoteForm) return loadedInquiryQuoteForm
    return 'HCM'
  }, [selectedArea, loadedInquiryQuoteForm])

  useEffect(() => {
    const loadCargoCatalog = async () => {
      try {
        setIsLoadingCargoCatalog(true)
        const serviceTypes = await serviceTypeService.getAllServiceTypes()
        const serviceTypeId = findShippingAgencyServiceTypeId(serviceTypes)
        if (!serviceTypeId) {
          setCargoTypeCatalog([])
          setCargoCatalog([])
          toast.error('Shipping Agency service type not found')
          return
        }

        const [types, commodities] = await Promise.all([
          commodityService.listCommodityTypes(serviceTypeId),
          commodityService.getCommoditiesByServiceType(serviceTypeId),
        ])
        const typeCatalog = Array.isArray(types) ? types : []
        const catalog = Array.isArray(commodities) ? commodities : []
        cargoTypeCatalogRef.current = typeCatalog
        cargoCatalogRef.current = catalog
        setCargoTypeCatalog(typeCatalog)
        setCargoCatalog(catalog)

        const pending = pendingInquiryCargoRef.current
        if (pending) {
          const resolved = resolveInquiryCargo(pending, catalog)
          bindingsRef.current.setCommodityTypeId(resolved.commodityTypeId)
          if (resolved.cargoType) {
            bindingsRef.current.setCargoType(
              resolveEpdaTypeSnapshot(
                typeCatalog,
                resolved.commodityTypeId,
                resolved.cargoType
              )
            )
          }
          bindingsRef.current.setCargoName(resolved.cargoName)
          if (!isTallyFeeEligibleCargo(resolved.cargoType)) {
            bindingsRef.current.clearTallyFee()
          }
          pendingInquiryCargoRef.current = null
          setPendingInquiryCargo(null)
        }
      } catch {
        toast.error('Failed to load cargo catalogs from database')
        setCargoTypeCatalog([])
        setCargoCatalog([])
      } finally {
        setIsLoadingCargoCatalog(false)
      }
    }

    void loadCargoCatalog()
  }, [])

  useEffect(() => {
    // Locked / Skip-pinned drafts stay on frozen params.
    // Linked unlocked drafts: live fetch is owned by Apply/Skip compare — do not
    // silently overwrite effectiveParams here.
    if (frozenParams || !selectedArea || isLoadingPorts || linkedInquiryId)
      return

    const portId = resolveSelectedPortId({
      selectedPortId,
      portName: port,
      ports,
    })
    let cancelled = false
    epdaParametersService
      .getEffective(portId ? undefined : selectedArea, portId)
      .then((params) => {
        if (cancelled) return
        setEffectiveParams(params)
        bindingsRef.current.applyNewParameterDefaults(params)
      })
      .catch((error) => {
        if (cancelled) return
        const detail = error instanceof Error ? error.message : 'Request failed'
        toast.error(
          `Could not load port tariff parameters (${detail}). Using built-in defaults.`
        )
        setEffectiveParams(defaultParameterValues(quoteForm))
      })
    return () => {
      cancelled = true
    }
  }, [
    selectedArea,
    selectedPortId,
    port,
    ports,
    quoteForm,
    frozenParams,
    isLoadingPorts,
    linkedInquiryId,
    dischargeLoadingLocation,
  ])

  useEffect(() => {
    if (!selectedArea) return

    const restorePort = pendingPortOfCallRef.current
    let cancelled = false
    void portService
      .getPortsByArea(selectedArea)
      .then((portData) => {
        if (cancelled) return
        const list = Array.isArray(portData) ? portData : []
        setPorts(list)
        if (restorePort) {
          const matched = list.find(
            (item) => item.portOfCall?.trim() === restorePort
          )
          bindingsRef.current.setPort(matched?.portOfCall ?? restorePort)
          setSelectedPortId((current) => current ?? matched?.id ?? null)
          pendingPortOfCallRef.current = null
        }
      })
      .catch(() => {
        if (!cancelled) {
          toast.error('Failed to load port list by area')
          setPorts([])
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPorts(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedArea])

  const selectArea = (area: EpdaArea) => {
    setSelectedPortId(null)
    setPorts([])
    setIsLoadingPorts(true)
    setSelectedArea(area)
  }

  const reset = () => {
    setSelectedArea('')
    setSelectedPortId(null)
    setPorts([])
    setIsLoadingPorts(false)
    setEffectiveParams(defaultParameterValues('HCM'))
    setLoadedInquiryQuoteForm(null)
    setPendingInquiryCargo(null)
    setFrozenParams(null)
  }

  const cargoTypeOptions = useMemo(
    () => buildCargoTypeOptions(cargoTypeCatalog, cargoType, commodityTypeId),
    [cargoTypeCatalog, cargoType, commodityTypeId]
  )

  return {
    cargoTypeOptions,
    cargoTypeCatalogRef,
    cargoCatalogRef,
    isLoadingCargoCatalog,
    pendingInquiryCargo,
    pendingInquiryCargoRef,
    pendingPortOfCallRef,
    ports,
    portOptions: selectedArea ? buildPortOptions(ports) : [],
    selectedPortId,
    setSelectedPortId,
    isLoadingPorts,
    selectedArea,
    setSelectedArea,
    setPorts,
    loadedInquiryQuoteForm,
    setLoadedInquiryQuoteForm,
    effectiveParams,
    setEffectiveParams,
    frozenParams,
    setFrozenParams,
    setPendingInquiryCargo,
    quoteForm,
    cargoNameDisabled: false,
    cargoNameOptions: buildCargoNameOptions(cargoCatalog, cargoName),
    selectArea,
    reset,
  }
}
