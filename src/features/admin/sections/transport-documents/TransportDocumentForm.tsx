import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CargoRowsEditor } from './CargoRowsEditor'
import { TransportDocumentField } from './TransportDocumentField'
import type { CargoRow, TransportDocumentType } from './transportDocument.types'
import {
  getTransportDocumentDefinition,
  TRANSPORT_DOCUMENT_FORM_SECTIONS,
} from './transportDocumentFormConfig'

interface TransportDocumentFormProps {
  documentType: TransportDocumentType
  values: Record<string, unknown>
  cargoRows: CargoRow[] | null
  isGenerating: boolean
  onFieldChange: (key: string, value: string) => void
  onCargoRowsChange: (rows: CargoRow[]) => void
  onSubmit: () => void
}

export function TransportDocumentForm({
  documentType,
  values,
  cargoRows,
  isGenerating,
  onFieldChange,
  onCargoRowsChange,
  onSubmit,
}: TransportDocumentFormProps) {
  const document = getTransportDocumentDefinition(documentType)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className='space-y-5'
    >
      {TRANSPORT_DOCUMENT_FORM_SECTIONS[documentType].map((section) => (
        <section
          key={section.title}
          className='space-y-3 border-t border-border/60 pt-5 first:border-t-0 first:pt-0'
        >
          <div>
            <h2 className='text-sm font-semibold'>{section.title}</h2>
            {section.description ? (
              <p className='text-xs text-muted-foreground'>
                {section.description}
              </p>
            ) : null}
          </div>
          <div className='grid gap-x-4 gap-y-3 md:grid-cols-2 xl:grid-cols-3'>
            {section.fields.map((field) => (
              <TransportDocumentField
                key={field.key}
                field={field}
                value={String(values[field.key] ?? '')}
                onChange={(value) => onFieldChange(field.key, value)}
              />
            ))}
          </div>
        </section>
      ))}

      {cargoRows ? (
        <CargoRowsEditor rows={cargoRows} onChange={onCargoRowsChange} />
      ) : null}

      <div className='sticky bottom-3 flex justify-end border-t border-border/60 bg-background/95 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
        <Button type='submit' disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
          ) : (
            <Save className='mr-1.5 h-4 w-4' />
          )}
          Save & Preview {document.shortLabel}
        </Button>
      </div>
    </form>
  )
}
