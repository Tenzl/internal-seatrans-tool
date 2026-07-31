import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  TRANSPORT_FIELD_SPAN_CLASS,
  type TransportDocumentFieldSpec,
} from './transportDocumentFormConfig'

interface TransportDocumentFieldProps {
  field: TransportDocumentFieldSpec
  value: string
  onChange: (value: string) => void
}

export function TransportDocumentField({
  field,
  value,
  onChange,
}: TransportDocumentFieldProps) {
  const id = `transport-document-${field.key}`

  return (
    <div
      className={`space-y-1.5 ${TRANSPORT_FIELD_SPAN_CLASS[field.span ?? 1]}`}
    >
      <Label htmlFor={id} className='text-xs font-medium text-muted-foreground'>
        {field.label}
      </Label>
      {field.kind === 'textarea' ? (
        <Textarea
          id={id}
          value={value}
          rows={3}
          maxLength={2_000}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
          className='min-h-20 resize-y bg-background'
        />
      ) : (
        <Input
          id={id}
          type={
            field.kind === 'date' || field.kind === 'datetime-local'
              ? field.kind
              : 'text'
          }
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
