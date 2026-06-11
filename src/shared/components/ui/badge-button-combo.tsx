import * as React from "react"

import { Badge } from "@/shared/components/ui/badge"
import { Button, type ButtonProps } from "@/shared/components/ui/button"
import { cn } from "@/shared/lib/utils"

type BadgeButtonComboProps = {
  label: React.ReactNode
  badge?: React.ReactNode
  buttonClassName?: string
  badgeClassName?: string
  variant?: ButtonProps["variant"]
  size?: ButtonProps["size"]
} & Omit<ButtonProps, "children" | "variant" | "size"> &
  React.HTMLAttributes<HTMLDivElement>

export default function BadgeButtonCombo({
  label,
  badge,
  buttonClassName,
  badgeClassName,
  className,
  variant = "outline",
  size = "default",
  ...rest
}: BadgeButtonComboProps) {
  return (
    <div className={cn("inline-flex items-center", className)}>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn("rounded-r-none border-r-0", buttonClassName)}
        {...rest}
      >
        {label}
      </Button>
      {badge !== undefined && badge !== null && (
        <Badge
          className={cn(
            "rounded-l-none rounded-r-md border border-l-0 px-2 py-0 h-9 flex items-center",
            badgeClassName,
          )}
          variant={variant === "default" ? "default" : "outline"}
        >
          {badge}
        </Badge>
      )}
    </div>
  )
}
