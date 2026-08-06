import { Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { NumberInput } from '@/shared/components/NumberInput'
import { formatNumberInputValue } from '@/shared/utils/numberInput'
import {
  AN_CONTAINER_MAX_ROWS,
  AN_CONTAINER_TYPE_OPTIONS,
  anNumericInputValue,
  emptyAnContainer,
  summarizeAnContainers,
} from './anContainerModel'
import { PackageTypeCombobox } from './PackageTypeCombobox'
import type { AnContainer } from './transportDocument.types'
import { AN_CONTAINER_COLUMNS } from './transportDocumentFormConfig'

interface AnContainersEditorProps {
  rows: AnContainer[]
  onChange: (rows: AnContainer[]) => void
  /** When true: no Add/Delete and cells are not editable. */
  readOnly?: boolean
}

const NUMERIC_COLUMN_KEYS = new Set<keyof AnContainer>([
  'grossWeight',
  'measurement',
])

/**
 * minmax + fr fills the scrollport so leftover track space never shows as a
 * colored gutter after the delete column. Narrow viewports still scroll.
 */
const GRID_COLS =
  'grid-cols-[2.25rem_minmax(5.75rem,0.85fr)_minmax(7.5rem,1.1fr)_minmax(6.75rem,1fr)_minmax(5.75rem,0.9fr)_minmax(5.25rem,0.85fr)_minmax(4.5rem,0.7fr)_minmax(4.5rem,0.7fr)_minmax(5.75rem,0.9fr)_minmax(6.5rem,1.15fr)_minmax(5rem,0.8fr)_2.5rem]'

const GRID_COLS_READONLY =
  'grid-cols-[2.25rem_minmax(5.75rem,0.85fr)_minmax(7.5rem,1.1fr)_minmax(6.75rem,1fr)_minmax(5.75rem,0.9fr)_minmax(5.25rem,0.85fr)_minmax(4.5rem,0.7fr)_minmax(4.5rem,0.7fr)_minmax(5.75rem,0.9fr)_minmax(6.5rem,1.15fr)_minmax(5rem,0.8fr)]'

const cellControlClassName =
  'min-h-9 w-full resize-none rounded-none border-0 bg-background px-2 py-1.5 text-sm leading-snug break-words whitespace-pre-wrap shadow-none field-sizing-content focus-visible:relative focus-visible:ring-1 focus-visible:ring-ring'

const numberCellClassName =
  'min-h-9 h-auto w-full rounded-none border-0 bg-background px-2 py-1.5 text-sm tabular-nums shadow-none focus-visible:border-transparent focus-visible:ring-1 focus-visible:ring-ring'

const typeSelectTriggerClassName =
  'min-h-9 h-auto w-full self-stretch justify-between rounded-none border-0 bg-background px-2 text-sm font-normal shadow-none focus-visible:relative focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70 data-placeholder:text-muted-foreground'

const TYPE_EMPTY_VALUE = '__empty__'

function formatSummaryNumber(value: number, decimalScale: 0 | 3 = 3): string {
  if (value === 0) return '0'
  return formatNumberInputValue(value, decimalScale)
}

export function AnContainersEditor({
  rows,
  onChange,
  readOnly = false,
}: AnContainersEditorProps) {
  const summary = summarizeAnContainers(rows)
  const gridCols = readOnly ? GRID_COLS_READONLY : GRID_COLS

  const updateRow = (
    index: number,
    field: keyof AnContainer,
    value: string
  ) => {
    if (readOnly) return
    onChange(
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      )
    )
  }

  return (
    <div data-testid='an-containers-editor' className='space-y-3'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='space-y-0.5'>
          <p className='text-sm font-medium text-muted-foreground'>
            Container rows
          </p>
          <p className='text-sm leading-snug text-muted-foreground/80'>
            {readOnly
              ? 'Mapped from Arrival Notice — not editable here.'
              : `Up to ${AN_CONTAINER_MAX_ROWS} rows. One PDF line per container.`}
          </p>
        </div>
        {readOnly ? null : (
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={rows.length >= AN_CONTAINER_MAX_ROWS}
            onClick={() => onChange([...rows, emptyAnContainer()])}
          >
            <Plus className='mr-1.5 h-4 w-4' /> Add New
          </Button>
        )}
      </div>
      <div className='overflow-x-auto rounded-md border border-border/70 bg-background'>
        <div className='min-w-[72rem]'>
          <div
            className={`grid ${gridCols} gap-px bg-border text-xs font-medium tracking-wide text-table-header-foreground`}
          >
            {[
              'No',
              ...AN_CONTAINER_COLUMNS.map((column) => column.label),
              ...(readOnly ? [] : ['']),
            ].map((label) => (
              <div
                key={label || 'actions'}
                className='bg-table-header px-2.5 py-2 leading-snug break-words whitespace-normal'
              >
                {label}
              </div>
            ))}
          </div>
          {rows.length === 0 ? (
            <div className='border-t border-border/70 bg-background px-3 py-6 text-center text-sm text-muted-foreground'>
              {readOnly
                ? 'No containers on Arrival Notice yet.'
                : 'No containers yet. Click Add New to start.'}
            </div>
          ) : (
            rows.map((row, index) => (
              <div
                key={index}
                className={`grid ${gridCols} gap-px border-t border-border/70 bg-border`}
              >
                <div className='flex items-start justify-center bg-background px-2 pt-2.5 text-xs text-muted-foreground'>
                  {index + 1}
                </div>
                {AN_CONTAINER_COLUMNS.map((column) => {
                  if (column.key === 'type') {
                    return (
                      <Select
                        key={column.key}
                        value={row.type || TYPE_EMPTY_VALUE}
                        disabled={readOnly}
                        onValueChange={(next) =>
                          updateRow(
                            index,
                            'type',
                            next === TYPE_EMPTY_VALUE ? '' : next
                          )
                        }
                      >
                        <SelectTrigger
                          aria-label={`Type, container row ${index + 1}`}
                          className={typeSelectTriggerClassName}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AN_CONTAINER_TYPE_OPTIONS.map((option) => (
                            <SelectItem
                              key={option.value || 'empty'}
                              value={option.value || TYPE_EMPTY_VALUE}
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )
                  }

                  if (column.key === 'packageType') {
                    return (
                      <PackageTypeCombobox
                        key={column.key}
                        value={row.packageType}
                        aria-label={`Package type, container row ${index + 1}`}
                        disabled={readOnly}
                        onValueChange={(next) =>
                          updateRow(index, 'packageType', next)
                        }
                      />
                    )
                  }

                  if (column.key === 'noOfPkgs') {
                    return (
                      <NumberInput
                        key={column.key}
                        value={anNumericInputValue(row.noOfPkgs)}
                        decimalScale={0}
                        maxLength={column.maxLength}
                        aria-label={`No of Pkgs, container row ${index + 1}`}
                        disabled={readOnly}
                        readOnly={readOnly}
                        onValueChange={(_value, canonical) =>
                          updateRow(index, 'noOfPkgs', canonical)
                        }
                        className={numberCellClassName}
                      />
                    )
                  }

                  if (NUMERIC_COLUMN_KEYS.has(column.key)) {
                    return (
                      <NumberInput
                        key={column.key}
                        value={anNumericInputValue(row[column.key])}
                        decimalScale={3}
                        maxLength={column.maxLength}
                        aria-label={`${column.label}, container row ${index + 1}`}
                        disabled={readOnly}
                        readOnly={readOnly}
                        onValueChange={(_value, canonical) =>
                          updateRow(index, column.key, canonical)
                        }
                        className={numberCellClassName}
                      />
                    )
                  }

                  return (
                    <Textarea
                      key={column.key}
                      value={row[column.key]}
                      maxLength={column.maxLength}
                      rows={1}
                      aria-label={`${column.label}, container row ${index + 1}`}
                      readOnly={readOnly}
                      disabled={readOnly}
                      onChange={(event) =>
                        updateRow(index, column.key, event.target.value)
                      }
                      className={`${cellControlClassName} disabled:cursor-not-allowed disabled:opacity-70`}
                    />
                  )
                })}
                {readOnly ? null : (
                  <div className='flex items-start justify-center bg-background pt-1'>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 text-muted-foreground hover:text-destructive'
                      onClick={() =>
                        onChange(
                          rows.filter((_, rowIndex) => rowIndex !== index)
                        )
                      }
                      aria-label={`Remove container row ${index + 1}`}
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {rows.length > 0 ? (
        <div
          data-testid='an-containers-summary'
          className='flex justify-end'
        >
          <dl className='grid min-w-[16rem] grid-cols-[auto_auto] gap-x-6 gap-y-1.5 text-base'>
            <dt className='text-muted-foreground'>Total Shipment:</dt>
            <dd className='flex flex-wrap justify-end gap-1.5'>
              {summary.shipmentBadges.length === 0 ? (
                <span className='text-muted-foreground'>—</span>
              ) : (
                summary.shipmentBadges.map((badge) => (
                  <Badge
                    key={badge}
                    variant='outline'
                    className='rounded-sm border-sky-300/80 bg-sky-50/80 font-medium text-sky-800'
                  >
                    {badge}
                  </Badge>
                ))
              )}
            </dd>

            <dt className='text-muted-foreground'>Gross Weight (KGS):</dt>
            <dd className='text-right tabular-nums'>
              {formatSummaryNumber(summary.totalGrossWeight)}
            </dd>

            <dt className='text-muted-foreground'>Net Weight (KGS):</dt>
            <dd className='text-right tabular-nums text-muted-foreground' />

            <dt className='text-muted-foreground'>Total Measurement (CBM):</dt>
            <dd className='text-right tabular-nums'>
              {formatSummaryNumber(summary.totalMeasurement)}
            </dd>

            <dt className='text-muted-foreground'>Total No of Pkg:</dt>
            <dd className='text-right tabular-nums'>
              {formatSummaryNumber(summary.totalNoOfPkgs, 0)}
            </dd>

            <dt className='text-muted-foreground'>Package type:</dt>
            <dd className='text-right'>
              {summary.packageTypes || (
                <span className='text-muted-foreground'>—</span>
              )}
            </dd>
          </dl>
        </div>
      ) : null}
    </div>
  )
}
