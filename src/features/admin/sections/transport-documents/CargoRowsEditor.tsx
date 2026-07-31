import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CargoRow } from './transportDocument.types'
import { CARGO_ROW_COLUMNS } from './transportDocumentFormConfig'
import { emptyCargoRow } from './transportDocumentSchemas'

interface CargoRowsEditorProps {
  rows: CargoRow[]
  onChange: (rows: CargoRow[]) => void
}

export function CargoRowsEditor({ rows, onChange }: CargoRowsEditorProps) {
  const updateRow = (index: number, field: keyof CargoRow, value: string) => {
    onChange(
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    )
  }

  return (
    <section className='space-y-3 border-t border-border/60 pt-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-sm font-semibold'>Cargo / container rows</h2>
          <p className='text-xs text-muted-foreground'>
            Up to 20 rows. Values print exactly as entered.
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={rows.length >= 20}
          onClick={() => onChange([...rows, emptyCargoRow()])}
        >
          <Plus className='mr-1.5 h-4 w-4' /> Add row
        </Button>
      </div>
      <div className='overflow-x-auto rounded-md border border-border/70'>
        <div className='min-w-[920px]'>
          <div className='grid grid-cols-[1.25fr_.7fr_1.5fr_.85fr_.85fr_2.5rem] gap-px bg-border text-[0.68rem] font-semibold tracking-wide text-muted-foreground uppercase'>
            {[...CARGO_ROW_COLUMNS.map((column) => column.label), ''].map(
              (label) => (
                <div
                  key={label || 'actions'}
                  className='bg-muted/70 px-2.5 py-2'
                >
                  {label}
                </div>
              )
            )}
          </div>
          {rows.map((row, index) => (
            <div
              key={index}
              className='grid grid-cols-[1.25fr_.7fr_1.5fr_.85fr_.85fr_2.5rem] gap-px border-t border-border/70 bg-border'
            >
              {CARGO_ROW_COLUMNS.map((column) => (
                <Input
                  key={column.key}
                  value={row[column.key]}
                  maxLength={column.maxLength}
                  aria-label={`${column.key}, cargo row ${index + 1}`}
                  onChange={(event) =>
                    updateRow(index, column.key, event.target.value)
                  }
                  className='h-9 rounded-none border-0 bg-background focus-visible:relative'
                />
              ))}
              <div className='flex items-center justify-center bg-background'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 text-muted-foreground hover:text-destructive'
                  disabled={rows.length === 1}
                  onClick={() =>
                    onChange(rows.filter((_, rowIndex) => rowIndex !== index))
                  }
                  aria-label={`Remove cargo row ${index + 1}`}
                >
                  <Trash2 className='h-4 w-4' />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
