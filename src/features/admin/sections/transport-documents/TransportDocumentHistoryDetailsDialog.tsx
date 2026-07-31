import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { TransportDocumentRecord } from './transportDocument.types'
import {
  CARGO_ROW_COLUMNS,
  getTransportDocumentDefinition,
} from './transportDocumentFormConfig'
import { getHistoryDocumentSections } from './transportDocumentHistoryRules'

interface TransportDocumentHistoryDetailsDialogProps {
  record: TransportDocumentRecord | null
  onOpenChange: (open: boolean) => void
}

export function TransportDocumentHistoryDetailsDialog({
  record,
  onOpenChange,
}: TransportDocumentHistoryDetailsDialogProps) {
  if (!record) return null

  const document = getTransportDocumentDefinition(record.documentType)
  const sections = getHistoryDocumentSections(record)

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] max-w-5xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            {document.label} ·{' '}
            {record.referenceNumber || `Record #${record.id}`}
          </DialogTitle>
          <DialogDescription>
            Immutable snapshot created{' '}
            {new Date(record.createdAt).toLocaleString()}.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-5'>
          {sections.map((section) => (
            <section key={section.title} className='space-y-2'>
              <h3 className='border-b pb-1 text-sm font-semibold'>
                {section.title}
              </h3>
              {section.fields ? (
                <dl className='grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3'>
                  {section.fields.map((field) => (
                    <div key={field.label} className='min-w-0'>
                      <dt className='text-xs text-muted-foreground'>
                        {field.label}
                      </dt>
                      <dd className='mt-0.5 text-sm break-words whitespace-pre-wrap'>
                        {field.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {section.cargoRows ? (
                <div className='overflow-x-auto rounded-md border'>
                  <table className='w-full min-w-[760px] text-left text-xs'>
                    <thead className='bg-muted/70'>
                      <tr>
                        {CARGO_ROW_COLUMNS.map((column) => (
                          <th
                            key={column.key}
                            className='px-2 py-2 font-medium'
                          >
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.cargoRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={CARGO_ROW_COLUMNS.length}
                            className='px-2 py-5 text-center text-muted-foreground'
                          >
                            No cargo rows.
                          </td>
                        </tr>
                      ) : (
                        section.cargoRows.map((row, index) => (
                          <tr key={index} className='border-t'>
                            {CARGO_ROW_COLUMNS.map((column) => (
                              <td
                                key={column.key}
                                className='px-2 py-2 align-top whitespace-pre-wrap'
                              >
                                {row[column.key] || '—'}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
