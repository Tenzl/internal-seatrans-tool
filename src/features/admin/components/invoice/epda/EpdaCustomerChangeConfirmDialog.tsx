'use client'

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
import type { EpdaCustomerFieldChange } from './epdaCustomerFieldTracking'

interface EpdaCustomerChangeConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  changes: EpdaCustomerFieldChange[]
  actionLabel: string
  onConfirm: () => void
  onRevert: () => void
}

export function EpdaCustomerChangeConfirmDialog({
  open,
  onOpenChange,
  changes,
  actionLabel,
  onConfirm,
  onRevert,
}: EpdaCustomerChangeConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[min(90dvh,640px)] max-w-lg overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Customer values were modified</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                You changed {changes.length} field{changes.length === 1 ? '' : 's'} compared to what the
                customer submitted. Confirm to proceed with {actionLabel}, or revert to the original
                customer values.
              </p>
              <ul className="divide-y rounded-md border border-border/60 text-foreground">
                {changes.map((change) => (
                  <li key={change.field} className="space-y-1 px-3 py-2.5">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">{change.label}</p>
                    <p className="text-xs text-muted-foreground">
                      Original: <span className="text-foreground">{change.previousValue}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Your edit: <span className="font-medium text-emerald-700 dark:text-emerald-400">{change.currentValue}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <AlertDialogCancel type="button" onClick={onRevert} className="sm:mt-0">
            Revert to original values
          </AlertDialogCancel>
          <AlertDialogAction type="button" onClick={onConfirm}>
            Keep changes &amp; {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
