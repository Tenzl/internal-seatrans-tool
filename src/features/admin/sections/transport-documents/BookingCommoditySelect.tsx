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
  commodityType: string
  commodityTypeId?: number | null
  commodityName: string
  commodityId?: number | null
  /** Legacy combined description, used only as a missing Commodity fallback. */
  description: string
  onTypeChange: (name: string, id: number | null) => void
  onCommodityChange: (name: string, id: number | null) => void
  disabled?: boolean
}

interface CatalogOption {
  id: number
  name: string
}

const EMPTY_VALUE = '__empty__'

function resolveCatalogSelect(
  options: CatalogOption[],
  selectedId: number | null | undefined,
  snapshot: string,
  legacyKey: string
) {
  const selectedValue = selectedId
    ? String(selectedId)
    : snapshot
      ? `legacy:${legacyKey}:${snapshot}`
      : EMPTY_VALUE
  const selectOptions = options.map((option) => ({
    value: String(option.id),
    label: option.name,
  }))
  const resolved = resolveSelectFieldOptions(
    selectOptions,
    selectedValue === EMPTY_VALUE ? '' : selectedValue
  ).map((option) => {
    if (option.value !== selectedValue) return option
    return { ...option, label: snapshot || option.label }
  })
  return { selectedValue, resolved }
}

/** Independent Freight Forwarding Type and Commodity catalog controls. */
export function BookingCommoditySelect({
  commodityType,
  commodityTypeId,
  commodityName,
  commodityId,
  description,
  onTypeChange,
  onCommodityChange,
  disabled = false,
}: BookingCommoditySelectProps) {
  const serviceQuery = useQuery({
    queryKey: ['admin', 'booking', 'service', 'freight-forwarding'],
    queryFn: ({ signal }) =>
      commodityService.resolveServiceTypeId('freight-forwarding', signal),
    staleTime: 5 * 60 * 1000,
  })
  const serviceTypeId = serviceQuery.data
  const typeQuery = useQuery({
    queryKey: [
      'admin',
      'booking',
      'commodity-types',
      'freight-forwarding',
      serviceTypeId,
    ],
    queryFn: ({ signal }) =>
      commodityService.listCommodityTypes(serviceTypeId as number, signal),
    enabled: serviceTypeId != null,
  })
  const commodityQuery = useQuery({
    queryKey: [
      'admin',
      'booking',
      'commodities',
      'freight-forwarding',
      serviceTypeId,
    ],
    queryFn: ({ signal }) =>
      commodityService.listAdminCommodities(serviceTypeId as number, signal),
    enabled: serviceTypeId != null,
  })

  const typeOptions = (typeQuery.data ?? []).map((option) => ({
    id: option.id,
    name: option.name,
  }))
  const commodityOptions = (commodityQuery.data ?? []).map((option) => ({
    id: option.id,
    name: option.displayName || option.name,
  }))
  const typeSelect = resolveCatalogSelect(
    typeOptions,
    commodityTypeId,
    commodityType,
    'type'
  )
  const legacyCommoditySnapshot =
    commodityName || (!commodityType ? description : '')
  const commoditySelect = resolveCatalogSelect(
    commodityOptions,
    commodityId,
    legacyCommoditySnapshot,
    'commodity'
  )
  const typePending = serviceQuery.isPending || typeQuery.isPending
  const commodityPending = serviceQuery.isPending || commodityQuery.isPending
  const typeError = serviceQuery.isError || typeQuery.isError
  const commodityError = serviceQuery.isError || commodityQuery.isError

  return (
    <>
      <div className='space-y-1.5'>
        <Label
          htmlFor='transport-document-commodity-type'
          className='text-sm font-medium text-muted-foreground'
        >
          Type
        </Label>
        <Select
          value={typeSelect.selectedValue}
          disabled={disabled || (typePending && !commodityType)}
          onValueChange={(next) => {
            if (next === EMPTY_VALUE) {
              onTypeChange('', null)
              return
            }
            const option = typeQuery.data?.find(
              (item) => String(item.id) === next
            )
            if (option) onTypeChange(option.name, option.id)
          }}
        >
          <SelectTrigger
            id='transport-document-commodity-type'
            className={cn(
              'w-full bg-background',
              commodityType.trim() ? TRANSPORT_FILLED_FIELD_RING : undefined
            )}
          >
            <SelectValue
              placeholder={
                typePending
                  ? 'Loading types...'
                  : typeError
                    ? 'Type catalog unavailable'
                    : typeOptions.length === 0
                      ? 'No freight-forwarding types'
                      : 'Select type'
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EMPTY_VALUE}>Select type</SelectItem>
            {typeSelect.resolved.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {typeError ? (
          <p className='text-xs text-destructive'>
            Could not load Types. The saved value is still available.
          </p>
        ) : null}
      </div>

      <div className='space-y-1.5'>
        <Label
          htmlFor='transport-document-commodity'
          className='text-sm font-medium text-muted-foreground'
        >
          Commodity
        </Label>
        <Select
          value={commoditySelect.selectedValue}
          disabled={disabled || (commodityPending && !legacyCommoditySnapshot)}
          onValueChange={(next) => {
            if (next === EMPTY_VALUE) {
              onCommodityChange('', null)
              return
            }
            const option = commodityQuery.data?.find(
              (item) => String(item.id) === next
            )
            if (option) {
              onCommodityChange(option.displayName || option.name, option.id)
            }
          }}
        >
          <SelectTrigger
            id='transport-document-commodity'
            className={cn(
              'w-full bg-background',
              legacyCommoditySnapshot.trim()
                ? TRANSPORT_FILLED_FIELD_RING
                : undefined
            )}
          >
            <SelectValue
              placeholder={
                commodityPending
                  ? 'Loading commodities...'
                  : commodityError
                    ? 'Commodity catalog unavailable'
                    : commodityOptions.length === 0
                      ? 'No freight-forwarding commodities'
                      : 'Select commodity'
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EMPTY_VALUE}>Select commodity</SelectItem>
            {commoditySelect.resolved.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {commodityError ? (
          <p className='text-xs text-destructive'>
            Could not load Commodities. The saved value is still available.
          </p>
        ) : null}
      </div>
    </>
  )
}
