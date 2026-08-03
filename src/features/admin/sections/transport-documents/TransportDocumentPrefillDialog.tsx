'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getTransportDocumentDefinition } from './transportDocumentFormConfig'
import { transportDocumentService } from './transportDocumentService'
import type {
  TransportDocumentRecord,
  TransportDocumentType,
} from './transportDocument.types'

type TransportDocumentPrefillDialogProps = {
  open: boolean
  sourceType: TransportDocumentType
  onOpenChange: (open: boolean) => void
  onSelect: (record: TransportDocumentRecord) => void
}

export function TransportDocumentPrefillDialog({
  open,
  sourceType,
  onOpenChange,
  onSelect,
}: TransportDocumentPrefillDialogProps) {
  const sourceLabel = getTransportDocumentDefinition(sourceType).label
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<TransportDocumentRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const page = await transportDocumentService.history({
        type: sourceType,
        page: 0,
        size: 20,
      })
      setRecords(page.content)
      setSelectedId(page.content[0]?.id ?? null)
    } catch (err) {
      setRecords([])
      setSelectedId(null)
      setError(err instanceof Error ? err.message : 'Failed to load records')
    } finally {
      setLoading(false)
    }
  }, [sourceType])

  useEffect(() => {
    if (!open) return
    void load()
  }, [load, open])

  const selected = records.find((record) => record.id === selectedId) ?? null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>Prefill from previous</DialogTitle>
          <DialogDescription>
            Choose a saved {sourceLabel} record. Matching fields will overwrite
            on this form (identity numbers stay unchanged).
          </DialogDescription>
        </DialogHeader>

        <div className='max-h-72 space-y-2 overflow-y-auto py-1'>
          {loading ? (
            <div className='flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground'>
              <Loader2 className='h-4 w-4 animate-spin' /> Loading…
            </div>
          ) : error ? (
            <p className='py-6 text-center text-sm text-destructive'>{error}</p>
          ) : records.length === 0 ? (
            <p className='py-6 text-center text-sm text-muted-foreground'>
              No {sourceLabel} records found.
            </p>
          ) : (
            records.map((record) => {
              const active = record.id === selectedId
              return (
                <button
                  key={record.id}
                  type='button'
                  onClick={() => setSelectedId(record.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div className='font-medium'>
                    {record.referenceNumber?.trim() || `Record #${record.id}`}
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    #{record.id} · {record.status} ·{' '}
                    {new Date(record.createdAt).toLocaleString()}
                  </div>
                </button>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type='button'
            disabled={!selected || loading}
            onClick={() => {
              if (!selected) return
              onSelect(selected)
              onOpenChange(false)
            }}
          >
            Apply prefill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
