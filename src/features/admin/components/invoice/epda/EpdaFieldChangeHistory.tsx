'use client'

import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { shippingAgencyEpdaService } from '@/modules/inquiries/services/shippingAgencyEpdaService'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import { useI18n } from '@/shared/i18n/I18nProvider'
import {
  formatFieldChangeAction,
  formatFieldChangeLabel,
  type InquiryFieldChangeLogEntry,
} from '@/features/admin/components/invoice/epda/epdaCustomerFieldTracking'

interface EpdaFieldChangeHistoryProps {
  inquiryId?: number | null
  refreshKey?: number
}

export function EpdaFieldChangeHistory({ inquiryId, refreshKey = 0 }: EpdaFieldChangeHistoryProps) {
  const { t } = useI18n()
  const requestKey = `${inquiryId ?? 'none'}:${refreshKey}`
  const [history, setHistory] = useState<{
    requestKey: string
    entries: InquiryFieldChangeLogEntry[]
  }>({ requestKey: '', entries: [] })

  useEffect(() => {
    if (!inquiryId) return

    let active = true
    void shippingAgencyEpdaService
      .listFieldChanges(inquiryId, 0, 20)
      .then((result) => {
        if (active) setHistory({ requestKey, entries: result.content ?? [] })
      })
      .catch(() => {
        if (active) setHistory({ requestKey, entries: [] })
      })

    return () => {
      active = false
    }
  }, [inquiryId, requestKey])

  const entries = history.requestKey === requestKey ? history.entries : []

  // Hide the button entirely when there is no history (and while first loading).
  if (!inquiryId || entries.length === 0) return null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2 active:scale-[0.98]">
          <History className="h-4 w-4" />
          {t('epda.historyBtn')} ({entries.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            {t('epda.historyTitle')}
          </DialogTitle>
        </DialogHeader>

        <ul className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-md border border-border/50 bg-muted/20 px-3 py-2.5 text-sm"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="font-medium leading-snug">{formatFieldChangeLabel(entry.fieldName)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatFieldChangeAction(entry.action)} · {new Date(entry.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="mt-1 text-[12px] leading-relaxed">
                <span className="text-muted-foreground">{t('epda.before')}:</span>{' '}
                {entry.previousValue || '—'}
                <span className="mx-1.5 text-muted-foreground">→</span>
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  {entry.newValue || '—'}
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {entry.changedBy.fullName || entry.changedBy.email || `User #${entry.changedBy.id}`}
              </p>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
