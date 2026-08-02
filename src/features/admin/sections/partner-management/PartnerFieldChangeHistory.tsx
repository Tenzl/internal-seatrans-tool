'use client'

import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  formatPartnerFieldChangeAction,
  type PartnerFieldChangeLogEntry,
} from './partnerFieldChangeHistoryModel'
import { partnerManagementService } from './partnerManagementService'

interface PartnerFieldChangeHistoryProps {
  partnerId?: number | null
  refreshKey?: number
}

export function PartnerFieldChangeHistory({
  partnerId,
  refreshKey = 0,
}: PartnerFieldChangeHistoryProps) {
  const requestKey = `${partnerId ?? 'none'}:${refreshKey}`
  const [history, setHistory] = useState<{
    requestKey: string
    entries: PartnerFieldChangeLogEntry[]
  }>({ requestKey: '', entries: [] })

  useEffect(() => {
    if (!partnerId) return

    let active = true
    void partnerManagementService
      .listFieldChanges(partnerId, 0, 20)
      .then((result) => {
        if (active) setHistory({ requestKey, entries: result.content ?? [] })
      })
      .catch(() => {
        if (active) setHistory({ requestKey, entries: [] })
      })

    return () => {
      active = false
    }
  }, [partnerId, requestKey])

  const entries = history.requestKey === requestKey ? history.entries : []

  if (!partnerId || entries.length === 0) return null

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
          View edit history ({entries.length})
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <History className='h-4 w-4 text-muted-foreground' />
            Partner edit history
          </DialogTitle>
        </DialogHeader>

        <ul className='max-h-[60vh] space-y-2 overflow-y-auto pr-1'>
          {entries.map((entry) => (
            <li
              key={entry.id}
              className='rounded-md border border-border/50 bg-muted/20 px-3 py-2.5 text-sm'
            >
              <div className='flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5'>
                <p className='leading-snug font-medium'>{entry.fieldName}</p>
                <p className='text-[11px] text-muted-foreground'>
                  {formatPartnerFieldChangeAction(entry.action)} ·{' '}
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
              </div>
              <p className='mt-1 text-[12px] leading-relaxed'>
                <span className='text-muted-foreground'>Before:</span>{' '}
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
      </DialogContent>
    </Dialog>
  )
}
