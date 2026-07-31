'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AdminSection } from '@/shared/components/layout/dashboard/admin'
import { toast } from '@/shared/utils/toast'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeleteRoleDialog } from './DeleteRoleDialog'
import { RoleEditorDialog } from './RoleEditorDialog'
import { RoleList } from './RoleList'
import {
  createEmptyRoleEditor,
  createSectionLabelMap,
  groupGrantableSections,
  roleEditorToInput,
  roleToEditor,
} from './roleModel'
import { rolesService, type AdminRole } from './rolesService'

const ROLE_QUERY_KEY = ['admin-roles'] as const
const SECTION_CATALOG_QUERY_KEY = ['role-section-catalog'] as const

export function RoleManagementScreen() {
  const queryClient = useQueryClient()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null)
  const [editor, setEditor] = useState(createEmptyRoleEditor)
  const [roleToDelete, setRoleToDelete] = useState<AdminRole | null>(null)

  const rolesQuery = useQuery({
    queryKey: ROLE_QUERY_KEY,
    queryFn: () => rolesService.listRoles(),
  })
  const catalogQuery = useQuery({
    queryKey: SECTION_CATALOG_QUERY_KEY,
    queryFn: () => rolesService.getSectionCatalog(),
  })

  const groupedSections = useMemo(
    () => groupGrantableSections(catalogQuery.data ?? []),
    [catalogQuery.data]
  )
  const sectionLabels = useMemo(
    () => createSectionLabelMap(catalogQuery.data ?? []),
    [catalogQuery.data]
  )

  const invalidateRoles = () =>
    queryClient.invalidateQueries({ queryKey: ROLE_QUERY_KEY })

  const openCreate = () => {
    setEditingRole(null)
    setEditor(createEmptyRoleEditor())
    setEditorOpen(true)
  }

  const openEdit = (role: AdminRole) => {
    setEditingRole(role)
    setEditor(roleToEditor(role))
    setEditorOpen(true)
  }

  const saveRole = useMutation({
    mutationFn: () => {
      const input = roleEditorToInput(editor)
      return editingRole
        ? rolesService.updateRole(editingRole.id, input)
        : rolesService.createRole(input)
    },
    onSuccess: () => {
      toast.success(editingRole ? 'Role updated' : 'Role created')
      void invalidateRoles()
      setEditorOpen(false)
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : 'Failed to save role'
      ),
  })

  const deleteRole = useMutation({
    mutationFn: (id: number) => rolesService.deleteRole(id),
    onSuccess: () => {
      toast.success('Role deleted')
      void invalidateRoles()
      setRoleToDelete(null)
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete role'
      ),
  })

  const requestDelete = (role: AdminRole) => {
    if (!role.isAdmin) setRoleToDelete(role)
  }

  return (
    <AdminSection
      description='Create roles and choose exactly which dashboard pages each one can open. Admin roles always have full access. The same access is enforced on the API.'
      actions={
        <Button onClick={openCreate}>
          <Plus className='h-4 w-4' /> New role
        </Button>
      }
    >
      <RoleList
        roles={rolesQuery.data ?? []}
        loading={rolesQuery.isLoading}
        sectionLabels={sectionLabels}
        onEdit={openEdit}
        onDelete={requestDelete}
      />

      <RoleEditorDialog
        open={editorOpen}
        editingRole={editingRole}
        editor={editor}
        groupedSections={groupedSections}
        saving={saveRole.isPending}
        onOpenChange={setEditorOpen}
        onEditorChange={setEditor}
        onSave={() => saveRole.mutate()}
      />

      <DeleteRoleDialog
        role={roleToDelete}
        deleting={deleteRole.isPending}
        onClose={() => setRoleToDelete(null)}
        onConfirm={(id) => deleteRole.mutate(id)}
      />
    </AdminSection>
  )
}
