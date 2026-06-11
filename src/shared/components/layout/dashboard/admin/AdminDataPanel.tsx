"use client"

import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface AdminDataPanelProps {
  children: ReactNode
  meta?: ReactNode
  loading?: boolean
  empty?: boolean
  emptyMessage?: string
  className?: string
}

/** Table region with optional meta line and loading / empty states */
export function AdminDataPanel({
  children,
  meta,
  loading = false,
  empty = false,
  emptyMessage = "No records found.",
  className,
}: AdminDataPanelProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col pt-4", className)}>
      {meta ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{meta}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="admin-data-empty">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">Loading records…</p>
        </div>
      ) : empty ? (
        <div className="admin-data-empty">
          <p className="text-sm font-medium text-foreground">Nothing here yet</p>
          <p className="max-w-sm text-pretty text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        children
      )}
    </div>
  )
}
