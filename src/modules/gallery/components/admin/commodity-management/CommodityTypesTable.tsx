import { useMemo, useState } from 'react'
import type { CommodityType } from '@/modules/gallery/services/commodityService'
import { Edit2, Plus, Save, Search, Shapes, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  const [editingInput, setEditingInput] = useState(EMPTY_INPUT)
  const [query, setQuery] = useState('')
  const visibleTypes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (!normalizedQuery) return types
    return types.filter((type) =>
      type.name.toLocaleLowerCase().includes(normalizedQuery)
    )
  }, [query, types])

  const submitCreate = async () => {
    if (await onCreate(createInput)) setCreateInput(EMPTY_INPUT)
  }

  const startEdit = (type: CommodityType) => {
    setEditingId(type.id)
    setEditingInput({ name: type.name })
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
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label='Search Types'
              placeholder='Search Types'
              className='h-9 bg-background pr-3 pl-9 shadow-none'
            />
          </div>
          <p className='font-mono text-xs text-muted-foreground tabular-nums'>
            {visibleTypes.length} shown
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
      ) : visibleTypes.length === 0 ? (
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
        <ul
          aria-label='Types catalog'
          className='max-h-[31.25rem] space-y-1 overflow-y-auto overscroll-contain bg-background/55 p-2 sm:p-3'
        >
          {visibleTypes.map((type) => {
            const editing = editingId === type.id
            return (
              <li
                key={type.id}
                className='group flex min-h-11 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-200 hover:bg-muted/70'
              >
                {editing ? (
                  <Input
                    value={editingInput.name}
                    onChange={(event) =>
                      setEditingInput((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    aria-label='Edit Type name'
                    disabled={loading}
                    className='h-8 flex-1 bg-background'
                  />
                ) : (
                  <span className='min-w-0 flex-1 truncate px-1 text-sm font-medium text-foreground'>
                    {type.name}
                  </span>
                )}
                {canManage ? (
                  <div className='flex shrink-0 justify-end gap-0.5'>
                    {editing ? (
                      <>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='size-8 active:translate-y-px'
                          disabled={loading}
                          aria-label='Save Type'
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
                          aria-label='Cancel Type edit'
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
                          aria-label={`Edit Type ${type.name}`}
                          onClick={() => startEdit(type)}
                        >
                          <Edit2 className='size-3.5' />
                        </Button>
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          disabled={loading}
                          aria-label={`Delete Type ${type.name}`}
                          className='size-8 text-destructive opacity-70 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 focus-visible:opacity-100 active:translate-y-px'
                          onClick={() => void onDelete(type.id)}
                        >
                          <Trash2 className='size-3.5' />
                        </Button>
                      </>
                    )}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
