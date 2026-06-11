import { useCallback } from "react"
import type { Column } from "@tanstack/react-table"

import { DataTableSortHeader } from "@/shared/components/ui/data-table"

export function useTableSortHeader<TData>() {
  return useCallback(
    (label: string) =>
      ({ column }: { column: Column<TData, unknown> }) => (
        <DataTableSortHeader column={column}>{label}</DataTableSortHeader>
      ),
    []
  )
}
