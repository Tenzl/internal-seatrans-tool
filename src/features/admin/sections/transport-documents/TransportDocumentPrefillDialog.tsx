'use client'

import { useState } from 'react'
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
import type {
  TransportDocumentRecord,
  TransportDocumentType,
} from './transportDocument.types'
import { getTransportDocumentDefinition } from './transportDocumentFormConfig'

type TransportDocumentPrefillDialogProps = {
  open: boolean
  sourceType: TransportDocumentType
  loading: boolean
  error: string | null
  records: TransportDocumentRecord[]
  onOpenChange: (open: boolean) => void
  onSelect: (record: TransportDocumentRecord) => void
}

export function TransportDocumentPrefillDialog({
  open,
  sourceType,
  loading,
  error,
  records,
  onOpenChange,
  onSelect,
}: TransportDocumentPrefillDialogProps) {
  const sourceLabel = getTransportDocumentDefinition(sourceType).label
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const selected =
    records.find((record) => record.id === selectedId) ?? records[0] ?? null

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelectedId(null)
        onOpenChange(next)
      }}
    >
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
              const active = (selectedId ?? records[0]?.id) === record.id
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
