import { PortNameSearchSelect } from '@/modules/logistics/components/PortNameSearchSelect'
import { DateTimePicker } from '@/shared/components/DateTimePicker'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { PartnerOption } from '../partner-management/partnerManagementService'
import { InternalUserSearchSelect } from './InternalUserSearchSelect'
import { PartySearchSelect } from './PartySearchSelect'
import { formatPartyFieldValue } from './partyPickerModel'
import {
  resolveSelectFieldOptions,
  TRANSPORT_FIELD_SPAN_CLASS,
  type TransportDocumentFieldSpec,
} from './transportDocumentFormConfig'

/**
 * Light blue ring for non-empty transport-document fields so entered values
 * read differently from blank ones (matches sky accents elsewhere in this section).
 */
export const TRANSPORT_FILLED_FIELD_RING =
  'border-sky-300 ring-[3px] ring-sky-200/70 focus-visible:border-ring focus-visible:ring-ring/50'

interface TransportDocumentFieldProps {
  field: TransportDocumentFieldSpec
  value: string
  selectedPartyId?: number | null
  selectedInternalUserId?: number | null
  selectedPortId?: number | null
  onChange: (value: unknown) => void
  onPartyIdChange?: (value: number | null) => void
  onInternalUserIdChange?: (value: number | null) => void
  onPortIdChange?: (value: number | null) => void
  disabled?: boolean
  required?: boolean
}

export function TransportDocumentField({
  field,
  value,
  selectedPartyId,
  selectedInternalUserId,
  selectedPortId,
  onChange,
  onPartyIdChange,
  onInternalUserIdChange,
  onPortIdChange,
  disabled = false,
  required = false,
}: TransportDocumentFieldProps) {
  const id = `transport-document-${field.key}`
  const isFilled = value.trim().length > 0
  const filledRingClass = isFilled ? TRANSPORT_FILLED_FIELD_RING : undefined

  return (
    <div
      className={`space-y-1.5 ${TRANSPORT_FIELD_SPAN_CLASS[field.span ?? 1]}`}
    >
      <Label
        htmlFor={id}
        className={
          field.labelEmphasis === 'strong'
            ? 'text-sm font-semibold text-foreground'
            : 'text-sm font-medium text-muted-foreground'
        }
      >
        {field.label}
        {required ? (
          <span className='ml-1 text-destructive' aria-hidden='true'>
            *
          </span>
        ) : null}
      </Label>
      {field.kind === 'party' ? (
        <PartySearchSelect
          id={id}
          value={selectedPartyId ?? null}
          documentValue={value}
          additionType={field.additionType}
          customerType={field.customerType}
          partyValueMode={field.partyValueMode ?? 'full'}
          disabled={disabled}
          className={filledRingClass}
          onChange={(option: PartnerOption | null) => {
            onChange(
              option
                ? formatPartyFieldValue(option, field.partyValueMode ?? 'full')
                : ''
            )
            onPartyIdChange?.(option?.id ?? null)
          }}
          placeholder={field.placeholder ?? `Search ${field.label} name...`}
        />
      ) : field.kind === 'textarea' ? (
        <Textarea
          id={id}
          value={value}
          rows={3}
          maxLength={4_000}
          placeholder={field.placeholder}
          disabled={disabled}
          readOnly={disabled}
          aria-required={required || undefined}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            'min-h-20 resize-y bg-background disabled:cursor-not-allowed disabled:opacity-70',
            filledRingClass
          )}
        />
      ) : field.kind === 'select' && field.options ? (
        <Select
          value={value || '__empty__'}
          disabled={disabled}
          onValueChange={(next) => onChange(next === '__empty__' ? '' : next)}
        >
          <SelectTrigger
            id={id}
            aria-required={required || undefined}
            className={cn('w-full bg-background', filledRingClass)}
          >
            <SelectValue placeholder={field.placeholder ?? 'Select'} />
          </SelectTrigger>
          <SelectContent>
            {resolveSelectFieldOptions(field.options, value).map((option) => (
              <SelectItem
                key={option.value || '__empty__'}
                value={option.value || '__empty__'}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.kind === 'port-name' ? (
        <PortNameSearchSelect
          id={id}
          value={value}
          selectedPortId={selectedPortId}
          disabled={disabled}
          onValueChange={onChange}
          onPortIdChange={onPortIdChange}
          placeholder={field.placeholder ?? 'Search port name...'}
          className={filledRingClass}
        />
      ) : field.kind === 'internal-user' ? (
        <InternalUserSearchSelect
          id={id}
          value={value}
          selectedId={selectedInternalUserId}
          disabled={disabled}
          onChange={(next, userId) => {
            onChange(next)
            onInternalUserIdChange?.(userId)
          }}
          placeholder={field.placeholder ?? 'Search internal user...'}
          className={filledRingClass}
        />
      ) : field.kind === 'date' || field.kind === 'datetime-local' ? (
        <DateTimePicker
          id={id}
          value={value}
          disabled={disabled}
          onValueChange={onChange}
          includeTime={field.kind === 'datetime-local'}
          placeholder={field.placeholder}
          className={filledRingClass}
        />
      ) : (
        <Input
          id={id}
          type='text'
          value={value}
          maxLength={500}
          placeholder={field.placeholder}
          disabled={disabled}
          readOnly={disabled}
          aria-required={required || undefined}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            'bg-background disabled:cursor-not-allowed disabled:opacity-70',
            filledRingClass
          )}
        />
      )}
    </div>
  )
}
