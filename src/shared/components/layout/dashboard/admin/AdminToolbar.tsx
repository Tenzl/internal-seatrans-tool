"use client"

import type { ReactNode } from "react"
import { cn } from "@/shared/lib/utils"

interface AdminToolbarProps {
  children: ReactNode
  className?: string
}

/** Filter / search row — sits below the shell page title */
export function AdminToolbar({ children, className }: AdminToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:flex-wrap sm:items-center",
        className,
      )}
    >
      {children}
    </div>
  )
}

interface AdminToolbarGroupProps {
  children: ReactNode
  className?: string
  align?: "start" | "end"
}

export function AdminToolbarGroup({ children, className, align = "start" }: AdminToolbarGroupProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        align === "end" && "sm:ml-auto",
        className,
      )}
    >
      {children}
    </div>
  )
}
