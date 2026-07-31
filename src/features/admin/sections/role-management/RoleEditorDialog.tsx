import type { Dispatch, SetStateAction } from 'react'
import type { RoleGroup } from '@/shared/types/dashboard'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ROLE_GROUP_OPTIONS,
  type RoleEditorState,
  toggleRoleSection,
  toggleRoleSectionGroup,
} from './roleModel'
import type { AdminRole, SectionCatalogItem } from './rolesService'

type RoleEditorDialogProps = {
  open: boolean
  editingRole: AdminRole | null
  editor: RoleEditorState
  groupedSections: [string, SectionCatalogItem[]][]
  saving: boolean
  onOpenChange: (open: boolean) => void
  onEditorChange: Dispatch<SetStateAction<RoleEditorState>>
  onSave: () => void
}

export function RoleEditorDialog({
  open,
  editingRole,
  editor,
  groupedSections,
  saving,
  onOpenChange,
  onEditorChange,
  onSave,
}: RoleEditorDialogProps) {
  const setField = <Key extends 'name' | 'description' | 'roleGroup'>(
    field: Key,
    value: RoleEditorState[Key]
  ) => {
    onEditorChange((current) => ({ ...current, [field]: value }))
  }

  const toggleSection = (key: string) => {
    onEditorChange((current) => ({
      ...current,
      sections: toggleRoleSection(current.sections, key),
    }))
  }

  const toggleGroup = (keys: string[], enabled: boolean) => {
    onEditorChange((current) => ({
      ...current,
      sections: toggleRoleSectionGroup(current.sections, keys, enabled),
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>
            {editingRole ? `Edit role — ${editingRole.name}` : 'New role'}
          </DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='grid gap-1.5'>
            <Label>Name</Label>
            <Input
              value={editor.name}
              onChange={(event) => setField('name', event.target.value)}
              placeholder='e.g. ROLE_DATA_EDITOR'
            />
          </div>
          <div className='grid gap-1.5'>
            <Label>Description</Label>
            <Input
              value={editor.description}
              onChange={(event) => setField('description', event.target.value)}
              placeholder='Optional'
            />
          </div>
          <div className='grid gap-1.5'>
            <Label>User group</Label>
            <Select
              value={editor.roleGroup}
              onValueChange={(value) =>
                setField('roleGroup', value as RoleGroup)
              }
            >
              <SelectTrigger className='w-full sm:max-w-xs'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_GROUP_OPTIONS.map((group) => (
                  <SelectItem key={group.value} value={group.value}>
                    {group.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-3'>
            <Label>Section access</Label>
            {editingRole?.isAdmin ? (
              <p className='rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground'>
                Admin roles always have full access — section selection is not
                needed.
              </p>
            ) : (
              <div className='space-y-4'>
                {groupedSections.map(([group, sections]) => {
                  const keys = sections.map((section) => section.key)
                  const allSelected = keys.every((key) =>
                    editor.sections.has(key)
                  )

                  return (
                    <div key={group} className='rounded-lg border p-3'>
                      <div className='mb-2 flex items-center justify-between'>
                        <span className='text-sm font-medium'>{group}</span>
                        <button
                          type='button'
                          className='text-xs text-primary hover:underline'
                          onClick={() => toggleGroup(keys, !allSelected)}
                        >
                          {allSelected ? 'Clear all' : 'Select all'}
                        </button>
                      </div>
                      <div className='grid gap-2 sm:grid-cols-2'>
                        {sections.map((section) => (
                          <label
                            key={section.key}
                            className='flex cursor-pointer items-center gap-2 text-sm'
                          >
                            <Checkbox
                              checked={editor.sections.has(section.key)}
                              onCheckedChange={() => toggleSection(section.key)}
                            />
                            {section.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!editor.name.trim() || saving}>
            {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
            {editingRole ? 'Save changes' : 'Create role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
