"use client"

import { useMemo, useState } from "react"
import {
  ColumnDef,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { FileSpreadsheet, Upload } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { toast } from "@/shared/utils/toast"
import {
  canonicalizeParsedRows,
  parseExcelFile,
  validateTemplateHeaders,
  type ExcelImportSchema,
} from "@/shared/utils/excelImport"

import { partnerManagementService } from "@/features/admin/services/partnerManagementService"
import type {
  PartnerImportCommitData,
  PartnerImportRowError,
  PartnerImportPreviewData,
} from "@/features/admin/types/partnerManagement.types"

interface PartnerImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => Promise<void> | void
}

const PARTNER_IMPORT_SCHEMA: ExcelImportSchema = {
  requiredHeaders: ["name", "addition_types"],
  optionalHeaders: [
    "tax_number",
    "country",
    "city",
    "contact_email",
    "phone",
    "fax",
    "tracking_url",
    "address",
    "customer_status",
    "customer_type",
  ],
  headerAliases: {
    addition_types: ["addition types", "Addition Types", "addition-types"],
    contact_email: ["contact email", "Contact Email", "contact-email"],
    customer_status: ["customer status", "Customer Status", "customer-status"],
    customer_type: ["customer type", "Customer Type", "customer-type"],
    tax_number: ["tax number", "Tax Number", "tax-number"],
    tracking_url: ["tracking url", "Tracking URL", "tracking-url"],
  },
}

export function PartnerImportDialog({ open, onOpenChange, onImported }: PartnerImportDialogProps) {
  const importMode = "CREATE_ONLY"
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [previewColumnVisibility, setPreviewColumnVisibility] = useState<VisibilityState>({})

  const [localPreviewRows, setLocalPreviewRows] = useState<Array<Record<string, string>>>([])
  const [localHeaders, setLocalHeaders] = useState<string[]>([])
  const [missingHeaders, setMissingHeaders] = useState<string[]>([])
  const [unknownHeaders, setUnknownHeaders] = useState<string[]>([])

  const [serverPreview, setServerPreview] = useState<PartnerImportPreviewData | null>(null)
  const [commitResult, setCommitResult] = useState<PartnerImportCommitData | null>(null)

  const canCommit = selectedFile !== null && missingHeaders.length === 0 && !isCommitting

  const previewHeaders = useMemo(() => {
    if (serverPreview?.headers?.length) {
      return serverPreview.headers
    }
    return localHeaders
  }, [serverPreview, localHeaders])

  const previewRowErrors = useMemo<PartnerImportRowError[]>(() => {
    return serverPreview?.rowErrors ?? []
  }, [serverPreview])

  const commitRowErrors = useMemo<PartnerImportRowError[]>(() => {
    return commitResult?.rowErrors ?? []
  }, [commitResult])

  const displayedErrors = useMemo<PartnerImportRowError[]>(() => {
    if (commitRowErrors.length > 0) {
      return commitRowErrors
    }
    return previewRowErrors
  }, [commitRowErrors, previewRowErrors])

  const previewErrorRowIndexSet = useMemo(() => {
    return new Set(previewRowErrors.map((error) => error.rowIndex))
  }, [previewRowErrors])

  const firstValidPreviewRow = useMemo(() => {
    if (serverPreview?.rows?.length) {
      const validIndex = serverPreview.rows.findIndex((_, index) => !previewErrorRowIndexSet.has(index + 2))
      return validIndex >= 0 ? [serverPreview.rows[validIndex]] : []
    }
    return localPreviewRows.slice(0, 1)
  }, [serverPreview, localPreviewRows, previewErrorRowIndexSet])

  const previewColumns = useMemo<ColumnDef<Record<string, string>>[]>(() => {
    return previewHeaders.map((header) => ({
      id: header,
      accessorFn: (row) => row[header] || "",
      header: () => <span className="whitespace-nowrap">{header}</span>,
      cell: ({ getValue }) => {
        const value = (getValue() as string) || ""
        return (
          <span className="block min-w-[150px] max-w-[320px] truncate" title={value}>
            {value}
          </span>
        )
      },
      enableHiding: true,
    }))
  }, [previewHeaders])

  const previewTable = useReactTable({
    data: firstValidPreviewRow,
    columns: previewColumns,
    getCoreRowModel: getCoreRowModel(),
    state: {
      columnVisibility: previewColumnVisibility,
    },
    onColumnVisibilityChange: setPreviewColumnVisibility,
  })

  const resetState = () => {
    setSelectedFile(null)
    setLocalPreviewRows([])
    setLocalHeaders([])
    setMissingHeaders([])
    setUnknownHeaders([])
    setServerPreview(null)
    setCommitResult(null)
    setPreviewColumnVisibility({})
  }

  const handleDialogChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      resetState()
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setSelectedFile(file)
    setCommitResult(null)
    setServerPreview(null)

    try {
      setIsPreviewing(true)
      const parsed = await parseExcelFile(file)
      const canonicalParsed = canonicalizeParsedRows(parsed, PARTNER_IMPORT_SCHEMA)
      const headerValidation = validateTemplateHeaders(parsed.headers, PARTNER_IMPORT_SCHEMA)

      setLocalHeaders(canonicalParsed.headers)
      setLocalPreviewRows(canonicalParsed.rows)
      setMissingHeaders(headerValidation.missingHeaders)
      setUnknownHeaders(headerValidation.unknownHeaders)

      if (headerValidation.missingHeaders.length > 0) {
        toast.error(`Missing required headers: ${headerValidation.missingHeaders.join(", ")}`)
        return
      }

      try {
        const preview = await partnerManagementService.previewImport(file)
        setServerPreview(preview)
      } catch (serverPreviewError) {
        toast.info("Backend preview is not available yet. Showing local preview.")
        console.warn("Partner import backend preview is unavailable", serverPreviewError)
      }
    } catch (error) {
      toast.error("Please choose a valid .xlsx file", error)
      setSelectedFile(null)
      setLocalHeaders([])
      setLocalPreviewRows([])
      setMissingHeaders([])
      setUnknownHeaders([])
    } finally {
      setIsPreviewing(false)
      event.target.value = ""
    }
  }

  const handleCommit = async () => {
    if (!selectedFile) {
      toast.error("Please choose an .xlsx file first")
      return
    }

    if (missingHeaders.length > 0) {
      toast.error(`Cannot import. Missing headers: ${missingHeaders.join(", ")}`)
      return
    }

    try {
      setIsCommitting(true)
      const result = await partnerManagementService.commitImport(selectedFile, importMode)
      setCommitResult(result)
      toast.success(
        `Import completed. Created: ${result.createdCount}, Updated: ${result.updatedCount}, Failed: ${result.failedCount}`,
      )
      await onImported()
    } catch (error) {
      toast.error("Failed to import partner file", error)
    } finally {
      setIsCommitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Partner (.xlsx)
          </DialogTitle>
          <DialogDescription>
            Frontend preview is quick validation only. Final validation and summary come from backend preview/commit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex flex-col flex-1 overflow-hidden">
          <div className="grid gap-4 md:grid-cols-2 shrink-0">
            <div className="grid gap-2">
              <Label htmlFor="partnerImportFile">Excel file</Label>
              <Input id="partnerImportFile" type="file" accept=".xlsx" onChange={handleFileChange} />
              {selectedFile && <p className="text-xs text-muted-foreground">Selected: {selectedFile.name}</p>}
            </div>

            <div className="grid gap-2">
              <Label>Summary</Label>
              <div className="h-10 rounded-md border bg-muted/30 px-3 flex items-center text-sm">
                Valid: <strong className="mx-1">{serverPreview?.summary?.valid ?? 0}</strong>
                Invalid: <strong className="ml-1">{serverPreview?.summary?.invalid ?? 0}</strong>
              </div>
              {selectedFile && (
                unknownHeaders.length > 0 ? (
                  <p className="text-xs text-warning">
                    Unrecognized columns: <strong>{unknownHeaders.join(", ")}</strong>
                  </p>
                ) : missingHeaders.length === 0 ? (
                  <p className="text-xs text-emerald-600 font-medium">All collumn valid</p>
                ) : null
              )}
            </div>
          </div>

          <div className="space-y-2 flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="flex items-center justify-between gap-2 shrink-0">
              <p className="text-xs text-muted-foreground">Rows with errors</p>
            </div>

            <div className="rounded-md border overflow-y-auto flex-1 min-h-[160px]">
              <Table className="w-full text-sm">
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                  <TableRow className="bg-red-50">
                    <TableHead className="px-3 py-2 text-left font-medium whitespace-nowrap">Row</TableHead>
                    <TableHead className="px-3 py-2 text-left font-medium whitespace-nowrap">Field</TableHead>
                    <TableHead className="px-3 py-2 text-left font-medium whitespace-nowrap">Error</TableHead>
                    <TableHead className="px-3 py-2 text-left font-medium whitespace-nowrap">Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedErrors.length > 0 ? (
                    displayedErrors.map((error, index) => (
                      <TableRow key={`invalid-preview-${error.rowIndex}-${error.field ?? "general"}-${index}`}>
                        <TableCell className="px-3 py-2 align-top">{error.rowIndex}</TableCell>
                        <TableCell className="px-3 py-2 align-top">{error.field || "-"}</TableCell>
                        <TableCell className="px-3 py-2 align-top">{error.message}</TableCell>
                        <TableCell className="px-3 py-2 align-top">{error.code || "-"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="px-3 py-6 text-center text-muted-foreground" colSpan={4}>
                        {isPreviewing ? "Reading file..." : "No errors"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-2 shrink-0">
              <p className="text-xs text-muted-foreground">
                Showing 1 valid row preview
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={previewHeaders.length === 0}>
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-72 overflow-auto">
                  {previewTable
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="rounded-md border overflow-y-auto min-h-[140px] max-h-[220px]">
              <Table className="w-max min-w-full text-sm relative">
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm align-top">
                  {previewTable.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="bg-muted/40">
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="px-3 py-2 text-left font-medium whitespace-nowrap">
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {previewTable.getRowModel().rows.length > 0 ? (
                    previewTable.getRowModel().rows.map((row) => (
                      <TableRow key={row.id}>
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="px-3 py-2 align-top whitespace-nowrap">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        className="px-3 py-6 text-center text-muted-foreground"
                        colSpan={Math.max(previewTable.getVisibleLeafColumns().length, 1)}
                      >
                        {isPreviewing ? "Reading file..." : "No valid row found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 mt-4 border-t pt-4 bg-background">
          <Button variant="outline" onClick={() => handleDialogChange(false)}>
            Close
          </Button>
          <Button onClick={handleCommit} disabled={!canCommit}>
            <Upload className="mr-2 h-4 w-4" />
            {isCommitting ? "Importing..." : "Commit CREATE_ONLY"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
