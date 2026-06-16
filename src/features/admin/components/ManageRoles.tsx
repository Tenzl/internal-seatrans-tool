'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'

import { AdminSection } from '@/shared/components/layout/dashboard/admin'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { toast } from '@/shared/utils/toast'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import type { RoleGroup } from '@/shared/types/dashboard'
import {
  rolesService,
  type AdminRole,
  type SectionCatalogItem,
} from '@/features/admin/services/rolesService'

const ROLE_GROUPS: { value: RoleGroup; label: string }[] = [
  { value: 'INTERNAL', label: 'Internal (staff)' },
  { value: 'EXTERNAL', label: 'External (customer)' },
]

export function ManageRoles() {
  const qc = useQueryClient()

  const { data: roles, isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => rolesService.listRoles(),
  })
  const { data: catalog } = useQuery({
    queryKey: ['role-section-catalog'],
    queryFn: () => rolesService.getSectionCatalog(),
  })

  // Section keys grouped by their nav group, for the assignment matrix.
  // Admin-only sections (users, roles) are privilege boundaries — not grantable.
  const grouped = useMemo(() => {
    const m = new Map<string, SectionCatalogItem[]>()
    for (const s of catalog ?? []) {
      if (s.adminOnly) continue
      const list = m.get(s.group) ?? []
      list.push(s)
      m.set(s.group, list)
    }
    return [...m.entries()]
  }, [catalog])

  // ----- create / edit dialog state -----
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AdminRole | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [roleGroup, setRoleGroup] = useState<RoleGroup>('INTERNAL')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const isAdminRole = editing?.isAdmin ?? false

  const openCreate = () => {
    setEditing(null)
    setName('')
    setDescription('')
    setRoleGroup('INTERNAL')
    setSelected(new Set())
    setOpen(true)
  }
  const openEdit = (role: AdminRole) => {
    setEditing(role)
    setName(role.name)
    setDescription(role.description ?? '')
    setRoleGroup(role.roleGroup)
    setSelected(new Set(role.sections))
    setOpen(true)
  }

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const toggleGroup = (keys: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      keys.forEach((k) => (on ? next.add(k) : next.delete(k)))
      return next
    })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-roles'] })

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        roleGroup,
        sections: [...selected],
      }
      return editing
        ? rolesService.updateRole(editing.id, payload)
        : rolesService.createRole(payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'Role updated' : 'Role created')
      invalidate()
      setOpen(false)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to save role'),
  })

  const [toDelete, setToDelete] = useState<AdminRole | null>(null)
  const del = useMutation({
    mutationFn: (id: number) => rolesService.deleteRole(id),
    onSuccess: () => {
      toast.success('Role deleted')
      invalidate()
      setToDelete(null)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to delete role'),
  })

  const sectionLabel = (key: string) =>
    catalog?.find((s) => s.key === key)?.label ?? key

  return (
    <AdminSection
      description='Create roles and choose exactly which dashboard pages each one can open. Admin roles always have full access. The same access is enforced on the API.'
      actions={
        <Button onClick={openCreate}>
          <Plus className='h-4 w-4' /> New role
        </Button>
      }
    >
      {isLoading ? (
        <div className='flex min-h-[200px] items-center justify-center'>
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        </div>
      ) : (
        <ul className='grid gap-3 pt-4'>
          {(roles ?? []).map((role) => (
            <li key={role.id} className='rounded-xl border bg-card p-4'>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div className='min-w-0 space-y-2'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='text-base font-semibold'>{role.name}</span>
                    {role.isAdmin && (
                      <Badge className='gap-1' variant='default'>
                        <ShieldCheck className='h-3 w-3' /> Full access
                      </Badge>
                    )}
                    <Badge variant='outline' className='font-normal text-muted-foreground'>
                      {role.roleGroup === 'INTERNAL' ? 'Internal' : 'External'}
                    </Badge>
                    <Badge variant='secondary' className='font-normal'>
                      {role.userCount} user{role.userCount === 1 ? '' : 's'}
                    </Badge>
                  </div>
                  {role.description && (
                    <p className='text-sm text-muted-foreground'>{role.description}</p>
                  )}
                  <div className='flex flex-wrap gap-1'>
                    {role.isAdmin ? (
                      <span className='text-sm text-muted-foreground'>Every section</span>
                    ) : role.sections.length === 0 ? (
                      <span className='text-sm text-muted-foreground'>No sections granted</span>
                    ) : (
                      role.sections.map((k) => (
                        <Badge key={k} variant='secondary' className='font-normal'>
                          {sectionLabel(k)}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <div className='flex shrink-0 items-center gap-1.5'>
                  <Button variant='outline' size='sm' onClick={() => openEdit(role)}>
                    <Pencil className='h-4 w-4' /> Edit
                  </Button>
                  <Button
                    variant='ghost'
                    size='icon'
                    aria-label='Delete role'
                    disabled={role.isAdmin}
                    onClick={() => setToDelete(role)}
                  >
                    <Trash2 className='h-4 w-4 text-destructive' />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Create / edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{editing ? `Edit role — ${editing.name}` : 'New role'}</DialogTitle>
          </DialogHeader>

          <div className='space-y-4'>
            <div className='grid gap-1.5'>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g. ROLE_DATA_EDITOR'
              />
            </div>
            <div className='grid gap-1.5'>
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Optional'
              />
            </div>
            <div className='grid gap-1.5'>
              <Label>User group</Label>
              <Select value={roleGroup} onValueChange={(v) => setRoleGroup(v as RoleGroup)}>
                <SelectTrigger className='w-full sm:max-w-xs'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_GROUPS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-3'>
              <Label>Section access</Label>
              {isAdminRole ? (
                <p className='rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground'>
                  Admin roles always have full access — section selection is not needed.
                </p>
              ) : (
                <div className='space-y-4'>
                  {grouped.map(([group, items]) => {
                    const keys = items.map((i) => i.key)
                    const allOn = keys.every((k) => selected.has(k))
                    return (
                      <div key={group} className='rounded-lg border p-3'>
                        <div className='mb-2 flex items-center justify-between'>
                          <span className='text-sm font-medium'>{group}</span>
                          <button
                            type='button'
                            className='text-xs text-primary hover:underline'
                            onClick={() => toggleGroup(keys, !allOn)}
                          >
                            {allOn ? 'Clear all' : 'Select all'}
                          </button>
                        </div>
                        <div className='grid gap-2 sm:grid-cols-2'>
                          {items.map((s) => (
                            <label
                              key={s.key}
                              className='flex cursor-pointer items-center gap-2 text-sm'
                            >
                              <Checkbox
                                checked={selected.has(s.key)}
                                onCheckedChange={() => toggle(s.key)}
                              />
                              {s.label}
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
            <Button variant='outline' onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={!name.trim() || save.isPending}>
              {save.isPending && <Loader2 className='h-4 w-4 animate-spin' />}
              {editing ? 'Save changes' : 'Create role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role “{toDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This can&apos;t be undone. A role that still has users assigned can&apos;t be
              deleted — reassign them first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                if (toDelete) del.mutate(toDelete.id)
              }}
              disabled={del.isPending}
            >
              {del.isPending && <Loader2 className='h-4 w-4 animate-spin' />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminSection>
  )
}
