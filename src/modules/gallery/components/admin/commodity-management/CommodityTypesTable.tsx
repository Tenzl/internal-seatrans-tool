import { useCallback, useMemo, useRef, useState } from 'react'
import {
  type ColumnDef,
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { CommodityType } from '@/modules/gallery/services/commodityService'
import { Plus, Search, Shapes } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTableContent } from '@/components/ui/data-table'
import { Input } from '@/components/ui/input'
import { CatalogRowActions } from './CatalogRowActions'
import type { CommodityTypeInput } from './useCommodityTypes'

interface CommodityTypesTableProps {
  types: CommodityType[]
  loading: boolean
  canManage: boolean
  onCreate: (input: CommodityTypeInput) => Promise<boolean>
  onUpdate: (id: number, input: CommodityTypeInput) => Promise<boolean>
  onDelete: (id: number) => Promise<boolean>
}

const EMPTY_INPUT: CommodityTypeInput = { name: '' }

export function CommodityTypesTable({
  types,
  loading,
  canManage,
  onCreate,
  onUpdate,
  onDelete,
}: CommodityTypesTableProps) {
  const [createInput, setCreateInput] = useState(EMPTY_INPUT)
  const [editingId, setEditingId] = useState<number | null>(null)
  const editingIdRef = useRef<number | null>(null)
  const editingInputRef = useRef(EMPTY_INPUT)

  const submitCreate = async () => {
    if (await onCreate(createInput)) setCreateInput(EMPTY_INPUT)
  }

  const startEdit = useCallback((type: CommodityType) => {
    editingIdRef.current = type.id
    setEditingId(type.id)
    const nextInput = { name: type.name }
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

  const columns = useMemo<ColumnDef<CommodityType>[]>(
    () => [
      {
        accessorKey: 'name',
        header: () => null,
        cell: ({ row }) => {
          const type = row.original
          const editing = editingId === type.id
          return editing ? (
            <Input
              defaultValue={type.name}
              onChange={(event) => {
                editingInputRef.current = { name: event.target.value }
              }}
              aria-label='Edit Type name'
              disabled={loading}
              className='h-9 bg-background'
            />
          ) : (
            type.name
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
                const type = row.original
                const editing = editingId === type.id
                return (
                  <CatalogRowActions
                    editing={editing}
                    itemLabel={`Type ${type.name}`}
                    loading={loading}
                    onEdit={() => startEdit(type)}
                    onSave={() => void saveEdit()}
                    onCancel={cancelEdit}
                    onDelete={() => void onDelete(type.id)}
                  />
                )
              },
            } satisfies ColumnDef<CommodityType>,
          ]
        : []),
    ],
    [canManage, cancelEdit, editingId, loading, onDelete, saveEdit, startEdit]
  )

  // TanStack Table intentionally owns the catalog filtering and row model.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: types,
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
        if (target.getAttribute('aria-label') !== 'Edit Type name') {
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
      <header className='flex min-h-[5.75rem] items-start justify-between gap-4 px-4 pt-4 pb-3.5 sm:px-5 sm:pt-5'>
        <div className='flex min-w-0 items-start gap-3'>
          <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-sm ring-1 ring-border/60'>
            <Shapes className='size-4' aria-hidden='true' />
          </span>
          <div>
            <h2 className='text-base font-semibold tracking-[-0.02em] text-foreground'>
              Types
            </h2>
            <p className='mt-0.5 text-xs leading-5 text-muted-foreground'>
              Classification names available to this service.
            </p>
          </div>
        </div>
        <span className='rounded-md bg-background px-2 py-1 font-mono text-xs font-semibold tabular-nums shadow-sm ring-1 ring-border/60'>
          {types.length}
        </span>
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
            value={createInput.name}
            onChange={(event) =>
              setCreateInput((current) => ({
                ...current,
                name: event.target.value,
              }))
            }
            aria-label='New Type name'
            placeholder='Add a Type'
            disabled={loading}
            className='h-10 bg-background shadow-none'
          />
          <Button
            type='submit'
            size='sm'
            className='h-10 px-4 active:translate-y-px'
            disabled={loading || !createInput.name.trim()}
          >
            <Plus className='size-3.5' />
            Add Type
          </Button>
        </form>
      ) : null}

      {types.length > 0 ? (
        <div className='flex flex-col gap-2 border-y border-border/55 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='relative w-full sm:max-w-xs'>
            <Search
              className='pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground'
              aria-hidden='true'
            />
            <Input
              type='search'
              value={
                (table.getColumn('name')?.getFilterValue() as string) ?? ''
              }
              onChange={(event) =>
                table.getColumn('name')?.setFilterValue(event.target.value)
              }
              aria-label='Search Types'
              placeholder='Search Types'
              className='h-9 bg-background pr-3 pl-9 shadow-none'
            />
          </div>
          <p className='font-mono text-xs text-muted-foreground tabular-nums'>
            {visibleCount} shown
          </p>
        </div>
      ) : null}

      {loading && types.length === 0 ? (
        <div className='space-y-2 border-t border-border/50 bg-background/55 p-4'>
          <div className='h-11 animate-pulse rounded-lg bg-muted/80' />
          <div className='h-11 animate-pulse rounded-lg bg-muted/60' />
          <div className='h-11 animate-pulse rounded-lg bg-muted/40' />
          <p className='sr-only'>Loading Types...</p>
        </div>
      ) : types.length === 0 ? (
        <div className='border-t border-border/50 bg-background/55 px-5 py-12 text-center'>
          <span className='mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground'>
            <Shapes className='size-5' aria-hidden='true' />
          </span>
          <p className='text-sm font-medium text-foreground'>No Types yet</p>
          <p className='mx-auto mt-1.5 max-w-[24ch] text-xs leading-5 text-muted-foreground'>
            Add the first Type for this service.
          </p>
        </div>
      ) : visibleCount === 0 ? (
        <div className='px-5 py-12 text-center'>
          <span className='mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground'>
            <Search className='size-5' aria-hidden='true' />
          </span>
          <p className='text-sm font-medium text-foreground'>
            No matching Types
          </p>
          <p className='mt-1.5 text-xs text-muted-foreground'>
            Try a different Type name.
          </p>
        </div>
      ) : (
        <DataTableContent
          table={table}
          columnCount={columns.length}
          ariaLabel='Types catalog'
          showHeader={false}
          maxHeight='13.25rem'
          containerClassName='overflow-x-auto overflow-y-auto overscroll-contain rounded-none border-x-0 border-b-0 bg-background/55'
          tableClassName='w-full'
          columnClassName={(columnId) =>
            columnId === 'actions'
              ? 'w-14 px-4 py-2.5 sm:w-44'
              : 'px-4 py-2.5 font-medium'
          }
        />
      )}
    </section>
  )
}
