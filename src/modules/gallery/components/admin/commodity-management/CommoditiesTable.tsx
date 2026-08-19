import { useMemo, useState } from 'react'
import type { Commodity } from '@/modules/gallery/services/commodityService'
import {
  Boxes,
  Edit2,
  Package,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const [editingInput, setEditingInput] = useState(EMPTY_INPUT)
  const [query, setQuery] = useState('')
  const visibleCommodities = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return commodities
    return commodities.filter((commodity) =>
      commodity.displayName.toLocaleLowerCase().includes(normalizedQuery)
    )
  }, [commodities, query])

  const submitCreate = async () => {
    if (await onCreate(createInput)) setCreateInput(EMPTY_INPUT)
  }

  const startEdit = (commodity: Commodity) => {
    setEditingId(commodity.id)
    setEditingInput({
      displayName: commodity.displayName,
      description: commodity.description ?? '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingInput(EMPTY_INPUT)
  }

  const saveEdit = async () => {
    if (editingId == null) return
    if (await onUpdate(editingId, editingInput)) cancelEdit()
  }

  return (
    <section className='min-w-0 overflow-hidden rounded-2xl bg-card shadow-[0_22px_55px_-44px_color-mix(in_oklch,var(--foreground)_45%,transparent)] ring-1 ring-border/70'>
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
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label='Search Commodities'
              placeholder='Search Commodities'
              className='h-9 bg-background pr-3 pl-9 shadow-none'
            />
          </div>
          <p className='font-mono text-xs text-muted-foreground tabular-nums'>
            {visibleCommodities.length} shown
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
      ) : visibleCommodities.length === 0 ? (
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
        <div className='max-h-[28rem] overflow-x-auto overflow-y-auto overscroll-contain'>
          <table className='w-full' aria-label='Commodities catalog'>
            <tbody>
              {visibleCommodities.map((commodity) => {
                const editing = editingId === commodity.id
                return (
                  <tr
                    key={commodity.id}
                    className='group border-t border-border/50 transition-colors duration-200 hover:bg-muted/30'
                  >
                    <td className='px-4 py-2.5'>
                      {editing ? (
                        <Input
                          value={editingInput.displayName}
                          onChange={(event) =>
                            setEditingInput((current) => ({
                              ...current,
                              displayName: event.target.value,
                            }))
                          }
                          aria-label='Edit Commodity name'
                          disabled={loading}
                          className='h-9 bg-background'
                        />
                      ) : (
                        commodity.displayName
                      )}
                    </td>
                    {canManage ? (
                      <td className='px-4 py-2.5'>
                        <div className='flex justify-end gap-1'>
                          {editing ? (
                            <>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='size-8 active:translate-y-px'
                                disabled={loading}
                                aria-label='Save Commodity'
                                onClick={() => void saveEdit()}
                              >
                                <Save className='size-3.5' />
                              </Button>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='size-8 active:translate-y-px'
                                disabled={loading}
                                aria-label='Cancel Commodity edit'
                                onClick={cancelEdit}
                              >
                                <X className='size-3.5' />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                className='size-8 text-muted-foreground opacity-70 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 active:translate-y-px'
                                aria-label={`Edit Commodity ${commodity.displayName}`}
                                onClick={() => startEdit(commodity)}
                              >
                                <Edit2 className='size-3.5' />
                              </Button>
                              <Button
                                type='button'
                                variant='ghost'
                                size='icon'
                                disabled={loading}
                                aria-label={`Delete Commodity ${commodity.displayName}`}
                                className='size-8 text-destructive opacity-70 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 focus-visible:opacity-100 active:translate-y-px'
                                onClick={() => void onDelete(commodity.id)}
                              >
                                <Trash2 className='size-3.5' />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
