'use client'

import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import type { BookingFlow } from './transportDocument.types'

const FLOW_OPTIONS: readonly {
  value: BookingFlow
  title: string
  description: string
  icon: typeof ArrowDownToLine
}[] = [
  {
    value: 'IMPORT',
    title: 'Import',
    description: 'Inbound shipment — Booking → Arrival Notice → Delivery Order',
    icon: ArrowDownToLine,
  },
  {
    value: 'EXPORT',
    title: 'Export',
    description: 'Outbound shipment — Booking → Arrival Notice → Bill of Lading',
    icon: ArrowUpFromLine,
  },
]

interface BookingFlowChooserProps {
  value: BookingFlow | null
  disabled?: boolean
  onChange: (flow: BookingFlow) => void
}

/** Prominent Import / Export step before the booking confirmation form. */
export function BookingFlowChooser({
  value,
  disabled = false,
  onChange,
}: BookingFlowChooserProps) {
  return (
    <section className='space-y-3' aria-labelledby='booking-flow-heading'>
      <div className='space-y-1'>
        <h2
          id='booking-flow-heading'
          className='text-base font-semibold tracking-tight text-foreground'
        >
          Booking flow
        </h2>
        <p className='max-w-2xl text-base leading-relaxed text-muted-foreground'>
          Choose Import or Export. This sets the document chain for this booking.
        </p>
      </div>
      <RadioGroup
        value={value ?? undefined}
        onValueChange={(next) => {
          if (next === 'IMPORT' || next === 'EXPORT') onChange(next)
        }}
        disabled={disabled}
        className='grid gap-3 sm:grid-cols-2'
        aria-required
      >
        {FLOW_OPTIONS.map((option) => {
          const selected = value === option.value
          const Icon = option.icon
          const itemId = `booking-flow-${option.value.toLowerCase()}`
          return (
            <Label
              key={option.value}
              htmlFor={itemId}
              className={cn(
                'relative flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-4 transition-[border-color,background-color,box-shadow,transform] duration-200',
                'hover:border-primary/40 hover:bg-accent/40',
                'active:scale-[0.99]',
                'has-[:focus-visible]:border-ring has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50',
                selected
                  ? 'border-primary bg-primary/[0.04] shadow-[0_1px_2px_oklch(0.44_0.145_255_/_0.12)]'
                  : 'border-border/80',
                disabled && 'pointer-events-none opacity-60'
              )}
            >
              <RadioGroupItem
                id={itemId}
                value={option.value}
                className='mt-0.5'
              />
              <span className='min-w-0 flex-1 space-y-1'>
                <span className='flex items-center gap-2 text-base font-semibold tracking-tight text-foreground'>
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      selected ? 'text-primary' : 'text-muted-foreground'
                    )}
                    aria-hidden
                  />
                  {option.title}
                </span>
                <span className='block text-base leading-relaxed text-muted-foreground'>
                  {option.description}
                </span>
              </span>
            </Label>
          )
        })}
      </RadioGroup>
    </section>
  )
}
