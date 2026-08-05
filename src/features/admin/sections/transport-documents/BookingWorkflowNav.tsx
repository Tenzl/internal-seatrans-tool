import { Check, Circle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  buildBookingWorkflowUrl,
  getBookingWorkflowSteps,
} from './bookingWorkflow'
import type {
  BookingFlow,
  BookingWorkflow,
  TransportDocumentType,
} from './transportDocument.types'
import { getTransportDocumentDefinition } from './transportDocumentFormConfig'

export function BookingWorkflowNav({
  activeType,
  bookingId,
  flow,
  workflow,
}: {
  activeType: TransportDocumentType
  bookingId: number
  flow: BookingFlow
  workflow: BookingWorkflow | null
}) {
  const steps = getBookingWorkflowSteps(flow)
  return (
    <nav aria-label={`${flow.toLowerCase()} booking workflow`}>
      <div className='grid grid-cols-3 overflow-hidden rounded-lg border bg-muted/30 p-1'>
        {steps.map((type, index) => {
          const record = workflow?.documents[type]
          const definition = getTransportDocumentDefinition(type)
          const isActive = type === activeType
          const previousType = index > 0 ? steps[index - 1] : null
          const isAvailable =
            previousType == null || Boolean(workflow?.documents[previousType])
          const content = (
            <>
              {record ? (
                <Check className='h-4 w-4 shrink-0 text-success' />
              ) : (
                <Circle className='h-3.5 w-3.5 shrink-0' />
              )}
              <span className='truncate'>
                {index + 1}. {definition.shortLabel}
              </span>
            </>
          )
          const className = cn(
            'flex min-w-0 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
            isActive
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
            !isAvailable && 'cursor-not-allowed opacity-45 hover:bg-transparent'
          )
          return isAvailable ? (
            <Link
              key={type}
              href={buildBookingWorkflowUrl(flow, bookingId, type, record)}
              aria-current={isActive ? 'step' : undefined}
              className={className}
            >
              {content}
            </Link>
          ) : (
            <span key={type} aria-disabled='true' className={className}>
              {content}
            </span>
          )
        })}
      </div>
    </nav>
  )
}
