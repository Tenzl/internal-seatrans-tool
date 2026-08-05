import { PortNameSearchSelect } from '@/modules/logistics/components/PortNameSearchSelect'
import { DateTimePicker } from '@/shared/components/DateTimePicker'
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
import { PartySearchSelect } from './PartySearchSelect'
import { formatPartyDocumentValue } from './partyPickerModel'
import {
  TRANSPORT_FIELD_SPAN_CLASS,
  type TransportDocumentFieldSpec,
} from './transportDocumentFormConfig'

interface TransportDocumentFieldProps {
  field: TransportDocumentFieldSpec
  value: string
  selectedPartyId?: number | null
  onChange: (value: unknown) => void
  onPartyIdChange?: (value: number | null) => void
  disabled?: boolean
}

export function TransportDocumentField({
  field,
  value,
  selectedPartyId,
  onChange,
  onPartyIdChange,
  disabled = false,
}: TransportDocumentFieldProps) {
  const id = `transport-document-${field.key}`

  return (
    <div
      className={`space-y-1.5 ${TRANSPORT_FIELD_SPAN_CLASS[field.span ?? 1]}`}
    >
      <Label htmlFor={id} className='text-xs font-medium text-muted-foreground'>
        {field.label}
      </Label>
      {field.kind === 'party' ? (
        <PartySearchSelect
          id={id}
          value={selectedPartyId ?? null}
          documentValue={value}
          additionType={field.additionType}
          customerType={field.customerType}
          disabled={disabled}
          onChange={(option: PartnerOption | null) => {
            onChange(option ? formatPartyDocumentValue(option) : '')
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
          onChange={(event) => onChange(event.target.value)}
          className='min-h-20 resize-y bg-background'
        />
      ) : field.kind === 'select' && field.options ? (
        <Select
          value={value || '__empty__'}
          onValueChange={(next) => onChange(next === '__empty__' ? '' : next)}
        >
          <SelectTrigger id={id} className='bg-background'>
            <SelectValue placeholder={field.placeholder ?? 'Select'} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
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
          onValueChange={onChange}
          placeholder={field.placeholder ?? 'Search port name...'}
        />
      ) : field.kind === 'date' || field.kind === 'datetime-local' ? (
        <DateTimePicker
          id={id}
          value={value}
          onValueChange={onChange}
          includeTime={field.kind === 'datetime-local'}
          placeholder={field.placeholder}
        />
      ) : (
        <Input
          id={id}
          type='text'
          value={value}
          maxLength={500}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
          className='bg-background'
        />
      )}
    </div>
  )
}
