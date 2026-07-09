"use client"

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, FileSpreadsheet, Pencil, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  AdminDataPanel,
  AdminSection,
  AdminToolbar,
  AdminToolbarGroup,
} from "@/shared/components/layout/dashboard/admin"
import { Checkbox } from "@/shared/components/ui/checkbox"
import { DataTablePagination } from "@/shared/components/ui/data-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import { PartnerImportDialog } from "@/features/admin/components/PartnerImportDialog"
import { useTableSortHeader } from "@/features/admin/hooks/useTableSortHeader"
import {
  PARTNERS_PAGE_SIZE,
  partnerManagementService,
} from "@/features/admin/services/partnerManagementService"
import type {
  ApproveStatus,
  BookingPartnerDetail,
  BookingPartnerListItem,
  BookingPartnerUpsertRequest,
  CustomerStatus,
  CustomerType,
  PartnerAdditionType,
  PartnerContact,
} from "@/features/admin/types/partnerManagement.types"
import { queryKeys } from "@/shared/config/react-query.config"
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue"
import { toast } from "@/shared/utils/toast"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ADDITION_TYPE_OPTIONS: PartnerAdditionType[] = [
  "CUSTOMER",
  "SHIPPER",
  "CONSIGNEE",
  "NOTIFY_PARTY",
  "CARRIER",
  "CO_LOADER",
  "AIR_LINE",
  "TRUCK_VENDOR",
  "OTHER_VENDORS",
]

const CUSTOMER_STATUS_OPTIONS: CustomerStatus[] = ["LEAD", "WINCLIENT"]
const CUSTOMER_TYPE_OPTIONS: CustomerType[] = ["AGENT", "DIRECT", "OTHER"]
const APPROVE_STATUS_OPTIONS: ApproveStatus[] = ["APPROVED", "PENDING", "REJECTED"]

const formatAdditionTypeLabel = (type: PartnerAdditionType): string =>
  type === "OTHER_VENDORS" ? "OTHER VENDOR" : type.replace(/_/g, " ")

// ---------------------------------------------------------------------------
// Dialog layout primitives
// ---------------------------------------------------------------------------

/** A titled, numbered group inside the partner dialog. */
function FormSection({
  step,
  title,
  description,
  action,
  children,
}: {
  step: number
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-semibold tabular-nums text-primary">
          {step}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold leading-none">{title}</h3>
          {description ? (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="rounded-lg border bg-muted/20 p-4">{children}</div>
    </section>
  )
}

/** A grid of evenly-sized form fields. */
function FieldGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  )
}

/** Label + control pair. Pass `wide` to span the full grid width. */
function Field({
  label,
  wide,
  children,
}: {
  label: string
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className={`space-y-1.5 ${wide ? "sm:col-span-2 lg:col-span-3 xl:col-span-4" : ""}`}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Form helpers
// ---------------------------------------------------------------------------

type FormState = {
  name: string
  customerId: string
  additionTypes: PartnerAdditionType[]
  country: string
  city: string
  contacts: PartnerContact[]
  phone: string
  fax: string
  trackingUrl: string
  address: string
  customerStatus: CustomerStatus | ""
  customerType: CustomerType | ""
  approveStatus: ApproveStatus | ""
  approveBy: string
  companyEstablishmentDate: string
  paymentDueDays: string
  contractNo: string
  taxNumber: string
  invoiceCompanyName: string
  invoiceCompanyAddress: string
  invoiceCompanyPhone: string
  invoiceCompanyEmail: string
  invoiceBankName: string
  invoiceBankBranch: string
  invoiceBankAccount: string
}

const emptyContact: PartnerContact = {
  person: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  title: "",
  dateOfBirth: "",
}

const initialFormState: FormState = {
  name: "",
  customerId: "",
  additionTypes: [],
  country: "",
  city: "",
  contacts: [],
  phone: "",
  fax: "",
  trackingUrl: "",
  address: "",
  customerStatus: "",
  customerType: "",
  approveStatus: "",
  approveBy: "",
  companyEstablishmentDate: "",
  paymentDueDays: "",
  contractNo: "",
  taxNumber: "",
  invoiceCompanyName: "",
  invoiceCompanyAddress: "",
  invoiceCompanyPhone: "",
  invoiceCompanyEmail: "",
  invoiceBankName: "",
  invoiceBankBranch: "",
  invoiceBankAccount: "",
}

const toUpsertRequest = (form: FormState): BookingPartnerUpsertRequest => {
  const paymentDue = form.paymentDueDays.trim()
  return {
    name: form.name,
    customerId: form.customerId || undefined,
    additionTypes: form.additionTypes,
    country: form.country || undefined,
    city: form.city || undefined,
    contacts: form.contacts,
    phone: form.phone || undefined,
    fax: form.fax || undefined,
    trackingUrl: form.trackingUrl || undefined,
    address: form.address || undefined,
    customerStatus: (form.customerStatus || undefined) as CustomerStatus | undefined,
    customerType: (form.customerType || undefined) as CustomerType | undefined,
    approveStatus: (form.approveStatus || undefined) as ApproveStatus | undefined,
    approveBy: form.approveBy || undefined,
    companyEstablishmentDate: form.companyEstablishmentDate || undefined,
    paymentDueDays: paymentDue ? Number(paymentDue) : undefined,
    contractNo: form.contractNo || undefined,
    taxNumber: form.taxNumber,
    invoiceCompanyName: form.invoiceCompanyName || undefined,
    invoiceCompanyAddress: form.invoiceCompanyAddress || undefined,
    invoiceCompanyPhone: form.invoiceCompanyPhone || undefined,
    invoiceCompanyEmail: form.invoiceCompanyEmail || undefined,
    invoiceBankName: form.invoiceBankName || undefined,
    invoiceBankBranch: form.invoiceBankBranch || undefined,
    invoiceBankAccount: form.invoiceBankAccount || undefined,
  }
}

const fromDetail = (detail: BookingPartnerDetail): FormState => ({
  name: detail.name || "",
  customerId: detail.customerId || "",
  additionTypes: detail.additionTypes || [],
  country: detail.country || "",
  city: detail.city || "",
  contacts: (detail.contacts || []).map((c) => ({ ...emptyContact, ...c })),
  phone: detail.phone || "",
  fax: detail.fax || "",
  trackingUrl: detail.trackingUrl || "",
  address: detail.address || "",
  customerStatus: (detail.customerStatus || "") as CustomerStatus | "",
  customerType: (detail.customerType || "") as CustomerType | "",
  approveStatus: (detail.approveStatus || "") as ApproveStatus | "",
  approveBy: detail.approveBy || "",
  companyEstablishmentDate: detail.companyEstablishmentDate || "",
  paymentDueDays: detail.paymentDueDays != null ? String(detail.paymentDueDays) : "",
  contractNo: detail.contractNo || "",
  taxNumber: detail.taxNumber || "",
  invoiceCompanyName: detail.invoiceCompanyName || "",
  invoiceCompanyAddress: detail.invoiceCompanyAddress || "",
  invoiceCompanyPhone: detail.invoiceCompanyPhone || "",
  invoiceCompanyEmail: detail.invoiceCompanyEmail || "",
  invoiceBankName: detail.invoiceBankName || "",
  invoiceBankBranch: detail.invoiceBankBranch || "",
  invoiceBankAccount: detail.invoiceBankAccount || "",
})

const MOBILE_PARTNER_COLUMN_HIDDEN: VisibilityState = {
  country: false,
  city: false,
  contacts: false,
  phone: false,
  fax: false,
  trackingUrl: false,
  customerType: false,
  taxNumber: false,
  approveStatus: false,
  updatedBy: false,
  updatedAt: false,
}

const getInitialPartnerColumnVisibility = (): VisibilityState => {
  const base: VisibilityState = {
    address: false,
    approveBy: false,
    companyEstablishmentDate: false,
    paymentDueDays: false,
    contractNo: false,
    invoiceCompanyName: false,
    invoiceCompanyAddress: false,
    invoiceCompanyPhone: false,
    invoiceCompanyEmail: false,
    invoiceBankName: false,
    invoiceBankBranch: false,
    invoiceBankAccount: false,
  }
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
    return { ...base, ...MOBILE_PARTNER_COLUMN_HIDDEN }
  }
  return base
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PartnerManagementTab() {
  const queryClient = useQueryClient()

  const [serverPage, setServerPage] = useState(0)
  const [partnerSearch, setPartnerSearch] = useState("")
  const debouncedSearch = useDebouncedValue(partnerSearch, 300)
  const [activeAdditionType, setActiveAdditionType] = useState<PartnerAdditionType | "ALL">("ALL")
  const [activeCustomerStatus, setActiveCustomerStatus] = useState<CustomerStatus | "ALL">("ALL")
  const [activeCustomerType, setActiveCustomerType] = useState<CustomerType | "ALL">("ALL")
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(getInitialPartnerColumnVisibility)
  const [sorting, setSorting] = useState<SortingState>([{ id: "updatedAt", desc: true }])

  const partnersListQueryKey = queryKeys.partnersList(
    serverPage,
    debouncedSearch,
    activeAdditionType,
    activeCustomerStatus,
    activeCustomerType,
  )

  const { data: partnersPage, isLoading: isPartnersLoading, isFetching } = useQuery({
    queryKey: partnersListQueryKey,
    queryFn: () =>
      partnerManagementService.list({
        page: serverPage,
        size: PARTNERS_PAGE_SIZE,
        sort: "updatedAt,desc",
        q: debouncedSearch.trim() || undefined,
        additionTypes:
          activeAdditionType === "ALL" ? undefined : [activeAdditionType],
        additionTypesMode: "OR",
        customerStatus: activeCustomerStatus === "ALL" ? undefined : activeCustomerStatus,
        customerType: activeCustomerType === "ALL" ? undefined : activeCustomerType,
        includeArchived: false,
      }),
  })

  const rows = partnersPage?.content ?? []
  const totalElements = partnersPage?.totalElements ?? 0
  const serverPageCount = Math.max(1, partnersPage?.totalPages ?? 1)
  const loading = isPartnersLoading || isFetching

  const invalidatePartnersList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.partnersListPrefix() })
  }, [queryClient])

  useEffect(() => {
    setServerPage(0)
  }, [debouncedSearch, activeAdditionType, activeCustomerStatus, activeCustomerType])

  // Dialog / form state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const renderSortableHeader = useTableSortHeader<BookingPartnerListItem>()
  const [form, setForm] = useState<FormState>(initialFormState)

  // ---------------------------------------------------------------------------
  // CRUD handlers
  // ---------------------------------------------------------------------------

  const onOpenCreate = () => {
    setEditingId(null)
    setForm(initialFormState)
    setDialogOpen(true)
  }

  const onOpenEdit = async (id: number) => {
    try {
      const detail = await partnerManagementService.detail(id)
      setEditingId(id)
      setForm(fromDetail(detail))
      setDialogOpen(true)
    } catch (error) {
      toast.error("Failed to load partner detail", error)
    }
  }

  const onToggleAdditionType = (type: PartnerAdditionType, checked: boolean) => {
    setForm((prev) => ({
      ...prev,
      additionTypes: checked
        ? [...prev.additionTypes, type]
        : prev.additionTypes.filter((item) => item !== type),
    }))
  }

  const addContact = () =>
    setForm((prev) => ({ ...prev, contacts: [...prev.contacts, { ...emptyContact }] }))

  const removeContact = (index: number) =>
    setForm((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== index),
    }))

  const updateContact = (index: number, field: keyof PartnerContact, value: string) =>
    setForm((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    }))

  const validateForm = (): string | null => {
    if (!form.name.trim()) return "Name is required"
    // additionTypes is optional: a partner may have zero or many.
    return null
  }

  const onSave = async () => {
    const validationMessage = validateForm()
    if (validationMessage) {
      toast.error(validationMessage)
      return
    }

    try {
      setSaving(true)
      const payload = toUpsertRequest(form)
      if (editingId) {
        await partnerManagementService.update(editingId, payload)
        toast.success("Partner updated successfully")
      } else {
        await partnerManagementService.create(payload)
        toast.success("Partner created successfully")
      }
      invalidatePartnersList()
      setDialogOpen(false)
      setForm(initialFormState)
      setEditingId(null)
    } catch (error) {
      toast.error("Failed to save partner", error)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id: number) => {
    if (!confirm("Delete this partner?")) return
    try {
      await partnerManagementService.delete(id)
      invalidatePartnersList()
      toast.success("Partner deleted successfully")
    } catch (error) {
      toast.error("Failed to delete partner", error)
    }
  }

  const onDeleteAll = async () => {
    if (totalElements === 0) {
      toast.info?.("No partners to delete")
      return
    }
    if (
      !confirm(
        `Delete ALL ${totalElements} partners (and their shipping settings)?\n` +
          `This cannot be undone — use it to clear before importing a fresh dataset.`,
      )
    )
      return
    try {
      const { deleted } = await partnerManagementService.deleteAll()
      setServerPage(0)
      invalidatePartnersList()
      toast.success(`Deleted all ${deleted} partner(s)`)
    } catch (error) {
      toast.error("Failed to delete all partners", error)
    }
  }

  // ---------------------------------------------------------------------------
  // Column definitions
  // ---------------------------------------------------------------------------

  const columns = useMemo<ColumnDef<BookingPartnerListItem>[]>(
    () => [
      {
        accessorKey: "name",
        header: renderSortableHeader("Name"),
        cell: ({ row }) => (
          <span className="font-medium block truncate w-full" title={row.original.name}>
            {row.original.name}
          </span>
        ),
      },
      {
        accessorKey: "customerId",
        header: renderSortableHeader("Customer ID"),
      },
      {
        accessorKey: "additionTypes",
        header: "Additional Types",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.additionTypes?.map((type) => (
              <Badge key={type} variant="outline" className="text-xs">
                {formatAdditionTypeLabel(type)}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        accessorKey: "country",
        header: renderSortableHeader("Country"),
      },
      {
        accessorKey: "city",
        header: renderSortableHeader("City"),
      },
      {
        accessorKey: "contacts",
        header: "Contacts",
        enableSorting: false,
        cell: ({ row }) => {
          const contacts = row.original.contacts ?? []
          if (!contacts.length) return "-"
          const first = contacts[0]
          const label =
            first.person?.trim() ||
            [first.firstName, first.lastName].filter(Boolean).join(" ") ||
            first.email ||
            "Contact"
          return (
            <div className="flex flex-col leading-tight">
              <span className="font-medium">{label}</span>
              {first.email ? (
                <span className="text-xs text-muted-foreground">{first.email}</span>
              ) : null}
              {contacts.length > 1 ? (
                <span className="text-xs text-muted-foreground">+{contacts.length - 1} more</span>
              ) : null}
            </div>
          )
        },
      },
      { accessorKey: "phone", header: "Phone", enableSorting: false },
      { accessorKey: "fax", header: "Fax", enableSorting: false },
      { accessorKey: "trackingUrl", header: "Tracking URL", enableSorting: false },
      { accessorKey: "address", header: "Address", enableSorting: false },
      {
        accessorKey: "customerStatus",
        header: renderSortableHeader("Customer Status"),
        cell: ({ row }) =>
          row.original.customerStatus ? <Badge>{row.original.customerStatus}</Badge> : "-",
      },
      {
        accessorKey: "customerType",
        header: renderSortableHeader("Customer Type"),
      },
      {
        accessorKey: "taxNumber",
        header: renderSortableHeader("Tax Number"),
      },
      {
        accessorKey: "approveStatus",
        header: "Approve Status",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.approveStatus ? (
            <Badge variant="outline">{row.original.approveStatus}</Badge>
          ) : (
            "-"
          ),
      },
      { accessorKey: "approveBy", header: "Approve By", enableSorting: false },
      {
        accessorKey: "companyEstablishmentDate",
        header: "Company Establishment",
        enableSorting: false,
        cell: ({ row }) => row.original.companyEstablishmentDate || "-",
      },
      {
        accessorKey: "paymentDueDays",
        header: "Payment Due (Days)",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.paymentDueDays != null ? row.original.paymentDueDays : "-",
      },
      { accessorKey: "contractNo", header: "Contract No.", enableSorting: false },
      { accessorKey: "invoiceCompanyName", header: "Invoice Company Name", enableSorting: false },
      { accessorKey: "invoiceCompanyAddress", header: "Invoice Company Address", enableSorting: false },
      { accessorKey: "invoiceCompanyPhone", header: "Invoice Company Phone", enableSorting: false },
      { accessorKey: "invoiceCompanyEmail", header: "Invoice Company Email", enableSorting: false },
      { accessorKey: "invoiceBankName", header: "Invoice Bank Name", enableSorting: false },
      { accessorKey: "invoiceBankBranch", header: "Invoice Bank Branch", enableSorting: false },
      { accessorKey: "invoiceBankAccount", header: "Invoice Bank Account", enableSorting: false },
      { accessorKey: "updatedBy", header: "Updated By", enableSorting: false },
      {
        accessorKey: "updatedAt",
        header: renderSortableHeader("Updated At"),
        cell: ({ row }) =>
          row.original.updatedAt
            ? new Date(row.original.updatedAt).toLocaleDateString("en-CA")
            : "-",
      },
      { accessorKey: "createdBy", header: "Created By", enableSorting: false },
      {
        accessorKey: "createdAt",
        header: renderSortableHeader("Created On"),
        cell: ({ row }) =>
          row.original.createdAt
            ? new Date(row.original.createdAt).toLocaleDateString("en-CA")
            : "-",
      },
      {
        id: "actions",
        header: "Actions",
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-0.5">
            <Button size="sm" variant="outline" onClick={() => onOpenEdit(row.original.id)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => onDelete(row.original.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  // ---------------------------------------------------------------------------
  // Table instance
  // ---------------------------------------------------------------------------

  const table = useReactTable({
    data: rows,
    columns,
    manualPagination: true,
    rowCount: totalElements,
    pageCount: serverPageCount,
    state: {
      sorting,
      columnVisibility,
      pagination: { pageIndex: serverPage, pageSize: PARTNERS_PAGE_SIZE },
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      setServerPage((prev) => {
        const next = functionalUpdate(updater, {
          pageIndex: prev,
          pageSize: PARTNERS_PAGE_SIZE,
        })
        return next.pageIndex
      })
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    autoResetPageIndex: false,
  })

  const tableTitle = partnerSearch.trim()
    ? `${totalElements} result${totalElements === 1 ? "" : "s"}`
    : `All Partners (${totalElements})`

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
    <AdminSection
      description="Partner profiles for booking. Search and filters run on the server; 20 records per page."
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteAll}
            disabled={totalElements === 0}
            className="gap-2 text-destructive transition-transform hover:text-destructive active:scale-[0.98]"
          >
            <Trash2 className="h-4 w-4" />
            Delete all
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportDialogOpen(true)}
            className="gap-2 transition-transform active:scale-[0.98]"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Import
          </Button>
          <Button
            size="sm"
            onClick={onOpenCreate}
            className="gap-2 transition-transform active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            Add partner
          </Button>
        </>
      }
      toolbar={
        <div className="space-y-3">
          <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Button
              className="h-8 shrink-0 px-2.5 text-[11px] font-medium"
              variant={activeAdditionType === "ALL" ? "default" : "outline"}
              onClick={() => setActiveAdditionType("ALL")}
            >
              All types
            </Button>
            {ADDITION_TYPE_OPTIONS.map((type) => (
              <Button
                key={type}
                className="h-8 shrink-0 px-2.5 text-[11px] font-medium"
                variant={activeAdditionType === type ? "default" : "outline"}
                onClick={() => setActiveAdditionType(type)}
              >
                {formatAdditionTypeLabel(type)}
              </Button>
            ))}
          </div>
          <AdminToolbar>
            <AdminToolbarGroup>
              <Input
                placeholder="Name, customer ID, or tax number"
                value={partnerSearch}
                onChange={(e) => setPartnerSearch(e.target.value)}
                className="h-9 w-full md:w-[300px]"
              />
              {partnerSearch.trim() ? (
                <Button variant="ghost" size="sm" onClick={() => setPartnerSearch("")}>
                  Clear
                </Button>
              ) : null}
              <Select
                value={activeCustomerStatus}
                onValueChange={(v) => setActiveCustomerStatus(v as CustomerStatus | "ALL")}
              >
                <SelectTrigger className="h-9 w-full md:w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All status</SelectItem>
                  {CUSTOMER_STATUS_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={activeCustomerType}
                onValueChange={(v) => setActiveCustomerType(v as CustomerType | "ALL")}
              >
                <SelectTrigger className="h-9 w-full md:w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  {CUSTOMER_TYPE_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>{item}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </AdminToolbarGroup>
            <AdminToolbarGroup align="end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    Columns <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {table.getAllColumns().filter((c) => c.getCanHide()).map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </AdminToolbarGroup>
          </AdminToolbar>
        </div>
      }
    >
      <AdminDataPanel
        meta={tableTitle}
        loading={loading && rows.length === 0}
        empty={!loading && rows.length === 0}
        emptyMessage="No partners match your filters. Adjust search or type filters and try again."
      >
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 z-20 bg-background">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isActions = header.column.id === "actions"
                    return (
                      <TableHead
                        key={header.id}
                        className={`bg-background whitespace-nowrap${
                          isActions ? " sticky right-0 z-30 border-l shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.15)]" : ""
                        }`}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="group">
                    {row.getVisibleCells().map((cell) => {
                      const isActions = cell.column.id === "actions"
                      return (
                        <TableCell
                          key={cell.id}
                          className={`whitespace-nowrap align-top${
                            isActions
                              ? " sticky right-0 z-10 border-l bg-background shadow-[-6px_0_6px_-6px_rgba(0,0,0,0.15)] group-hover:bg-muted/50"
                              : ""
                          }`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No partners found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination
          table={table}
          persistKey="partners-page"
          totalRowCount={totalElements}
          isFetching={loading && rows.length > 0}
        />
      </AdminDataPanel>
    </AdminSection>

    {/* Create / Edit dialog */}
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl sm:max-w-[min(96vw,84rem)]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit partner" : "Create partner"}</DialogTitle>
            <DialogDescription>
              Leave Customer ID blank to auto-generate; it cannot be changed after creation.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[72vh] space-y-6 overflow-y-auto px-1 pb-2">
            {/* 1 — Identity */}
            <FormSection
              step={1}
              title="Identity"
              description="Name and what roles this partner plays."
            >
              <FieldGrid>
                <Field label="Name *">
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </Field>
                <Field label="Customer ID">
                  <Input
                    value={form.customerId}
                    disabled={editingId != null}
                    placeholder={editingId != null ? undefined : "Auto-generated if blank"}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, customerId: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Additional types" wide>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {ADDITION_TYPE_OPTIONS.map((type) => (
                      <label key={type} className="inline-flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={form.additionTypes.includes(type)}
                          onCheckedChange={(state) => onToggleAdditionType(type, state === true)}
                        />
                        {formatAdditionTypeLabel(type)}
                      </label>
                    ))}
                  </div>
                </Field>
              </FieldGrid>
            </FormSection>

            {/* 2 — Classification & approval */}
            <FormSection step={2} title="Classification & approval">
              <FieldGrid>
                <Field label="Customer status">
                  <Select
                    value={form.customerStatus || "NONE"}
                    onValueChange={(v) =>
                      setForm((prev) => ({
                        ...prev,
                        customerStatus: v === "NONE" ? "" : (v as CustomerStatus),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      {CUSTOMER_STATUS_OPTIONS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Customer type">
                  <Select
                    value={form.customerType || "NONE"}
                    onValueChange={(v) =>
                      setForm((prev) => ({
                        ...prev,
                        customerType: v === "NONE" ? "" : (v as CustomerType),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      {CUSTOMER_TYPE_OPTIONS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Approve status">
                  <Select
                    value={form.approveStatus || "NONE"}
                    onValueChange={(v) =>
                      setForm((prev) => ({
                        ...prev,
                        approveStatus: v === "NONE" ? "" : (v as ApproveStatus),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None</SelectItem>
                      {APPROVE_STATUS_OPTIONS.map((item) => (
                        <SelectItem key={item} value={item}>
                          {item}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Approve by">
                  <Input
                    value={form.approveBy}
                    onChange={(e) => setForm((prev) => ({ ...prev, approveBy: e.target.value }))}
                  />
                </Field>
              </FieldGrid>
            </FormSection>

            {/* 3 — Contact persons (repeatable) */}
            <FormSection
              step={3}
              title="Contact persons"
              description="Add one or more people. Company phone/fax stay in the next section."
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={addContact}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add contact
                </Button>
              }
            >
              {form.contacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No contact person yet. Click “Add contact” to record name, title, email,
                  phone, and date of birth.
                </p>
              ) : (
                <div className="space-y-3">
                  {form.contacts.map((c, i) => (
                    <div key={i} className="rounded-md border bg-background p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">
                          Contact #{i + 1}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 px-2 text-destructive hover:text-destructive"
                          onClick={() => removeContact(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </div>
                      <FieldGrid>
                        <Field label="Contact person">
                          <Input
                            value={c.person ?? ""}
                            onChange={(e) => updateContact(i, "person", e.target.value)}
                          />
                        </Field>
                        <Field label="Title">
                          <Input
                            value={c.title ?? ""}
                            onChange={(e) => updateContact(i, "title", e.target.value)}
                          />
                        </Field>
                        <Field label="Date of birth">
                          <Input
                            type="date"
                            value={c.dateOfBirth ?? ""}
                            onChange={(e) => updateContact(i, "dateOfBirth", e.target.value)}
                          />
                        </Field>
                        <Field label="First name">
                          <Input
                            value={c.firstName ?? ""}
                            onChange={(e) => updateContact(i, "firstName", e.target.value)}
                          />
                        </Field>
                        <Field label="Last name">
                          <Input
                            value={c.lastName ?? ""}
                            onChange={(e) => updateContact(i, "lastName", e.target.value)}
                          />
                        </Field>
                        <Field label="Email">
                          <Input
                            type="email"
                            value={c.email ?? ""}
                            onChange={(e) => updateContact(i, "email", e.target.value)}
                          />
                        </Field>
                        <Field label="Phone">
                          <Input
                            value={c.phone ?? ""}
                            onChange={(e) => updateContact(i, "phone", e.target.value)}
                          />
                        </Field>
                      </FieldGrid>
                    </div>
                  ))}
                </div>
              )}
            </FormSection>

            {/* 4 — Company & terms */}
            <FormSection step={4} title="Company & terms">
              <FieldGrid>
                <Field label="Country">
                  <Input
                    value={form.country}
                    onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                  />
                </Field>
                <Field label="City">
                  <Input
                    value={form.city}
                    onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </Field>
                <Field label="Fax">
                  <Input
                    value={form.fax}
                    onChange={(e) => setForm((prev) => ({ ...prev, fax: e.target.value }))}
                  />
                </Field>
                <Field label="Tracking URL">
                  <Input
                    value={form.trackingUrl}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, trackingUrl: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Company establishment date">
                  <Input
                    type="date"
                    value={form.companyEstablishmentDate}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, companyEstablishmentDate: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Payment due (days)">
                  <Input
                    type="number"
                    min={0}
                    value={form.paymentDueDays}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, paymentDueDays: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Contract no.">
                  <Input
                    value={form.contractNo}
                    onChange={(e) => setForm((prev) => ({ ...prev, contractNo: e.target.value }))}
                  />
                </Field>
                <Field label="Address" wide>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                  />
                </Field>
              </FieldGrid>
            </FormSection>

            {/* 5 — Invoice & bank */}
            <FormSection step={5} title="Invoice & bank">
              <FieldGrid>
                <Field label="Tax number">
                  <Input
                    value={form.taxNumber}
                    onChange={(e) => setForm((prev) => ({ ...prev, taxNumber: e.target.value }))}
                  />
                </Field>
                <Field label="Invoice company name">
                  <Input
                    value={form.invoiceCompanyName}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, invoiceCompanyName: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Invoice company phone">
                  <Input
                    value={form.invoiceCompanyPhone}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, invoiceCompanyPhone: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Invoice company email">
                  <Input
                    type="email"
                    value={form.invoiceCompanyEmail}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, invoiceCompanyEmail: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Invoice company address" wide>
                  <Input
                    value={form.invoiceCompanyAddress}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, invoiceCompanyAddress: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Invoice bank name">
                  <Input
                    value={form.invoiceBankName}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, invoiceBankName: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Invoice bank branch">
                  <Input
                    value={form.invoiceBankBranch}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, invoiceBankBranch: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Invoice bank account">
                  <Input
                    value={form.invoiceBankAccount}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, invoiceBankAccount: e.target.value }))
                    }
                  />
                </Field>
              </FieldGrid>
            </FormSection>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={onSave}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <PartnerImportDialog
      open={importDialogOpen}
      onOpenChange={setImportDialogOpen}
      onImported={invalidatePartnersList}
    />
  </>
  )
}
