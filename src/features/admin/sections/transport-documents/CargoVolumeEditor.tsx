'use client'

import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  CARGO_VOLUME_TYPES,
  expandCargoVolumes,
  type CargoVolumeType,
  type CargoVolumes,
} from './cargoVolumeModel'

interface CargoVolumeEditorProps {
  volumes: CargoVolumes
  onChange: (volumes: CargoVolumes) => void
  disabled?: boolean
}

function parseQty(raw: string): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

function formatSummary(grid: Record<CargoVolumeType, number>): string {
  return CARGO_VOLUME_TYPES.filter((type) => grid[type] > 0)
    .map((type) => `${grid[type]} × ${type}`)
    .join(' · ')
}

export function CargoVolumeEditor({
  volumes,
  onChange,
  disabled = false,
}: CargoVolumeEditorProps) {
  const grid = expandCargoVolumes(volumes)
  const summary = formatSummary(grid)

  const setQty = (type: CargoVolumeType, qty: number) => {
    const next = { ...grid, [type]: Math.max(0, qty) }
    const compact: CargoVolumes = {}
    for (const key of CARGO_VOLUME_TYPES) {
      if (next[key] > 0) compact[key] = next[key]
    }
    onChange(compact)
  }

  return (
    <div
      data-testid='cargo-volume-editor'
      className='space-y-2'
    >
      <div className='space-y-0.5'>
        <Label className='text-sm font-medium text-muted-foreground'>
          Cargo volume
        </Label>
        <p className='text-sm leading-snug text-muted-foreground/80'>
          Set quantity per container type
        </p>
      </div>

      <div
        role='group'
        aria-label='Cargo volume by container type'
        className='grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5'
      >
        {CARGO_VOLUME_TYPES.map((type) => {
          const id = `cargo-volume-${type.replace(/'/g, '')}`
          const qty = grid[type]
          const active = qty > 0

          return (
            <div
              key={type}
              className={cn(
                'flex flex-col gap-1 rounded-md border px-2 py-1.5 transition-colors',
                active
                  ? 'border-primary/35 bg-primary/[0.04]'
                  : 'border-border/60 bg-background hover:border-border'
              )}
            >
              <label
                htmlFor={id}
                className={cn(
                  'text-xs font-medium leading-none tracking-wide tabular-nums',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {type}
              </label>

              <div className='flex items-center gap-0.5'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  disabled={disabled || qty <= 0}
                  aria-label={`Decrease ${type}`}
                  className={cn(
                    'h-7 w-7 shrink-0 rounded-sm text-muted-foreground',
                    'hover:bg-muted hover:text-foreground',
                    'active:scale-95',
                    'focus-visible:ring-2 focus-visible:ring-ring/40'
                  )}
                  onClick={() => setQty(type, qty - 1)}
                >
                  <Minus className='h-3 w-3' />
                </Button>
                <Input
                  id={id}
                  type='number'
                  inputMode='numeric'
                  min={0}
                  step={1}
                  disabled={disabled}
                  value={qty}
                  aria-label={`${type} quantity`}
                  onChange={(event) =>
                    setQty(type, parseQty(event.target.value))
                  }
                  className={cn(
                    'h-7 min-w-0 flex-1 border-0 bg-transparent px-0.5 text-center text-sm shadow-none',
                    'tabular-nums focus-visible:border-0 focus-visible:ring-0',
                    active ? 'text-foreground' : 'text-muted-foreground'
                  )}
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  disabled={disabled}
                  aria-label={`Increase ${type}`}
                  className={cn(
                    'h-7 w-7 shrink-0 rounded-sm text-muted-foreground',
                    'hover:bg-muted hover:text-foreground',
                    'active:scale-95',
                    'focus-visible:ring-2 focus-visible:ring-ring/40'
                  )}
                  onClick={() => setQty(type, qty + 1)}
                >
                  <Plus className='h-3 w-3' />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {summary ? (
        <p
          data-testid='cargo-volume-summary'
          className='text-sm leading-snug text-muted-foreground tabular-nums'
        >
          {summary}
        </p>
      ) : null}
    </div>
  )
}
