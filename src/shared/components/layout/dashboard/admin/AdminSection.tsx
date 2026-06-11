"use client"

import type { ReactNode } from "react"
import { cn } from "@/shared/lib/utils"

interface AdminSectionProps {
  children: ReactNode
  /** Optional one-line context under the shell page title */
  description?: ReactNode
  /** Primary actions (Add, Import, …) — top right on wide screens */
  actions?: ReactNode
  /** Search, filters, column toggles */
  toolbar?: ReactNode
  className?: string
}

/**
 * Standard admin module body. Page title lives in MainDashboard header only —
 * sections supply description, toolbar, and data panels to avoid double headings.
 */
export function AdminSection({
  children,
  description,
  actions,
  toolbar,
  className,
}: AdminSectionProps) {
  return (
    <section className={cn("admin-section flex min-h-0 flex-col", className)}>
      {(description || actions) && (
        <div className="flex flex-col gap-4 border-b border-border/50 pb-4 lg:flex-row lg:items-start lg:justify-between">
          {description ? (
            <p className="w-full min-w-0 text-pretty text-sm leading-relaxed text-muted-foreground lg:max-w-2xl lg:flex-1">
              {description}
            </p>
          ) : (
            <span className="hidden lg:block lg:flex-1" />
          )}
          {actions ? (
            <div className="flex w-full min-w-0 flex-wrap items-stretch gap-2 sm:items-center lg:w-auto lg:max-w-none lg:shrink-0 lg:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      )}

      {toolbar}

      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  )
}
