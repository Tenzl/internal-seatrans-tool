'use client'

import { useQuery } from '@tanstack/react-query'
import { commodityService } from '@/modules/gallery/services/commodityService'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TRANSPORT_FILLED_FIELD_RING } from './TransportDocumentField'
import { resolveSelectFieldOptions } from './transportDocumentFormConfig'

interface BookingCommoditySelectProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

/** Booking commodity picker — freight-forwarding commodities only. */
export function BookingCommoditySelect({
  value,
  onChange,
  disabled = false,
}: BookingCommoditySelectProps) {
  const optionsQuery = useQuery({
    queryKey: ['admin', 'commodities', 'booking-options'],
    queryFn: () => commodityService.listBookingOptions(),
  })

  const options = (optionsQuery.data ?? []).map((option) => ({
    value: option.displayLabel,
    label: option.displayLabel,
  }))
  const resolved = resolveSelectFieldOptions(options, value)
  const isFilled = value.trim().length > 0

  return (
    <div className='space-y-1.5'>
      <Label
        htmlFor='transport-document-commodity'
        className='text-sm font-medium text-muted-foreground'
      >
        Commodity
      </Label>
      <Select
        value={value || '__empty__'}
        disabled={disabled || optionsQuery.isPending}
        onValueChange={(next) => onChange(next === '__empty__' ? '' : next)}
      >
        <SelectTrigger
          id='transport-document-commodity'
          className={cn(
            'w-full bg-background',
            isFilled ? TRANSPORT_FILLED_FIELD_RING : undefined
          )}
        >
          <SelectValue
            placeholder={
              optionsQuery.isPending
                ? 'Loading commodities...'
                : optionsQuery.isError
                  ? 'Failed to load commodities'
                  : options.length === 0
                    ? 'No freight-forwarding commodities'
                    : 'Select commodity'
            }
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='__empty__'>Select commodity</SelectItem>
          {resolved.map((option) => (
            <SelectItem
              key={option.value || '__empty-option__'}
              value={option.value || '__empty-option__'}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {optionsQuery.isError ? (
        <p className='text-xs text-destructive'>
          Could not load freight-forwarding commodities. Check commodities
          access or try again.
        </p>
      ) : null}
    </div>
  )
}
