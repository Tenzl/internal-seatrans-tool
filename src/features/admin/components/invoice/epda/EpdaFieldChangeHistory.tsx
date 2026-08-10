'use client'

import { useEffect, useState } from 'react'
import {
  formatFieldChangeAction,
  formatFieldChangeLabel,
  type InquiryFieldChangeLogEntry,
} from '@/modules/inquiries/components/common/epdaCustomerFieldTracking'
import { shippingAgencyEpdaService } from '@/modules/inquiries/services/shippingAgencyEpdaService'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface EpdaFieldChangeHistoryProps {
  inquiryId?: number | null
  refreshKey?: number
}

export function EpdaFieldChangeHistory({
  inquiryId,
  refreshKey = 0,
}: EpdaFieldChangeHistoryProps) {
  const { t } = useI18n()
  const requestKey = `${inquiryId ?? 'none'}:${refreshKey}`
  const [history, setHistory] = useState<{
    requestKey: string
    entries: InquiryFieldChangeLogEntry[]
    page: number
    totalElements: number
    loadingMore: boolean
  }>({
    requestKey: '',
    entries: [],
    page: 0,
    totalElements: 0,
    loadingMore: false,
  })

  useEffect(() => {
    if (!inquiryId) return

    let active = true
    void shippingAgencyEpdaService
      .listFieldChanges(inquiryId, 0, 20)
      .then((result) => {
        if (active) {
          setHistory({
            requestKey,
            entries: result.content ?? [],
            page: 0,
            totalElements: result.totalElements,
            loadingMore: false,
          })
        }
      })
      .catch(() => {
        if (active) {
          setHistory({
            requestKey,
            entries: [],
            page: 0,
            totalElements: 0,
            loadingMore: false,
          })
        }
      })

    return () => {
      active = false
    }
  }, [inquiryId, requestKey])

  const entries = history.requestKey === requestKey ? history.entries : []
  const totalElements =
    history.requestKey === requestKey ? history.totalElements : 0
  const hasMore = entries.length < totalElements

  const loadMore = async () => {
    if (!inquiryId || history.loadingMore || !hasMore) return
    const nextPage = history.page + 1
    setHistory((current) => ({ ...current, loadingMore: true }))
    try {
      const result = await shippingAgencyEpdaService.listFieldChanges(
        inquiryId,
        nextPage,
        20
      )
      setHistory((current) =>
        current.requestKey === requestKey
          ? {
              ...current,
              entries: [...current.entries, ...(result.content ?? [])],
              page: nextPage,
              totalElements: result.totalElements,
              loadingMore: false,
            }
          : current
      )
    } catch {
      setHistory((current) => ({ ...current, loadingMore: false }))
    }
  }

  // Hide the button entirely when there is no history (and while first loading).
  if (!inquiryId || entries.length === 0) return null

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='gap-2 active:scale-[0.98]'
        >
          <History className='h-4 w-4' />
          {t('epda.historyBtn')} ({totalElements})
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <History className='h-4 w-4 text-muted-foreground' />
            {t('epda.historyTitle')}
          </DialogTitle>
        </DialogHeader>

        <ul className='max-h-[60vh] space-y-2 overflow-y-auto pr-1'>
          {entries.map((entry) => (
            <li
              key={entry.id}
              className='rounded-md border border-border/50 bg-muted/20 px-3 py-2.5 text-sm'
            >
              <div className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5'>
                <p className='leading-snug font-medium'>
                  {formatFieldChangeLabel(entry.fieldName)}
                </p>
                <p className='text-[11px] text-muted-foreground'>
                  {formatFieldChangeAction(entry.action)} ·{' '}
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
              </div>
              <p className='mt-1 text-[12px] leading-relaxed'>
                <span className='text-muted-foreground'>
                  {t('epda.before')}:
                </span>{' '}
                {entry.previousValue || '—'}
                <span className='mx-1.5 text-muted-foreground'>→</span>
                <span className='font-medium text-emerald-700 dark:text-emerald-400'>
                  {entry.newValue || '—'}
                </span>
              </p>
              <p className='mt-0.5 text-[11px] text-muted-foreground'>
                {entry.changedBy.fullName ||
                  entry.changedBy.email ||
                  `User #${entry.changedBy.id}`}
              </p>
            </li>
          ))}
        </ul>
        {hasMore && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={history.loadingMore}
            onClick={() => void loadMore()}
          >
            {history.loadingMore ? t('epda.loading') : t('epda.loadMore')}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
