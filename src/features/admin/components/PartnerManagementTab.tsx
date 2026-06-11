"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
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
import {
  DataTableContent,
  adminStickyColumnClass,
  DataTablePagination,
} from "@/shared/components/ui/data-table"
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
  BookingPartnerDetail,
  BookingPartnerListItem,
  BookingPartnerUpsertRequest,
  CustomerStatus,
  CustomerType,
  PartnerAdditionType,
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

const formatAdditionTypeLabel = (type: PartnerAdditionType): string =>
  type === "OTHER_VENDORS" ? "OTHER VENDOR" : type.replace(/_/g, " ")

// ---------------------------------------------------------------------------
// Form helpers
// ---------------------------------------------------------------------------

type FormState = {
  name: string
  additionTypes: PartnerAdditionType[]
  country: string
  city: string
  contactEmail: string
  phone: string
  fax: string
  trackingUrl: string
  address: string
  customerStatus: CustomerStatus | ""
  customerType: CustomerType | ""
  taxNumber: string
}

const initialFormState: FormState = {
  name: "",
  additionTypes: [],
  country: "",
  city: "",
  contactEmail: "",
  phone: "",
  fax: "",
  trackingUrl: "",
  address: "",
  customerStatus: "",
  customerType: "",
  taxNumber: "",
}

const toUpsertRequest = (form: FormState): BookingPartnerUpsertRequest => ({
  name: form.name,
  additionTypes: form.additionTypes,
  country: form.country || undefined,
  city: form.city || undefined,
  contactEmail: form.contactEmail || undefined,
  phone: form.phone || undefined,
  fax: form.fax || undefined,
  trackingUrl: form.trackingUrl || undefined,
  address: form.address || undefined,
  customerStatus: (form.customerStatus || undefined) as CustomerStatus | undefined,
  customerType: (form.customerType || undefined) as CustomerType | undefined,
  taxNumber: form.taxNumber,
})

const fromDetail = (detail: BookingPartnerDetail): FormState => ({
  name: detail.name || "",
  additionTypes: detail.additionTypes || [],
  country: detail.country || "",
  city: detail.city || "",
  contactEmail: detail.contactEmail || "",
  phone: detail.phone || "",
  fax: detail.fax || "",
  trackingUrl: detail.trackingUrl || "",
  address: detail.address || "",
  customerStatus: (detail.customerStatus || "") as CustomerStatus | "",
  customerType: (detail.customerType || "") as CustomerType | "",
  taxNumber: detail.taxNumber || "",
})

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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ address: false })
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

  const validateForm = (): string | null => {
    if (!form.name.trim()) return "Name is required"
    if (form.additionTypes.length === 0) return "At least one Additional Type is required"
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
        accessorKey: "contactEmail",
        header: renderSortableHeader("Contact Email"),
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
  // Layout helpers
  // ---------------------------------------------------------------------------

  const columnWidthClass = (columnId: string) => {
    const map: Record<string, string> = {
      name: "min-w-[220px] max-w-[220px]",
      customerId: "min-w-[190px]",
      additionTypes: "min-w-[260px]",
      country: "min-w-[140px]",
      city: "min-w-[140px]",
      contactEmail: "min-w-[240px]",
      phone: "min-w-[170px]",
      fax: "min-w-[170px]",
      trackingUrl: "min-w-[280px]",
      address: "min-w-[320px]",
      customerStatus: "min-w-[170px]",
      customerType: "min-w-[160px]",
      taxNumber: "min-w-[190px]",
      updatedBy: "min-w-[180px]",
      createdBy: "min-w-[180px]",
      updatedAt: "min-w-[180px]",
      createdAt: "min-w-[180px]",
      actions: "text-right",
    }
    return map[columnId] ?? "min-w-[140px]"
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
    <AdminSection
      description="Partner profiles for booking. Search and filters run on the server; 100 records per page."
      actions={
        <>
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
        <DataTableContent
          table={table}
          columnCount={columns.length}
          loading={loading && rows.length === 0}
          emptyMessage="No partners found."
          tableClassName="w-max min-w-full"
          columnClassName={(id, type) =>
            `${adminStickyColumnClass(id, type, columnWidthClass(id), {
              pinLeft: ["name"],
              pinRight: ["actions"],
            })} whitespace-nowrap${type === "header" ? "" : " align-top"}`
          }
        />
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Partner" : "Create Partner"}</DialogTitle>
            <DialogDescription>
              Customer ID is generated automatically by backend on create.
            </DialogDescription>
          </DialogHeader>

          <div className="grid md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-2 pb-3 pl-1 scroll-pb-6">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Tax Number</Label>
              <Input
                value={form.taxNumber}
                onChange={(e) => setForm((prev) => ({ ...prev, taxNumber: e.target.value }))}
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Additional Types *</Label>
              <div className="flex flex-wrap gap-3">
                {ADDITION_TYPE_OPTIONS.map((type) => {
                  const checked = form.additionTypes.includes(type)
                  return (
                    <label key={type} className="inline-flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(state) => onToggleAdditionType(type, state === true)}
                      />
                      {type}
                    </label>
                  )
                })}
              </div>
            </div>

            <div>
              <Label>Customer Status</Label>
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
            </div>
            <div>
              <Label>Customer Type</Label>
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
            </div>

            <div>
              <Label>Country</Label>
              <Input
                value={form.country}
                onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
              />
            </div>
            <div>
              <Label>City</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
              />
            </div>
            <div>
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label>Fax</Label>
              <Input
                value={form.fax}
                onChange={(e) => setForm((prev) => ({ ...prev, fax: e.target.value }))}
              />
            </div>
            <div>
              <Label>Tracking URL</Label>
              <Input
                value={form.trackingUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, trackingUrl: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>
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
