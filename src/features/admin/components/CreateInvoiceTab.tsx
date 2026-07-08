"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { toast } from '@/shared/utils/toast'
import { Loader2, Eye, Save, Send, ArrowLeft, ArrowRight, Pencil, ChevronDown, ChevronUp } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { buildDashboardUrl } from '@/shared/utils/dashboardNavigation'
import { AdminSection } from '@/shared/components/layout/dashboard/admin'
import { renderQuoteHtml as renderQuoteHtmlHcm } from '@/modules/inquiries/components/common/Quote-hcm'
import { renderQuoteHtml as renderQuoteHtmlQn } from '@/modules/inquiries/components/common/Quote-qn'
import { commodityService, type CargoType, type CargoTypeCatalogItem, type Commodity } from '@/modules/gallery/services/commodityService'
import { serviceTypeService } from '@/modules/service-types/services/serviceTypeService'
import { portService, type Port as LogisticsPort } from '@/modules/logistics/services/portService'
import { PdfPreviewDialog } from '@/shared/components/PdfPreviewDialog'
import { delay, EPDA_PREVIEW_LOAD_DELAY_MS } from '@/shared/utils/epdaExport'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { CreateInvoiceQnForm } from '@/features/admin/components/invoice/CreateInvoiceQnForm'
import { CreateInvoiceHcmForm } from '@/features/admin/components/invoice/CreateInvoiceHcmForm'
import type { AgencyFeeModeOption } from '@/features/admin/components/invoice/CreateInvoiceVariantForm'
import {
  buildRequiredFields,
  getMissingRequiredFields,
  getRequiredFieldState,
  type RequiredFieldKey,
} from '@/features/admin/components/invoice/invoiceValidation'
import { buildInvoiceQuoteData } from '@/features/admin/components/invoice/buildInvoiceQuoteData'
import { EpdaFormSection, EpdaFormSkeleton, EpdaSectionRail, EPDA_SECTIONS, EPDA_CUSTOMER_SECTION, type EpdaSectionId } from '@/features/admin/components/invoice/EpdaFormLayout'
import {
  applyAdminInquiryToForm,
  buildEpdaPatchPayload,
  buildInternalCreatePayload,
  type ShippingAgencyAdminInquiry,
} from '@/features/admin/components/invoice/epda/epdaApiMappers'
import { inquiryService } from '@/modules/inquiries/services/inquiryService'
import { shippingAgencyEpdaService } from '@/modules/inquiries/services/shippingAgencyEpdaService'
import { authService } from '@/modules/auth/services/authService'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { EpdaInquiryMetaPanel } from '@/features/admin/components/invoice/epda/EpdaInquiryMetaPanel'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import { EpdaFieldChangeHistory } from '@/features/admin/components/invoice/epda/EpdaFieldChangeHistory'
import { findPortSelectionFromInquiry } from '@/modules/logistics/shippingAgencyPortCatalog'
import {
  legacyCargoTypeToCode,
  readInquiryCargoForEpda,
  SHIPPING_AGENCY_CARGO_TYPES,
  type InquiryCargoFields,
} from '@/modules/gallery/shippingAgencyCargoCatalog'
import {
  quoteFormFromArea,
  quoteFormFromStored,
} from '@/features/admin/components/invoice/epda/quoteFormFromArea'
import {
  DEFAULT_GARBAGE_CBM_AMOUNT,
  getDefaultGarbageUsdRate,
} from '@/features/admin/components/invoice/garbageFeeDefaults'
import { cn } from '@/shared/lib/utils'
import { PURPOSE_OF_CALLING_OPTIONS } from '@/modules/inquiries/constants/shippingAgencyInquiryOptions'
import {
  AREA_OPTIONS,
  SHIP_TYPE_OPTIONS,
  FRT_TAX_TYPE_OPTIONS,
  AGENCY_FEE_MODE_OPTIONS,
  QUARANTINE_CARGO_OPTIONS,
  DEFAULT_BERTH_HOURS,
  DEFAULT_ANCHORAGE_HOURS,
  DEFAULT_PILOTAGE_THIRD_MILES,
  DEFAULT_QN_PILOTAGE_MILES,
  defaultParameterValues,
} from '@/features/admin/components/invoice/epdaFormParameters'
import {
  epdaParametersService,
  type EpdaParameterValues,
} from '@/features/admin/services/epdaParametersService'
import { extractParamsSnapshot } from '@/modules/inquiries/components/common/quoteParameters'

type EpdaCargoType = CargoType

type AreaOption = (typeof AREA_OPTIONS)[number]['value']
const AREA_LABELS = Object.fromEntries(AREA_OPTIONS.map((item) => [item.value, item.label])) as Record<string, string>

const PURPOSE_OPTIONS = PURPOSE_OF_CALLING_OPTIONS
type PurposeOption = (typeof PURPOSE_OPTIONS)[number]['value']
type ShipTypeOption = (typeof SHIP_TYPE_OPTIONS)[number]['value']
type FrtTaxTypeOption = (typeof FRT_TAX_TYPE_OPTIONS)[number]['value']
type QuarantineCargoOption = (typeof QUARANTINE_CARGO_OPTIONS)[number]['value']

const isTallyFeeEligibleCargo = (value: string) => {
  // Bag/Pack and Equipment incur a tally fee; Bulk does not. Canonicalize first —
  // the current bag code IN_BAG_PACK does NOT contain the substring "IN_BAGS".
  const code = legacyCargoTypeToCode(value)
  return code === 'IN_BAG_PACK' || code === 'IN_EQUIPMENT'
}

const parseNumeric = (value: string) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

const normalizePurpose = (value: string) => value.trim().toUpperCase().replace(/[\s-]+/g, '_')

const canEnableFreightTaxByPurpose = (purpose: string) => {
  const normalized = normalizePurpose(purpose)
  return normalized === 'NHAP_XUAT' || normalized === 'CHUYEN_CANG_XUAT'
}

const getShipQuarantineTrips = (purpose: string) => {
  const normalized = normalizePurpose(purpose)
  if (normalized === 'NHAP_XUAT') return 2
  if (normalized === 'NHAP_CHUYEN_CANG' || normalized === 'CHUYEN_CANG_XUAT') return 1
  return 0
}

const getAreaLabel = (value: string) => AREA_LABELS[value] ?? value

const formatUsdAmount = (value: number) =>
  value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const normalizeFrtTaxType = (value: string) => value.trim().toUpperCase().replace(/[\s-]+/g, '_')

const isExportTotalAmountMode = (value: string) => {
  const normalized = normalizeFrtTaxType(value)
  return normalized === 'EXPORT_FREIGHT_RATE_DECLARATION'
}

const isExportPlsAdviseMode = (value: string) => normalizeFrtTaxType(value) === 'EXPORT_PLS_ADVISE'

const isImportFrtTaxType = (value: string) => normalizeFrtTaxType(value) === 'IMPORT'

/** EPDA change-history panel (full field audit). */
const CUSTOMER_FIELD_HISTORY_ENABLED = true

export type EpdaScreenFlow = 'create' | 'inquiry-detail'

export interface CreateInvoiceTabProps {
  /** When set, loads inquiry EPDA from API and saves drafts to this record. */
  inquiryId?: number
  /** `create` = Port Charge menu; `inquiry-detail` = opened from shipping agency inquiries. */
  flow?: EpdaScreenFlow
  /** View-only mode (inquiry detail dialog). */
  readOnly?: boolean
  /** Render without AdminSection chrome (inside a dialog). */
  embedded?: boolean
}

export function CreateInvoiceTab({
  inquiryId: inquiryIdProp,
  flow: flowProp,
  readOnly = false,
  embedded = false,
}: CreateInvoiceTabProps = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { t } = useI18n()
  const flow: EpdaScreenFlow =
    flowProp ??
    (searchParams.get('section') === 'shipping-agency-inquiry-detail' ? 'inquiry-detail' : 'create')
  const isInquiryDetailFlow = flow === 'inquiry-detail'
  const inquiryIdFromQuery = useMemo(() => {
    const raw = searchParams.get('inquiryId')
    if (!raw) return undefined
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
  }, [searchParams])

  const resolvedInquiryId = isInquiryDetailFlow
    ? inquiryIdProp ?? inquiryIdFromQuery
    : inquiryIdProp

  const formNavRef = useRef<HTMLDivElement | null>(null)
  const autoPreviewTriggeredRef = useRef(false)
  const [linkedInquiryId, setLinkedInquiryId] = useState<number | null>(resolvedInquiryId ?? null)
  const [customerUserId, setCustomerUserId] = useState<number | null>(null)
  const [customerLabel, setCustomerLabel] = useState<string | null>(null)
  const [isLoadingInquiry, setIsLoadingInquiry] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [isIssuing, setIsIssuing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [epdaExportName, setEpdaExportName] = useState<string>('EPDA.html')
  const [showPreview, setShowPreview] = useState(false)
  const [isPdfGenerating, setIsPdfGenerating] = useState(false)
  const [cargoTypeOptions, setCargoTypeOptions] = useState<CargoTypeCatalogItem[]>([])
  const [cargoTypeCatalog, setCargoTypeCatalog] = useState<Commodity[]>([])
  const [isLoadingCargoCatalog, setIsLoadingCargoCatalog] = useState(false)
  const [ports, setPorts] = useState<LogisticsPort[]>([])
  const [isLoadingPorts, setIsLoadingPorts] = useState(false)
  const pendingPortOfCallRef = useRef<string | null>(null)
  
  // Form fields
  const [formCreatedDate, setFormCreatedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [selectedArea, setSelectedArea] = useState<AreaOption | ''>('')
  const [loadedInquiryQuoteForm, setLoadedInquiryQuoteForm] = useState<'HCM' | 'QN' | null>(null)
  const [viewInquiryMeta, setViewInquiryMeta] = useState<ShippingAgencyAdminInquiry | null>(null)
  // Confirm dialog when saving a draft that still has empty required fields.
  const [incompleteSaveDialogOpen, setIncompleteSaveDialogOpen] = useState(false)
  const [fieldChangeHistoryKey, setFieldChangeHistoryKey] = useState(0)
  const [pendingInquiryCargo, setPendingInquiryCargo] = useState<InquiryCargoFields | null>(null)
  const [toShipowner, setToShipowner] = useState('')
  const [mv, setMv] = useState('')
  const [dwt, setDwt] = useState('')
  const [grt, setGrt] = useState('')
  const [loa, setLoa] = useState('')
  const [eta, setEta] = useState('')
  const [cargoType, setCargoType] = useState<EpdaCargoType | ''>('')
  const [cargoQty, setCargoQty] = useState('')
  const [cargoName, setCargoName] = useState('')
  const [frtTaxType, setFrtTaxType] = useState<FrtTaxTypeOption | ''>('')
  const [oceanFrtRateUsdPerMt, setOceanFrtRateUsdPerMt] = useState('')
  const [garbageUsdRate, setGarbageUsdRate] = useState(() => getDefaultGarbageUsdRate('HCM'))
  const [garbageCbmAmount, setGarbageCbmAmount] = useState(DEFAULT_GARBAGE_CBM_AMOUNT)
  const [purposeOfCalling, setPurposeOfCalling] = useState<PurposeOption | ''>('')
  const [shipType, setShipType] = useState<ShipTypeOption>('BULK_SHIP')
  const [port, setPort] = useState('')
  const [dischargeLoadingLocation, setDischargeLoadingLocation] = useState('')
  const [berthHours, setBerthHours] = useState(DEFAULT_BERTH_HOURS)
  const [anchorageHours, setAnchorageHours] = useState(DEFAULT_ANCHORAGE_HOURS)
  const [pilotageThirdMiles, setPilotageThirdMiles] = useState(DEFAULT_PILOTAGE_THIRD_MILES)
  const [qnPilotageMiles, setQnPilotageMiles] = useState(DEFAULT_QN_PILOTAGE_MILES)
  // Resolved EPDA parameters for the selected area/port (from backend, with fallback).
  const [effectiveParams, setEffectiveParams] = useState<EpdaParameterValues>(
    () => defaultParameterValues('HCM'),
  )
  // Frozen snapshot from a saved EPDA: when present, the quote uses these exact
  // values so the record is immune to later Parameter edits (view and edit alike).
  const [frozenParams, setFrozenParams] = useState<EpdaParameterValues | null>(null)
  const [boatHireAmount, setBoatHireAmount] = useState('')
  const [boatHireQuarantineAmount, setBoatHireQuarantineAmount] = useState('')
  const [tallyFeeAmount, setTallyFeeAmount] = useState('')
  const [tugAssistanceAmount, setTugAssistanceAmount] = useState('')
  const [transportLs, setTransportLs] = useState('')
  const [quarantineCargoMode, setQuarantineCargoMode] = useState<QuarantineCargoOption>('ONE_LEG')
  const [agencyFeeMode, setAgencyFeeMode] = useState<AgencyFeeModeOption>('TARRIF_AGENCY')
  const [agencyDiscountPercent, setAgencyDiscountPercent] = useState('')
  const [agencyLumpsumAmount, setAgencyLumpsumAmount] = useState('')
  const [activeSection, setActiveSection] = useState<EpdaSectionId>('epda-general')
  // Mobile only: collapse the Port area / Port of call pickers into a one-line
  // summary once both are chosen, so the pinned header stays compact.
  const [portPickerCollapsed, setPortPickerCollapsed] = useState(false)
  useEffect(() => {
    // Collapse once a port is picked; re-open automatically when the area
    // changes (which clears the port). Tapping "Change" expands it manually.
    setPortPickerCollapsed(Boolean(selectedArea && port))
  }, [selectedArea, port])

  // A brand-new EPDA (not opened from a customer inquiry) belongs to the signed-in
  // creator. There is no separate customer picker; the owner is the person creating it.
  const isNewEpdaFlow = !readOnly && !isInquiryDetailFlow && !linkedInquiryId

  useEffect(() => {
    if (!isNewEpdaFlow || customerUserId != null) return
    let cancelled = false
    const apply = (user: { id?: number; fullName?: string | null; email?: string } | null) => {
      if (cancelled || !user?.id) return
      setCustomerUserId(user.id)
      setCustomerLabel(user.fullName || user.email || `User #${user.id}`)
    }
    const me = authService.getUser()
    if (me?.id) apply(me)
    else void authService.getCurrentUser().then((res) => apply(res.data))
    return () => {
      cancelled = true
    }
  }, [isNewEpdaFlow, customerUserId])

  const getRequiredState = (value: string | null | undefined) => getRequiredFieldState(value, showValidationErrors)
  const canEnableFreightTaxDeclaration = useMemo(
    () => canEnableFreightTaxByPurpose(purposeOfCalling),
    [purposeOfCalling]
  )

  // A cargo type with NO cargo names (no commodities) is automatically "type only":
  // the Cargo Name field is disabled and the PDF shows just the cargo type.
  const cargoNameDisabled = useMemo(() => {
    if (!cargoType || isLoadingCargoCatalog) return false
    // Match on the canonical code so commodities tagged with legacy cargo-type
    // values (EQUIPMENT, IN_BAGS, BULK …) still map to the 3 fixed codes.
    return !cargoTypeCatalog.some((item) => legacyCargoTypeToCode(item.cargoType) === cargoType)
  }, [cargoType, cargoTypeCatalog, isLoadingCargoCatalog])

  // Above the highest tug band's Min LOA, the tug charge is negotiable → entered manually.
  const isLoaOverTugMax = useMemo(() => {
    const loaNum = parseNumeric(loa)
    const tiers = effectiveParams.tugTiers ?? []
    if (loaNum === null || !tiers.length) return false
    return loaNum >= Math.max(...tiers.map((tier) => tier.minLoa))
  }, [loa, effectiveParams])

  const requiredFields = useMemo(
    () =>
      buildRequiredFields({
        toShipowner,
        mv,
        dischargeLoadingLocation,
        dwt,
        grt,
        loa,
        cargoQty,
        cargoType,
        cargoName,
        purposeOfCalling,
        frtTaxType,
      }, { requireFrtTaxType: canEnableFreightTaxDeclaration, requireCargoName: !cargoNameDisabled }),
    [toShipowner, mv, dischargeLoadingLocation, dwt, grt, loa, cargoQty, cargoType, cargoName, purposeOfCalling, frtTaxType, cargoNameDisabled]
  )

  const missingRequiredFields = useMemo(
    () => getMissingRequiredFields(requiredFields),
    [requiredFields]
  )

  // On a failed submit, jump the rail to the first section that has a missing field.
  const focusFirstMissingSection = () => {
    const fieldSection: Record<RequiredFieldKey, EpdaSectionId> = {
      toShipowner: 'epda-general',
      mv: 'epda-general',
      dischargeLoadingLocation: 'epda-general',
      dwt: 'epda-general',
      grt: 'epda-general',
      loa: 'epda-general',
      cargoQty: 'epda-general',
      cargoType: 'epda-general',
      cargoName: 'epda-general',
      purposeOfCalling: 'epda-dues',
      frtTaxType: 'epda-dues',
    }
    const order: EpdaSectionId[] = ['epda-general', 'epda-dues', 'epda-agency']
    const target = order.find((sectionId) =>
      missingRequiredFields.some((field) => fieldSection[field.key] === sectionId),
    )
    if (target) setActiveSection(target)
  }

  const shipQuarantineFee = useMemo(() => {
    const grtValue = parseNumeric(grt)
    const trips = getShipQuarantineTrips(purposeOfCalling)
    if (!grtValue || trips <= 0) return 0
    const q = effectiveParams.quarantine
    const unitRate = grtValue >= q.shipThresholdGrt ? q.shipUnitHighGrt : q.shipUnitLowGrt
    return unitRate * trips
  }, [grt, purposeOfCalling, effectiveParams])

  const cargoQuarantineFee = useMemo(() => {
    const purposeNormalized = normalizePurpose(purposeOfCalling)
    if (purposeNormalized === 'MUC_DICH_KHAC') return 0

    const cargoQtyValue = parseNumeric(cargoQty)
    if (!cargoQtyValue || cargoQtyValue <= 0) return 0

    const trips =
      QUARANTINE_CARGO_OPTIONS.find((o) => o.value === quarantineCargoMode)?.trips ?? 1
    return effectiveParams.quarantine.cargoPerTrip * trips
  }, [cargoQty, purposeOfCalling, quarantineCargoMode, effectiveParams])

  useEffect(() => {
    const loadCargoTypeCatalog = async () => {
      try {
        setIsLoadingCargoCatalog(true)
        const serviceTypes = await serviceTypeService.getAllServiceTypes()
        const shippingAgency = serviceTypes.find((service) => {
          const normalized = (service.name || '').toUpperCase().replace(/[\s-]+/g, '_')
          return normalized === 'SHIPPING_AGENCY'
        })

        if (!shippingAgency?.id) {
          setCargoTypeOptions([])
          setCargoTypeCatalog([])
          toast.error('Shipping Agency service type not found')
          return
        }

        // Cargo TYPES are a fixed 3-value enum; only cargo NAMES come from the DB.
        const commodities = await commodityService.getCommoditiesByServiceType(shippingAgency.id)

        setCargoTypeOptions(SHIPPING_AGENCY_CARGO_TYPES)
        setCargoTypeCatalog(Array.isArray(commodities) ? commodities : [])
      } catch (error) {
        console.error('Failed to load cargo type catalog for EPDA:', error)
        toast.error('Failed to load cargo names from database')
        setCargoTypeOptions([])
        setCargoTypeCatalog([])
      } finally {
        setIsLoadingCargoCatalog(false)
      }
    }

    void loadCargoTypeCatalog()
  }, [])

  const quoteForm = useMemo<'HCM' | 'QN'>(() => {
    if (selectedArea) return quoteFormFromArea(selectedArea)
    if (loadedInquiryQuoteForm) return loadedInquiryQuoteForm
    return 'HCM'
  }, [selectedArea, loadedInquiryQuoteForm])

  // Resolve the area set (+ optional port override) from the backend; fall back
  // to the built-in defaults if the API/DB is unavailable.
  useEffect(() => {
    // A saved EPDA carries its own frozen parameters; never override them with live values.
    if (frozenParams) return
    if (!selectedArea) {
      setEffectiveParams(defaultParameterValues(quoteForm))
      return
    }
    // The port <Select> uses `portOfCall` as its value, so match on that (fall back to name).
    const target = (port ?? '').trim()
    const portId = target
      ? ports.find((p) => p.portOfCall?.trim() === target || p.name?.trim() === target)?.id
      : undefined
    let cancelled = false
    epdaParametersService
      .getEffective(selectedArea, portId)
      .then((v) => {
        if (!cancelled) setEffectiveParams(v)
      })
      .catch(() => {
        if (!cancelled) setEffectiveParams(defaultParameterValues(quoteForm))
      })
    return () => {
      cancelled = true
    }
  }, [selectedArea, port, ports, quoteForm, frozenParams])

  // Seed the editable fields from the resolved parameters (unless editing a saved inquiry).
  // Garbage uses the at-buoy rate when discharging/loading at anchorage, else the at-berth rate.
  useEffect(() => {
    if (linkedInquiryId) return
    const garbageRate =
      dischargeLoadingLocation === 'Anchorage'
        ? effectiveParams.garbage.atBuoyUsd
        : effectiveParams.garbage.atBerthUsd
    setGarbageUsdRate(String(garbageRate))
    setGarbageCbmAmount(String(effectiveParams.garbage.cbmAmount))
    setBerthHours(String(effectiveParams.hours.berthHours))
    setAnchorageHours(String(effectiveParams.hours.anchorageHours))
    setPilotageThirdMiles(String(effectiveParams.hours.pilotageThirdMiles))
    setQnPilotageMiles(String(effectiveParams.hours.qnPilotageMiles))
  }, [effectiveParams, linkedInquiryId, dischargeLoadingLocation])

  useEffect(() => {
    if (!selectedArea) {
      setPort('')
      setPorts([])
      return
    }

    const restorePort = pendingPortOfCallRef.current
    if (!restorePort) {
      setPort('')
    }

    let cancelled = false
    setIsLoadingPorts(true)
    void portService
      .getPortsByArea(selectedArea)
      .then((portData) => {
        if (!cancelled) {
          const list = Array.isArray(portData) ? portData : []
          setPorts(list)
          if (restorePort) {
            const matched = list.find((item) => item.portOfCall?.trim() === restorePort)
            setPort(matched?.portOfCall ?? restorePort)
            pendingPortOfCallRef.current = null
          }
        }
      })
      .catch((error) => {
        console.error('Failed to load ports for area:', error)
        if (!cancelled) {
          toast.error('Failed to load port list by area')
          setPorts([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingPorts(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [selectedArea])

  const portsByArea = useMemo(() => {
    if (!selectedArea) return []

    const areaPorts = ports
      .filter((item) => item.portOfCall?.trim())
      .sort((a, b) => (a.portOfCall || '').localeCompare(b.portOfCall || ''))

    const seen = new Set<string>()
    return areaPorts.filter((item) => {
      const value = item.portOfCall as string
      if (seen.has(value)) return false
      seen.add(value)
      return true
    })
  }, [ports, selectedArea])

  const filteredCargoNames = useMemo(() => {
    if (!cargoType) return []
    // Map each commodity's stored cargo type to the canonical code before matching,
    // so legacy variants (EQUIPMENT, IN_BAGS, BULK …) fall under the right fixed type.
    const base = cargoTypeCatalog.filter((item) => legacyCargoTypeToCode(item.cargoType) === cargoType)
    if (cargoName && !base.some((item) => item.name === cargoName)) {
      return [
        {
          id: 0,
          name: cargoName,
          displayName: cargoName,
          serviceTypeId: 0,
          requiredImageCount: 0,
          cargoType,
          isActive: true,
        },
        ...base,
      ]
    }
    return base
  }, [cargoType, cargoTypeCatalog, cargoName])

  useEffect(() => {
    if (!pendingInquiryCargo) return
    if (isLoadingCargoCatalog || cargoTypeCatalog.length === 0) return

    const { cargoType: mappedType, cargoName: mappedName } = readInquiryCargoForEpda(
      pendingInquiryCargo,
      cargoTypeCatalog,
    )
    if (mappedType) setCargoType(mappedType as EpdaCargoType)
    if (mappedName) setCargoName(mappedName)
    setPendingInquiryCargo(null)
  }, [pendingInquiryCargo, cargoTypeCatalog, isLoadingCargoCatalog])

  useEffect(() => {
    if (isLoadingCargoCatalog || pendingInquiryCargo) return
    if (!cargoType) {
      setCargoName('')
      return
    }

    const stillValid = filteredCargoNames.some((item) => item.name === cargoName)
    if (!stillValid && cargoName) return
    if (!stillValid) {
      setCargoName('')
    }
  }, [cargoType, cargoName, filteredCargoNames, isLoadingCargoCatalog, pendingInquiryCargo])

  useEffect(() => {
    if (cargoNameDisabled && cargoName) {
      setCargoName('')
    }
  }, [cargoNameDisabled, cargoName])

  useEffect(() => {
    if (!cargoType || !isTallyFeeEligibleCargo(cargoType)) {
      setTallyFeeAmount('')
    }
  }, [cargoType])

  useEffect(() => {
    if (!isLoaOverTugMax) setTugAssistanceAmount('')
  }, [isLoaOverTugMax])

  useEffect(() => {
    if (dischargeLoadingLocation !== 'Anchorage') {
      setBoatHireAmount('')
    }
  }, [dischargeLoadingLocation])

  useEffect(() => {
    if (agencyFeeMode === 'AGENCY_IN_LUMPSUM') {
      setTransportLs('')
      setBoatHireAmount('')
      return
    }

    setAgencyLumpsumAmount('')
  }, [agencyFeeMode])

  useEffect(() => {
    if (isLoadingCargoCatalog || pendingInquiryCargo) return
    if (!cargoType) return
    const stillValid = cargoTypeOptions.some((item) => item.code === cargoType)
    if (!stillValid) {
      setCargoType('')
    }
  }, [cargoType, cargoTypeOptions, isLoadingCargoCatalog, pendingInquiryCargo])

  useEffect(() => {
    if (!canEnableFreightTaxDeclaration) {
      setFrtTaxType('')
      setOceanFrtRateUsdPerMt('')
    }
  }, [canEnableFreightTaxDeclaration])

  useEffect(() => {
    if (!frtTaxType) {
      setOceanFrtRateUsdPerMt('')
      return
    }

    if (isImportFrtTaxType(frtTaxType)) {
      setOceanFrtRateUsdPerMt('')
      return
    }

    if (isExportPlsAdviseMode(frtTaxType)) {
      setOceanFrtRateUsdPerMt('')
    }
  }, [frtTaxType])

  const isFormBusy =
    isLoading || isLoadingCargoCatalog || isLoadingPorts || isSavingDraft || isIssuing || isLoadingInquiry

  const buildQuoteParamsInput = () => ({
    quoteForm,
    formCreatedDate,
    toShipowner,
    mv,
    dwt,
    grt,
    loa,
    eta,
    cargoQty,
    cargoName: cargoNameDisabled ? '' : cargoName,
    cargoType,
    cargoTypeOptions,
    filteredCargoNames,
    shipType,
    port,
    frtTaxType,
    shouldIncludeOceanFrtRate: isExportTotalAmountMode(frtTaxType),
    oceanFrtRateUsdPerMt,
    garbageUsdRate: garbageUsdRate || getDefaultGarbageUsdRate(quoteForm),
    garbageCbmAmount: garbageCbmAmount || DEFAULT_GARBAGE_CBM_AMOUNT,
    purposeOfCalling,
    dischargeLoadingLocation,
    transportLs,
    boatHireQuarantineAmount,
    quarantineCargoMode,
    quarantineCargoOptions: QUARANTINE_CARGO_OPTIONS,
    boatHireAmount,
    agencyFeeMode,
    agencyDiscountPercent,
    agencyLumpsumAmount,
    isTallyFeeEligible: Boolean(cargoType && isTallyFeeEligibleCargo(cargoType)),
    tallyFeeAmount,
    isLoaOverTugMax,
    tugAssistanceAmount,
    berthHours,
    buoyDueHours: quoteForm === 'HCM' && dischargeLoadingLocation === 'Anchorage' ? berthHours : '',
    anchorageHours,
    qnPilotageMiles,
    pilotageThirdMiles,
    params: effectiveParams,
  })

  const buildQuoteParams = () => buildInvoiceQuoteData(buildQuoteParamsInput())

  // "00 Order creator" section: show whenever we have a saved inquiry to describe,
  // for BOTH internal and external — it surfaces who created the order.
  const showCreatorSection = Boolean(viewInquiryMeta && linkedInquiryId)
  const showSaveDraftButton = !readOnly

  // Ordered section ids (matches the rail), used by the mobile Next / Done button.
  const orderedSectionIds = useMemo<EpdaSectionId[]>(() => {
    const ids = EPDA_SECTIONS.map((s) => s.id) as EpdaSectionId[]
    return showCreatorSection ? [EPDA_CUSTOMER_SECTION.id, ...ids] : ids
  }, [showCreatorSection])
  const activeSectionIndex = orderedSectionIds.indexOf(activeSection)
  const isLastSection = activeSectionIndex === orderedSectionIds.length - 1
  const goToNextSection = () => {
    const next = orderedSectionIds[activeSectionIndex + 1]
    if (next) {
      setActiveSection(next)
      // Bring the new section to the top, just under the pinned mobile header.
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    setLinkedInquiryId(resolvedInquiryId ?? null)
  }, [resolvedInquiryId])

  useEffect(() => {
    if (!linkedInquiryId) return

    // Allow auto-preview to fire again for each newly-loaded inquiry.
    autoPreviewTriggeredRef.current = false

    let cancelled = false
    const load = async () => {
      setIsLoadingInquiry(true)
      try {
        const inquiry = await inquiryService.getShippingAgencyDetail<ShippingAgencyAdminInquiry>(
          linkedInquiryId,
        )
        if (cancelled) return
        setViewInquiryMeta(inquiry)
        // Use the frozen parameter snapshot if the record has one (immune to later
        // Parameter edits); older records without a snapshot fall back to live values.
        const snap = extractParamsSnapshot(inquiry.epdaSnapshot)
        setFrozenParams(snap)
        if (snap) setEffectiveParams(snap)
        setLoadedInquiryQuoteForm(quoteFormFromStored(inquiry.quoteForm))
        setPendingInquiryCargo({
          cargoType: inquiry.cargoType,
          cargoName: inquiry.cargoName,
          cargoNameOther: inquiry.cargoNameOther,
        })
        applyAdminInquiryToForm(inquiry, {
          setFormCreatedDate,
          setToShipowner,
          setMv,
          setDwt,
          setGrt,
          setLoa,
          setEta,
          setCargoQty,
          setFrtTaxType: (v) => setFrtTaxType(v as FrtTaxTypeOption),
          setPort,
          setDischargeLoadingLocation,
          setPurposeOfCalling: (v) => setPurposeOfCalling(v as PurposeOption),
          setBerthHours,
          setAnchorageHours,
          setPilotageThirdMiles,
          setQnPilotageMiles,
          setShipType: (v) => setShipType(v as ShipTypeOption),
          setOceanFrtRateUsdPerMt,
          setGarbageUsdRate,
          setGarbageCbmAmount,
          setQuarantineCargoMode: (v) => setQuarantineCargoMode(v as QuarantineCargoOption),
          setAgencyFeeMode: (v) => setAgencyFeeMode(v as AgencyFeeModeOption),
          setAgencyDiscountPercent,
          setAgencyLumpsumAmount,
          setBoatHireAmount,
          setBoatHireQuarantineAmount,
          setTallyFeeAmount,
          setTugAssistanceAmount,
          setTransportLs,
        })
        if (inquiry.portOfCall?.trim()) {
          const selection = await findPortSelectionFromInquiry(inquiry.portOfCall)
          if (cancelled) return
          pendingPortOfCallRef.current = selection.portOfCall
          if (selection.area) {
            setSelectedArea(selection.area)
            setPorts(selection.ports)
          } else {
            setPort(selection.portOfCall)
            pendingPortOfCallRef.current = null
          }
        }
        if (inquiry.userId) {
          setCustomerUserId(inquiry.userId)
          const label =
            inquiry.fullName?.trim() ||
            inquiry.toName?.trim() ||
            (inquiry.company ? `${inquiry.toName ?? inquiry.fullName ?? 'Customer'} — ${inquiry.company}` : null)
          setCustomerLabel(label)
        }
      } catch (err) {
        console.error('Failed to load inquiry for EPDA:', err)
        toast.error('Could not load inquiry EPDA data')
      } finally {
        if (!cancelled) setIsLoadingInquiry(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [linkedInquiryId])

  const handleSaveDraft = async () => {
    setShowValidationErrors(true)
    const isComplete = missingRequiredFields.length === 0
    if (!isComplete) {
      // Incomplete drafts are allowed — they save as "Processing". Warn first.
      focusFirstMissingSection()
      setIncompleteSaveDialogOpen(true)
      return
    }
    await proceedSaveDraft(true)
  }

  // Continue the save flow after completeness is decided (complete = all required filled).
  const proceedSaveDraft = async (isComplete: boolean) => {
    await executeSaveDraft(isComplete)
  }

  const executeSaveDraft = async (
    isComplete = missingRequiredFields.length === 0,
  ) => {
    setIsSavingDraft(true)
    try {
      const input = buildQuoteParamsInput()
      const snapshot = buildInvoiceQuoteData(input) as unknown as Record<string, unknown>
      const patchBody = buildEpdaPatchPayload(input)
      patchBody.epdaSnapshot = snapshot
      patchBody.isComplete = isComplete

      if (linkedInquiryId) {
        await shippingAgencyEpdaService.updateEpda(linkedInquiryId, patchBody)
        toast.success(isComplete ? 'EPDA draft saved (Completed)' : 'EPDA draft saved (Processing)')
        setFieldChangeHistoryKey((key) => key + 1)
        return
      }

      if (!customerUserId || customerUserId < 1) {
        toast.error('Could not determine the EPDA creator. Please sign in again.')
        return
      }

      // Freeze the parameter set on the new record so it survives later Parameter edits.
      const created = await shippingAgencyEpdaService.createInternalInquiry({
        ...buildInternalCreatePayload(customerUserId, input),
        epdaSnapshot: snapshot,
        isComplete,
      })
      setLinkedInquiryId(created.id)
      toast.success(`Inquiry #${created.id} created with EPDA draft`)
    } catch (err) {
      console.error('Failed to save EPDA draft:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to save EPDA draft')
    } finally {
      setIsSavingDraft(false)
    }
  }

  const handleIssueToCustomer = async () => {
    if (!linkedInquiryId) {
      toast.error('Save a draft or link an inquiry before issuing to the customer.')
      return
    }

    setShowValidationErrors(true)
    if (missingRequiredFields.length > 0) {
      focusFirstMissingSection()
      toast.error('Complete required fields before issuing the EPDA.')
      return
    }

    await executeIssueToCustomer()
  }

  const executeIssueToCustomer = async () => {
    if (!linkedInquiryId) return

    setIsIssuing(true)
    try {
      const input = buildQuoteParamsInput()
      const snapshot = buildInvoiceQuoteData(input) as unknown as Record<string, unknown>
      const patchBody = buildEpdaPatchPayload(input)
      await shippingAgencyEpdaService.updateEpda(linkedInquiryId, patchBody)
      await shippingAgencyEpdaService.issueEpda(linkedInquiryId, snapshot)
      toast.success('EPDA issued — customer can access the quote')
      setFieldChangeHistoryKey((key) => key + 1)
    } catch (err) {
      console.error('Failed to issue EPDA:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to issue EPDA')
    } finally {
      setIsIssuing(false)
    }
  }

  const handlePreview = async () => {
    setShowValidationErrors(true)
    if (missingRequiredFields.length > 0) {
      focusFirstMissingSection()
      toast.error('Complete all required fields before previewing the EPDA.')
      return
    }

    setIsLoading(true)
    setIsPdfGenerating(true)
    setPreviewHtml(null)
    setShowPreview(true)

    try {
      const res = await fetch('/templates/quote.html')
      if (!res.ok) throw new Error('Template not found')
      const template = await res.text()

      const quoteData = buildQuoteParams()
      const renderer = quoteForm === 'QN' ? renderQuoteHtmlQn : renderQuoteHtmlHcm
      const html = renderer(template, quoteData)

      const filename = linkedInquiryId
        ? `EPDA_inquiry_${linkedInquiryId}.html`
        : `EPDA_${quoteForm}_${new Date().toISOString().slice(0, 10)}.html`

      setEpdaExportName(filename)

      await delay(EPDA_PREVIEW_LOAD_DELAY_MS)
      setPreviewHtml(html)
    } catch (err) {
      console.error('Failed to generate preview:', err)
      toast.error('Failed to generate invoice preview')
      setShowPreview(false)
    } finally {
      setIsPdfGenerating(false)
      setIsLoading(false)
    }
  }

  const handlePreviewOpenChange = (open: boolean) => {
    setShowPreview(open)
    if (!open) {
      setPreviewHtml(null)
      setIsPdfGenerating(false)
    }
  }

  // Auto-open the EPDA quote preview when arriving with `preview=1`
  // (set by "view detail" for Completed/Quoted inquiries). We're already in the
  // edit screen, so just pop the preview once all data has loaded.
  useEffect(() => {
    if (!isInquiryDetailFlow) return
    if (searchParams.get('preview') !== '1') return
    if (autoPreviewTriggeredRef.current) return
    if (isLoadingInquiry || isLoadingCargoCatalog || pendingInquiryCargo || !linkedInquiryId) return
    // Don't burn the trigger before the form is fully populated — cargo type/name
    // resolve a tick after loading flags clear, so wait until nothing is missing.
    if (missingRequiredFields.length > 0) return

    autoPreviewTriggeredRef.current = true
    void handlePreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInquiryDetailFlow, searchParams, isLoadingInquiry, isLoadingCargoCatalog, pendingInquiryCargo, linkedInquiryId, missingRequiredFields.length])

  const handleReset = () => {
    setShowValidationErrors(false)
    setSelectedArea('')
    setLoadedInquiryQuoteForm(null)
    setViewInquiryMeta(null)
    setPendingInquiryCargo(null)
    setFormCreatedDate(new Date().toISOString().split('T')[0])
    setToShipowner('')
    setMv('')
    setDwt('')
    setGrt('')
    setLoa('')
    setEta('')
    setCargoType('')
    setCargoQty('')
    setCargoName('')
    setFrtTaxType('')
    setOceanFrtRateUsdPerMt('')
    setGarbageUsdRate(getDefaultGarbageUsdRate(quoteForm))
    setGarbageCbmAmount(DEFAULT_GARBAGE_CBM_AMOUNT)
    setPurposeOfCalling('')
    setShipType('BULK_SHIP')
    setPort('')
    setDischargeLoadingLocation('')
    setBerthHours('96')
    setAnchorageHours('24')
    setPilotageThirdMiles('47')
    setQnPilotageMiles('5')
    setBoatHireAmount('')
    setBoatHireQuarantineAmount('')
    setTallyFeeAmount('')
    setTugAssistanceAmount('')
    setTransportLs('')
    setQuarantineCargoMode('ONE_LEG')
    setAgencyFeeMode('TARRIF_AGENCY')
    setAgencyDiscountPercent('')
    setAgencyLumpsumAmount('')
    setPreviewHtml(null)
    setShowPreview(false)
    setLinkedInquiryId(resolvedInquiryId ?? null)
    setCustomerUserId(null)
    setCustomerLabel(null)
  }

  const handleFormEnterNavigation = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return

    const target = event.target as HTMLElement | null
    if (!(target instanceof HTMLInputElement) || target.disabled || target.readOnly) return

    const container = formNavRef.current
    if (!container) return

    const focusableFields = Array.from(
      container.querySelectorAll<HTMLElement>(
        "input:not([type='hidden']):not([disabled]):not([readonly]), button#eta:not([disabled]), button[role='combobox']:not([disabled])"
      )
    )

    const currentIndex = focusableFields.indexOf(target)
    if (currentIndex < 0) return

    const nextField = focusableFields[currentIndex + 1]
    if (!nextField) return

    event.preventDefault()
    nextField.focus()
  }

  const formValues = {
    toShipowner,
    eta,
    mv,
    dischargeLoadingLocation,
    dwt,
    grt,
    loa,
    cargoQty,
    cargoType,
    cargoName,
    shipType,
    berthHours,
    anchorageHours,
    qnPilotageMiles,
    pilotageThirdMiles,
    garbageUsdRate: garbageUsdRate || getDefaultGarbageUsdRate(quoteForm),
    garbageCbmAmount: garbageCbmAmount || DEFAULT_GARBAGE_CBM_AMOUNT,
    purposeOfCalling,
    quarantineCargoMode,
    frtTaxType,
    tallyFeeAmount,
    tugAssistanceAmount,
    oceanFrtRateUsdPerMt,
    transportLs,
    boatHireAmount,
    boatHireQuarantineAmount,
    agencyFeeMode,
    agencyDiscountPercent,
    agencyLumpsumAmount,
  }

  const formHandlers = {
    setToShipowner,
    setEta,
    setMv,
    setDischargeLoadingLocation,
    setDwt,
    setGrt,
    setLoa,
    setCargoQty,
    // Manually switching cargo type clears the cargo name — names are type-specific,
    // and the synthetic fallback in filteredCargoNames would otherwise keep the stale
    // name "valid" (e.g. a Bulk WOOD_CHIPS lingering under Equipment).
    setCargoType: (value: CargoType) => {
      setCargoType(value as EpdaCargoType)
      setCargoName('')
    },
    setCargoName,
    setShipType: (value: 'BULK_SHIP' | 'TANKER_SHIP') => setShipType(value),
    setBerthHours,
    setAnchorageHours,
    setQnPilotageMiles,
    setPilotageThirdMiles,
    setGarbageUsdRate,
    setGarbageCbmAmount,
    setPurposeOfCalling: (value: PurposeOption) => setPurposeOfCalling(value),
    setQuarantineCargoMode: (value: QuarantineCargoOption) => setQuarantineCargoMode(value),
    setFrtTaxType: (value: FrtTaxTypeOption) => setFrtTaxType(value),
    setTallyFeeAmount,
    setTugAssistanceAmount,
    setOceanFrtRateUsdPerMt,
    setTransportLs,
    setBoatHireAmount,
    setBoatHireQuarantineAmount,
    setAgencyFeeMode: (value: AgencyFeeModeOption) => setAgencyFeeMode(value),
    setAgencyDiscountPercent,
    setAgencyLumpsumAmount,
  }

  const formOptions = {
    cargoTypeOptions,
    filteredCargoNames,
    shipTypeOptions: SHIP_TYPE_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
    purposeOptions: PURPOSE_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
    quarantineCargoOptions: QUARANTINE_CARGO_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
    frtTaxTypeOptions: FRT_TAX_TYPE_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
    agencyFeeModeOptions: AGENCY_FEE_MODE_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
  }

  const formComputed = {
    isLoadingCargoCatalog,
    cargoNameDisabled,
    isTallyFeeEligibleCargo: Boolean(cargoType && isTallyFeeEligibleCargo(cargoType)),
    isLoaOverTugMax,
    shipQuarantineFee: formatUsdAmount(shipQuarantineFee),
    cargoQuarantineFee: formatUsdAmount(cargoQuarantineFee),
    isImportFrtTaxType: isImportFrtTaxType(frtTaxType),
    isExportPlsAdviseMode: isExportPlsAdviseMode(frtTaxType),
    canEnableFreightTaxDeclaration,
    isOceanFreightInputDisabled: !canEnableFreightTaxDeclaration || isExportPlsAdviseMode(frtTaxType) || isImportFrtTaxType(frtTaxType),
    frtHint: !canEnableFreightTaxDeclaration
      ? 'N/A'
      : isImportFrtTaxType(frtTaxType)
      ? '0'
      : isExportPlsAdviseMode(frtTaxType)
        ? 'pls advise'
        : `Frt USD${oceanFrtRateUsdPerMt || '16'}/mt x abt ${cargoQty || '0'}mts x 2%`,
  }

  const editorActions = (
    <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap md:items-center md:justify-end">
      {CUSTOMER_FIELD_HISTORY_ENABLED && linkedInquiryId ? (
        <EpdaFieldChangeHistory inquiryId={linkedInquiryId} refreshKey={fieldChangeHistoryKey} />
      ) : null}
      <Button
        variant="outline"
        onClick={handleReset}
        disabled={isFormBusy}
        className="h-10 active:scale-[0.98] sm:h-9"
      >
        <span className="hidden sm:inline">{t('epda.reset')}</span>
        <span className="sm:hidden">{t('epda.resetShort')}</span>
      </Button>
      {showSaveDraftButton ? (
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isFormBusy}
          className="h-10 gap-2 active:scale-[0.98] sm:h-9"
        >
          {isSavingDraft ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{t('epda.saveDraft')}</span>
          <span className="sm:hidden">{t('epda.saveShort')}</span>
        </Button>
      ) : null}
      <Button
        variant="secondary"
        onClick={handleIssueToCustomer}
        disabled={isFormBusy || !linkedInquiryId}
        className="h-10 gap-2 active:scale-[0.98] sm:h-9"
      >
        {isIssuing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4 shrink-0" />
        )}
        <span className="hidden sm:inline">{t('epda.issue')}</span>
        <span className="sm:hidden">{t('epda.issueShort')}</span>
      </Button>
      <Button
        onClick={handlePreview}
        disabled={isFormBusy}
        className="col-span-2 h-10 gap-2 active:scale-[0.98] md:col-span-1 md:h-9"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="hidden sm:inline">{t('epda.generating')}</span>
            <span className="sm:hidden">{t('epda.loading')}</span>
          </>
        ) : (
          <>
            <Eye className="h-4 w-4" />
            {t('epda.preview')}
          </>
        )}
      </Button>
    </div>
  )

  const backToInquiries = isInquiryDetailFlow ? (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 mb-2 h-auto min-h-9 max-w-full gap-2 whitespace-normal py-2 text-left text-muted-foreground hover:text-foreground sm:whitespace-nowrap"
      onClick={() => router.push(buildDashboardUrl(pathname, 'shipping-agency-inquiries'))}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" />
      <span className="hidden sm:inline">Back to Shipping Agency Inquiries</span>
      <span className="sm:hidden">Back to inquiries</span>
    </Button>
  ) : null

  const epdaWorksheet = isInquiryDetailFlow && readOnly ? (
    <div className="flex min-h-[240px] items-center justify-center">
      {(isLoadingInquiry || isLoadingCargoCatalog) ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : null}
    </div>
  ) : (
    <div className="min-h-0">
      <div className="min-w-0 space-y-6 [&_[role=combobox]]:w-full">

        {isInquiryDetailFlow ? (
          <h2 className="text-3xl font-bold tracking-tight">{t('epda.editTitle')}</h2>
        ) : null}

        {backToInquiries}
        <div
          className={cn(
            'space-y-4',
            !embedded &&
              'sticky top-0 z-10 -mx-1 border-b border-border/60 bg-background/95 px-1 pb-4 pt-1 backdrop-blur-md supports-[backdrop-filter]:bg-background/80',
          )}
        >
          {isLoadingInquiry ? (
            <p className="text-xs text-muted-foreground">Loading inquiry EPDA...</p>
          ) : null}

          {/* Creator info now lives in the "00 Order creator" section below (both internal & external). */}

          {/* Inquiry badge (or creator) on the left, form actions pushed to the right — same row.
              The "edit history" button sits inside the action group, left of Reset form. */}
          {!linkedInquiryId ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-sm text-muted-foreground">{t('epda.creator')}</span>
                <Badge variant="secondary" className="text-sm font-medium">
                  {customerLabel || '—'}
                </Badge>
              </div>
              {editorActions}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge variant="outline" className="w-fit font-mono text-xs">
                {t('epda.inquiryNo', { id: linkedInquiryId })}
              </Badge>
              {editorActions}
            </div>
          )}

          {/* Mobile: one-line summary that toggles the pickers open/closed.
              Tap to edit (expand) → tap again to collapse. */}
          {selectedArea && port ? (
            <button
              type="button"
              onClick={() => setPortPickerCollapsed((v) => !v)}
              className="flex w-full items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-left lg:hidden"
            >
              <span className="min-w-0 truncate text-sm">
                <span className="text-muted-foreground">{getAreaLabel(selectedArea)}</span>
                <span className="mx-1.5 text-muted-foreground">·</span>
                <span className="font-medium">{port}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
                {portPickerCollapsed ? t('common.edit') : t('epda.collapse')}
                {portPickerCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </span>
            </button>
          ) : null}
          {(
            <div
              className={cn(
                'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
                portPickerCollapsed && selectedArea && port && 'hidden lg:grid',
              )}
            >
              <div className="grid gap-2">
                <Label htmlFor="portArea">{t('epda.portArea')}</Label>
                <Select value={selectedArea} onValueChange={(value) => setSelectedArea(value as AreaOption)}>
                  <SelectTrigger id="portArea">
                    <SelectValue placeholder={t('epda.selectArea')} />
                  </SelectTrigger>
                  <SelectContent>
                    {AREA_OPTIONS.map((area) => (
                      <SelectItem key={area.value} value={area.value}>
                        {area.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="portOfCallSelect">
                  {t('epda.portOfCall')}
                </Label>
                <Select value={port} onValueChange={setPort} disabled={!selectedArea || isLoadingPorts}>
                  <SelectTrigger id="portOfCallSelect">
                    <SelectValue
                      placeholder={
                        !selectedArea
                          ? t('epda.selectAreaFirst')
                          : isLoadingPorts
                            ? t('epda.loadingPorts')
                            : t('epda.selectPortOfCall')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {portsByArea.map((item) => (
                      <SelectItem key={item.id} value={item.portOfCall as string}>
                        {item.portOfCall}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Mobile: section rail pinned with the header so you can jump between
              sections without scrolling up. Desktop uses the rail in the grid below. */}
          {isInquiryDetailFlow || (selectedArea && port) ? (
            <EpdaSectionRail
              active={activeSection}
              onSelect={setActiveSection}
              includeCustomer={showCreatorSection}
              className="lg:hidden"
            />
          ) : null}

        </div>

        {!isInquiryDetailFlow && (!selectedArea || !port) ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-6 py-12 text-center">
            <p className="text-base font-medium">{t('epda.chooseStart')}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{t('epda.chooseStartHint')}</p>
          </div>
        ) : (
        <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
          <EpdaSectionRail
            active={activeSection}
            onSelect={setActiveSection}
            includeCustomer={showCreatorSection}
            className="hidden lg:block lg:sticky lg:top-36 lg:self-start"
          />

          <div
            ref={formNavRef}
            onKeyDownCapture={handleFormEnterNavigation}
            className="min-w-0 space-y-2 pb-6 [&_input]:font-medium [&_[role=combobox]]:font-medium"
          >
            {/* 00 — Order creator (both internal & external). */}
            {showCreatorSection && viewInquiryMeta ? (
              <EpdaFormSection
                id="epda-customer"
                title={t('epda.secCustomer')}
                activeId={activeSection}
              >
                <EpdaInquiryMetaPanel inquiry={viewInquiryMeta} showCustomerAccount />
              </EpdaFormSection>
            ) : null}

            {isLoadingCargoCatalog && !cargoTypeOptions.length ? (
              <EpdaFormSkeleton rows={4} />
            ) : null}

            {quoteForm === 'QN' ? (
              <CreateInvoiceQnForm
                values={formValues}
                handlers={formHandlers}
                options={formOptions}
                computed={formComputed}
                params={effectiveParams}
                activeSection={activeSection}
                getRequiredState={getRequiredState}
              />
            ) : (
              <CreateInvoiceHcmForm
                values={formValues}
                handlers={formHandlers}
                options={formOptions}
                computed={formComputed}
                params={effectiveParams}
                activeSection={activeSection}
                getRequiredState={getRequiredState}
              />
            )}

            {/* Mobile: advance through sections; "Done" on the last jumps back to
                the pinned header (Save / Issue / Preview live there). */}
            <div className="pt-2 lg:hidden">
              {isLastSection ? (
                <Button
                  type="button"
                  className="h-11 w-full active:scale-[0.98]"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  {t('epda.done')}
                </Button>
              ) : (
                <Button
                  type="button"
                  className="h-11 w-full gap-2 active:scale-[0.98]"
                  onClick={goToNextSection}
                >
                  {t('epda.next')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
        )}

        {!readOnly && showValidationErrors && missingRequiredFields.length > 0 ? (
          <p className="text-sm text-destructive" role="alert">
            {t('epda.requiredFields')}: {missingRequiredFields.map((field) => field.label).join(', ')}
          </p>
        ) : null}
      </div>
    </div>
  )

  const handleEditFromPreview = (isInquiryDetailFlow && readOnly && linkedInquiryId)
    ? () => {
        setShowPreview(false)
        const params = new URLSearchParams(searchParams.toString())
        params.set('mode', 'edit')
        router.push(`${pathname}?${params.toString()}`)
      }
    : undefined

  const pdfPreview = (
    <PdfPreviewDialog
      open={showPreview}
      onOpenChange={handlePreviewOpenChange}
      html={previewHtml}
      fileName={epdaExportName}
      isGenerating={isPdfGenerating}
      onEdit={handleEditFromPreview}
    />
  )

  if (embedded) {
    return (
      <>
        {epdaWorksheet}
        {pdfPreview}
      </>
    )
  }

  return (
    <>
      <AdminSection
        description={
          isInquiryDetailFlow ? undefined : linkedInquiryId ? (
            <>
              <span className="md:hidden">{t('epda.descEditShort', { id: linkedInquiryId })}</span>
              <span className="hidden md:inline">{t('epda.descEditLong', { id: linkedInquiryId })}</span>
            </>
          ) : (
            t('epda.descNew')
          )
        }
      >
        {epdaWorksheet}
      </AdminSection>
      {pdfPreview}
      <AlertDialog open={incompleteSaveDialogOpen} onOpenChange={setIncompleteSaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('epda.incompleteSaveTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('epda.incompleteSaveBody', { count: missingRequiredFields.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('epda.incompleteSaveCancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIncompleteSaveDialogOpen(false)
                void proceedSaveDraft(false)
              }}
            >
              {t('epda.incompleteSaveContinue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

