import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

export function InvoiceFormFieldLabel({
  className,
  ...props
}: ComponentProps<typeof Label>) {
  return <Label className={cn('font-bold', className)} {...props} />
}
