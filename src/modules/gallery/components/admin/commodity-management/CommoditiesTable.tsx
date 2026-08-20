import { useCallback, useMemo, useRef, useState } from 'react'
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { Commodity } from '@/modules/gallery/services/commodityService'
import { Boxes, Package, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTableContent } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { CatalogRowActions } from './CatalogRowActions'
import type { CommodityInput } from './useCommodities'

interface CommoditiesTableProps {
  commodities: Commodity[]
  loading: boolean
  canManage: boolean
  onCreate: (input: CommodityInput) => Promise<boolean>
  onUpdate: (id: number, input: CommodityInput) => Promise<boolean>
  onDelete: (id: number) => Promise<boolean>
}

const EMPTY_INPUT: CommodityInput = {
  displayName: '',
  description: '',
}

export function CommoditiesTable({
  commodities,
  loading,
  canManage,
  onCreate,
  onUpdate,
  onDelete,
}: CommoditiesTableProps) {
  const [createInput, setCreateInput] = useState(EMPTY_INPUT)
  const [editingId, setEditingId] = useState<number | null>(null)
  const editingIdRef = useRef<number | null>(null)
  const editingInputRef = useRef(EMPTY_INPUT)

  const submitCreate = async () => {
    if (await onCreate(createInput)) setCreateInput(EMPTY_INPUT)
  }

  const startEdit = useCallback((commodity: Commodity) => {
    editingIdRef.current = commodity.id
    setEditingId(commodity.id)
    const nextInput = {
      displayName: commodity.displayName,
      description: commodity.description ?? '',
    }
    editingInputRef.current = nextInput
  }, [])

  const cancelEdit = useCallback(() => {
    editingIdRef.current = null
    setEditingId(null)
    editingInputRef.current = EMPTY_INPUT
  }, [])

  const saveEdit = useCallback(async () => {
    const currentEditingId = editingIdRef.current
    if (currentEditingId == null) return
    if (await onUpdate(currentEditingId, editingInputRef.current)) cancelEdit()
  }, [cancelEdit, onUpdate])

  const columns = useMemo<ColumnDef<Commodity>[]>(
    () => [
      {
        accessorKey: 'displayName',
        header: () => null,
        cell: ({ row }) => {
          const commodity = row.original
          const editing = editingId === commodity.id
          return editing ? (
            <Input
              defaultValue={commodity.displayName}
              onChange={(event) => {
                editingInputRef.current = {
                  ...editingInputRef.current,
                  displayName: event.target.value,
                }
              }}
              aria-label='Edit Commodity name'
              disabled={loading}
              className='h-9 bg-background'
            />
          ) : (
            commodity.displayName
          )
        },
      },
      ...(canManage
        ? [
            {
              id: 'actions',
              header: () => null,
              enableColumnFilter: false,
              cell: ({ row }) => {
                const commodity = row.original
                const editing = editingId === commodity.id
                return (
                  <CatalogRowActions
                    editing={editing}
                    itemLabel={`Commodity ${commodity.displayName}`}
                    loading={loading}
                    onEdit={() => startEdit(commodity)}
                    onSave={() => void saveEdit()}
                    onCancel={cancelEdit}
                    onDelete={() => void onDelete(commodity.id)}
                  />
                )
              },
            } satisfies ColumnDef<Commodity>,
          ]
        : []),
    ],
    [canManage, cancelEdit, editingId, loading, onDelete, saveEdit, startEdit]
  )

  // TanStack Table intentionally owns the catalog filtering and row model.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: commodities,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })
  const visibleCount = table.getFilteredRowModel().rows.length

  return (
    <section
      className='min-w-0 overflow-hidden rounded-2xl bg-card shadow-[0_22px_55px_-44px_color-mix(in_oklch,var(--foreground)_45%,transparent)] ring-1 ring-border/70'
      onKeyDownCapture={(event) => {
        const target = event.target as HTMLElement
        if (target.getAttribute('aria-label') !== 'Edit Commodity name') {
          return
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          void saveEdit()
        } else if (event.key === 'Escape') {
          event.preventDefault()
          cancelEdit()
        }
      }}
    >
      <header className='flex min-h-[5.75rem] flex-col gap-4 px-4 pt-4 pb-3.5 sm:flex-row sm:items-start sm:justify-between sm:px-5 sm:pt-5'>
        <div className='flex min-w-0 items-start gap-3'>
          <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm'>
            <Boxes className='size-4' aria-hidden='true' />
          </span>
          <div>
            <h2 className='text-base font-semibold tracking-[-0.02em] text-foreground'>
              Commodities
            </h2>
            <p className='mt-0.5 text-xs leading-5 text-muted-foreground'>
              Cargo names available to this service.
            </p>
          </div>
        </div>
        <div className='flex items-center gap-2 self-start sm:self-auto'>
          <span className='text-xs text-muted-foreground'>Catalog total</span>
          <span className='rounded-md bg-muted px-2 py-1 font-mono text-xs font-semibold text-foreground tabular-nums'>
            {commodities.length}
          </span>
        </div>
      </header>

      {canManage ? (
        <form
          className='mx-3 mb-3 grid gap-2 rounded-xl bg-muted/45 p-2.5 ring-1 ring-border/50 sm:mx-4 sm:mb-4 sm:grid-cols-[minmax(0,1fr)_auto]'
          onSubmit={(event) => {
            event.preventDefault()
            void submitCreate()
          }}
        >
          <Input
            value={createInput.displayName}
            onChange={(event) =>
              setCreateInput((current) => ({
                ...current,
                displayName: event.target.value,
              }))
            }
            aria-label='New Commodity name'
            placeholder='Commodity name'
            disabled={loading}
            className='h-10 bg-background shadow-none'
          />
          <Button
            type='submit'
            className='h-10 px-4 active:translate-y-px'
            disabled={loading || !createInput.displayName.trim()}
          >
            <Plus className='size-4' />
            Add Commodity
          </Button>
        </form>
      ) : null}

      {commodities.length > 0 ? (
        <div className='flex flex-col gap-2 border-y border-border/55 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='relative w-full sm:max-w-xs'>
            <Search
              className='pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground'
              aria-hidden='true'
            />
            <Input
              type='search'
              value={
                (table.getColumn('displayName')?.getFilterValue() as string) ??
                ''
              }
              onChange={(event) =>
                table
                  .getColumn('displayName')
                  ?.setFilterValue(event.target.value)
              }
              aria-label='Search Commodities'
              placeholder='Search Commodities'
              className='h-9 bg-background pr-3 pl-9 shadow-none'
            />
          </div>
          <p className='font-mono text-xs text-muted-foreground tabular-nums'>
            {visibleCount} shown
          </p>
        </div>
      ) : null}

      {loading && commodities.length === 0 ? (
        <div className='space-y-2 p-4'>
          <div className='h-12 animate-pulse rounded-lg bg-muted/80' />
          <div className='h-12 animate-pulse rounded-lg bg-muted/60' />
          <div className='h-12 animate-pulse rounded-lg bg-muted/40' />
          <p className='sr-only'>Loading Commodities...</p>
        </div>
      ) : commodities.length === 0 ? (
        <div className='px-5 py-12 text-center'>
          <span className='mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground'>
            <Package className='size-5' aria-hidden='true' />
          </span>
          <p className='text-sm font-medium text-foreground'>
            No Commodities yet
          </p>
          <p className='mx-auto mt-1.5 max-w-[30ch] text-xs leading-5 text-muted-foreground'>
            Add the first Commodity for this service. Its internal code will be
            generated automatically.
          </p>
        </div>
      ) : visibleCount === 0 ? (
        <div className='px-5 py-12 text-center'>
          <span className='mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground'>
            <Search className='size-5' aria-hidden='true' />
          </span>
          <p className='text-sm font-medium text-foreground'>
            No matching Commodities
          </p>
          <p className='mt-1.5 text-xs text-muted-foreground'>
            Try a different Commodity name.
          </p>
        </div>
      ) : (
        <DataTableContent
          table={table}
          columnCount={columns.length}
          ariaLabel='Commodities catalog'
          showHeader={false}
          maxHeight='15rem'
          containerClassName='overflow-x-auto overflow-y-auto overscroll-contain rounded-none border-x-0 border-b-0'
          tableClassName='w-full'
          columnClassName={(columnId) =>
            columnId === 'actions' ? 'w-14 px-4 py-2.5 sm:w-44' : 'px-4 py-2.5'
          }
        />
      )}
    </section>
  )
}
