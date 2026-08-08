import { useEffect, useState } from 'react'
import type {
  Commodity,
  CommodityGroup,
} from '@/modules/gallery/services/commodityService'
import { NumberInput } from '@/shared/components/NumberInput'
import {
  Edit2,
  FolderPlus,
  Package,
  PackagePlus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  commodityDisplayLabel,
  deriveCommodityName,
  type CommodityEditData,
} from './commodityManagementModel'

interface CommodityGroupsPanelProps {
  groups: CommodityGroup[]
  selectedGroupId: number | null
  loading: boolean
  canEditCommodity: boolean
  editingTypeId: number | null
  editingData: CommodityEditData
  onSelectGroup: (groupId: number) => void
  onStartEdit: (commodity: Commodity) => void
  onEditNameChange: (name: string) => void
  onEditRequiredCountChange: (value: string) => void
  onSave: (commodityId: number) => void
  onCancelEdit: () => void
  onDeleteCommodity: (commodity: Commodity) => void
  onDeleteGroup: (group: CommodityGroup) => void
  onRenameGroup: (groupId: number, name: string) => Promise<boolean>
  onAddToGroup: (groupId: number) => void
  onCreateGroup?: () => void
}

export function CommodityGroupsPanel({
  groups,
  selectedGroupId,
  loading,
  canEditCommodity,
  editingTypeId,
  editingData,
  onSelectGroup,
  onStartEdit,
  onEditNameChange,
  onEditRequiredCountChange,
  onSave,
  onCancelEdit,
  onDeleteCommodity,
  onDeleteGroup,
  onRenameGroup,
  onAddToGroup,
  onCreateGroup,
}: CommodityGroupsPanelProps) {
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [renameSaving, setRenameSaving] = useState(false)

  const selectedGroup =
    groups.find((group) => group.id === selectedGroupId) ?? groups[0] ?? null

  useEffect(() => {
    setRenaming(false)
    setRenameValue(selectedGroup?.name ?? '')
  }, [selectedGroup?.id, selectedGroup?.name])

  if (loading && groups.length === 0) {
    return (
      <div className='space-y-3 rounded-lg border border-border/70 bg-card p-5'>
        <div className='flex flex-wrap gap-2'>
          <div className='h-8 w-28 animate-pulse rounded-md bg-muted' />
          <div className='h-8 w-24 animate-pulse rounded-md bg-muted' />
          <div className='h-8 w-32 animate-pulse rounded-md bg-muted' />
        </div>
        <div className='space-y-2 pt-2'>
          <div className='h-10 animate-pulse rounded-md bg-muted/80' />
          <div className='h-10 animate-pulse rounded-md bg-muted/60' />
          <div className='h-10 animate-pulse rounded-md bg-muted/40' />
        </div>
        <p className='pt-2 text-center text-sm text-muted-foreground'>
          Loading commodity groups...
        </p>
      </div>
    )
  }

  if (groups.length === 0 || !selectedGroup) {
    return (
      <div className='rounded-lg border border-dashed border-border/80 bg-card px-6 py-14 text-center'>
        <Package className='mx-auto mb-4 h-11 w-11 text-muted-foreground/80' />
        <p className='text-base font-medium text-foreground'>No groups yet</p>
        <p className='mx-auto mt-2 max-w-md text-sm text-muted-foreground'>
          Create a group with at least one commodity to start the catalog for
          this service.
        </p>
        {canEditCommodity && onCreateGroup ? (
          <Button
            type='button'
            className='mt-5'
            onClick={onCreateGroup}
          >
            Create group
          </Button>
        ) : null}
      </div>
    )
  }

  const startRename = () => {
    setRenameValue(selectedGroup.name)
    setRenaming(true)
  }

  const cancelRename = () => {
    setRenaming(false)
    setRenameValue(selectedGroup.name)
  }

  const saveRename = async () => {
    setRenameSaving(true)
    try {
      const ok = await onRenameGroup(selectedGroup.id, renameValue)
      if (ok) setRenaming(false)
    } finally {
      setRenameSaving(false)
    }
  }

  return (
    <div className='space-y-4'>
      <div className='rounded-lg border border-border/70 bg-card p-4'>
        <p className='mb-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase'>
          Group
        </p>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div
            role='tablist'
            aria-label='Commodity groups'
            className='flex min-w-0 flex-wrap gap-2'
          >
            {groups.map((group) => {
              const active = group.id === selectedGroup.id
              return (
                <Button
                  key={group.id}
                  type='button'
                  role='tab'
                  aria-selected={active}
                  size='sm'
                  variant={active ? 'default' : 'outline'}
                  onClick={() => onSelectGroup(group.id)}
                  className='gap-2 transition-colors'
                >
                  {group.name}
                  <span
                    className={
                      active
                        ? 'rounded bg-background/20 px-1.5 py-0.5 text-xs tabular-nums'
                        : 'rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground'
                    }
                  >
                    {group.commodities.length}
                  </span>
                </Button>
              )
            })}
          </div>
          {canEditCommodity && onCreateGroup ? (
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={onCreateGroup}
            >
              <FolderPlus className='mr-1.5 h-3.5 w-3.5' />
              Create group
            </Button>
          ) : null}
        </div>
      </div>

      <section className='overflow-hidden rounded-lg border border-border/70 bg-card'>
        <header className='flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-muted/25 px-4 py-3'>
          <div className='min-w-0 flex-1'>
            {renaming && canEditCommodity ? (
              <div className='flex max-w-md flex-wrap items-center gap-2'>
                <Input
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  aria-label='Rename group'
                  autoFocus
                  disabled={renameSaving || loading}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void saveRename()
                    }
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      cancelRename()
                    }
                  }}
                  className='h-9'
                />
                <Button
                  type='button'
                  size='sm'
                  disabled={renameSaving || loading}
                  onClick={() => void saveRename()}
                >
                  <Save className='mr-1.5 h-3.5 w-3.5' />
                  Save
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={renameSaving || loading}
                  onClick={cancelRename}
                >
                  <X className='mr-1.5 h-3.5 w-3.5' />
                  Cancel
                </Button>
              </div>
            ) : (
              <>
                <h3 className='text-base font-semibold tracking-tight text-foreground'>
                  {selectedGroup.name}
                </h3>
                <p className='text-xs text-muted-foreground'>
                  {selectedGroup.commodities.length} commodit
                  {selectedGroup.commodities.length === 1 ? 'y' : 'ies'}
                </p>
              </>
            )}
          </div>
          {canEditCommodity && !renaming ? (
            <div className='ml-auto flex flex-wrap gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={startRename}
              >
                <Edit2 className='mr-1.5 h-3.5 w-3.5' />
                Rename
              </Button>
              <Button
                type='button'
                size='sm'
                onClick={() => onAddToGroup(selectedGroup.id)}
              >
                <PackagePlus className='mr-1.5 h-3.5 w-3.5' />
                Add commodities
              </Button>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => onDeleteGroup(selectedGroup)}
                className='border-destructive/30 text-destructive transition-colors hover:bg-destructive/10 hover:text-destructive'
              >
                <Trash2 className='mr-1.5 h-3.5 w-3.5' />
                Delete group
              </Button>
            </div>
          ) : null}
        </header>

        {selectedGroup.commodities.length === 0 ? (
          <div className='px-6 py-12 text-center'>
            <Package className='mx-auto mb-3 h-9 w-9 text-muted-foreground/70' />
            <p className='text-sm font-medium text-foreground'>
              No commodities in this group
            </p>
            <p className='mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground'>
              Add commodities to make this group available for bookings and
              gallery uploads.
            </p>
            {canEditCommodity ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='mt-4'
                onClick={() => onAddToGroup(selectedGroup.id)}
              >
                <PackagePlus className='mr-1.5 h-3.5 w-3.5' />
                Add commodities
              </Button>
            ) : null}
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-muted/40'>
                <tr>
                  <th className='px-4 py-2.5 text-left text-sm font-medium'>
                    Code
                  </th>
                  <th className='px-4 py-2.5 text-left text-sm font-medium'>
                    Commodity
                  </th>
                  <th className='px-4 py-2.5 text-left text-sm font-medium'>
                    Display
                  </th>
                  <th className='px-4 py-2.5 text-left text-sm font-medium'>
                    Required
                  </th>
                  {canEditCommodity ? (
                    <th className='w-28 px-4 py-2.5 text-right text-sm font-medium'>
                      Actions
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {selectedGroup.commodities.map((commodity) => {
                  const isEditing = editingTypeId === commodity.id
                  return (
                    <tr
                      key={commodity.id}
                      className='border-t border-border/50 transition-colors hover:bg-muted/15'
                    >
                      <td className='px-4 py-2.5'>
                        <span className='font-mono text-sm tabular-nums'>
                          {isEditing
                            ? deriveCommodityName(editingData.displayName) ||
                              '-'
                            : commodity.name}
                        </span>
                      </td>
                      <td className='px-4 py-2.5'>
                        {isEditing ? (
                          <input
                            type='text'
                            value={editingData.displayName}
                            onChange={(event) =>
                              onEditNameChange(event.target.value)
                            }
                            aria-label='Edit commodity name'
                            className='w-full rounded border px-3 py-1 focus:ring-2 focus:ring-primary focus:outline-none'
                          />
                        ) : (
                          <span>{commodity.displayName}</span>
                        )}
                      </td>
                      <td className='px-4 py-2.5 text-sm text-muted-foreground'>
                        {commodityDisplayLabel(commodity)}
                      </td>
                      <td className='px-4 py-2.5'>
                        {isEditing ? (
                          <NumberInput
                            value={editingData.requiredImageCount}
                            decimalScale={0}
                            onValueChange={(_value, canonical) =>
                              onEditRequiredCountChange(canonical)
                            }
                            min={1}
                            aria-label='Edit required image count'
                            className='w-full rounded border px-3 py-1 focus:ring-2 focus:ring-primary focus:outline-none'
                          />
                        ) : (
                          <span className='tabular-nums'>
                            {commodity.requiredImageCount}
                          </span>
                        )}
                      </td>
                      {canEditCommodity ? (
                        <td className='px-4 py-2.5'>
                          <div className='flex justify-end gap-1'>
                            {isEditing ? (
                              <>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => onSave(commodity.id)}
                                  className='text-success hover:bg-success/10'
                                >
                                  <Save className='h-4 w-4' />
                                </Button>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={onCancelEdit}
                                >
                                  <X className='h-4 w-4' />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => onStartEdit(commodity)}
                                  className='text-primary hover:bg-primary/10'
                                >
                                  <Edit2 className='h-4 w-4' />
                                </Button>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => onDeleteCommodity(commodity)}
                                  className='text-destructive hover:bg-destructive/10'
                                >
                                  <Trash2 className='h-4 w-4' />
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
    </div>
  )
}
