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
  selectedId?: number | null
  onChange: (value: string, id: number | null) => void
  disabled?: boolean
}

const EMPTY_COMMODITY_VALUE = '__empty__'

/** Booking commodity picker — freight-forwarding commodities only. */
export function BookingCommoditySelect({
  value,
  selectedId,
  onChange,
  disabled = false,
}: BookingCommoditySelectProps) {
  const optionsQuery = useQuery({
    queryKey: ['admin', 'commodities', 'booking-options'],
    queryFn: () => commodityService.listBookingOptions(),
  })

  const options = (optionsQuery.data ?? []).map((option) => ({
    value: String(option.id),
    label: option.displayLabel,
  }))
  const selectedValue = selectedId
    ? String(selectedId)
    : value
      ? `legacy:${value}`
      : EMPTY_COMMODITY_VALUE
  const resolved = resolveSelectFieldOptions(
    options,
    selectedValue === EMPTY_COMMODITY_VALUE ? '' : selectedValue
  ).map((option) =>
    option.value === selectedValue && option.label === selectedValue
      ? { ...option, label: value }
      : option
  )
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
        value={selectedValue}
        disabled={disabled || optionsQuery.isPending}
        onValueChange={(next) => {
          if (next === EMPTY_COMMODITY_VALUE) {
            onChange('', null)
            return
          }
          const option = optionsQuery.data?.find(
            (item) => String(item.id) === next
          )
          if (option) onChange(option.displayLabel, option.id)
        }}
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
          <SelectItem value={EMPTY_COMMODITY_VALUE}>
            Select commodity
          </SelectItem>
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
