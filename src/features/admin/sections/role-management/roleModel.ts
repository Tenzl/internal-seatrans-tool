import type { RoleGroup } from '@/shared/types/dashboard'
import type {
  AdminRole,
  CreateRoleInput,
  SectionCatalogItem,
} from './rolesService'

export interface RoleEditorState {
  name: string
  description: string
  roleGroup: RoleGroup
  sections: Set<string>
}

export const ROLE_GROUP_OPTIONS: { value: RoleGroup; label: string }[] = [
  { value: 'INTERNAL', label: 'Internal (staff)' },
  { value: 'EXTERNAL', label: 'External (customer)' },
]

export const createEmptyRoleEditor = (): RoleEditorState => ({
  name: '',
  description: '',
  roleGroup: 'INTERNAL',
  sections: new Set(),
})

export const roleToEditor = (role: AdminRole): RoleEditorState => ({
  name: role.name,
  description: role.description ?? '',
  roleGroup: role.roleGroup,
  sections: new Set(role.sections),
})

export const roleEditorToInput = (
  editor: RoleEditorState
): CreateRoleInput => ({
  name: editor.name.trim(),
  description: editor.description.trim() || undefined,
  roleGroup: editor.roleGroup,
  sections: [...editor.sections],
})

export function groupGrantableSections(
  catalog: SectionCatalogItem[]
): [string, SectionCatalogItem[]][] {
  const groups = new Map<string, SectionCatalogItem[]>()

  // Admin-only routes are privilege boundaries and can never be delegated.
  catalog.forEach((section) => {
    if (section.adminOnly) return
    const items = groups.get(section.group) ?? []
    items.push(section)
    groups.set(section.group, items)
  })

  return [...groups.entries()]
}

export function toggleRoleSection(
  sections: Set<string>,
  key: string
): Set<string> {
  const next = new Set(sections)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  return next
}

export function toggleRoleSectionGroup(
  sections: Set<string>,
  keys: string[],
  enabled: boolean
): Set<string> {
  const next = new Set(sections)
  keys.forEach((key) => (enabled ? next.add(key) : next.delete(key)))
  return next
}

export function createSectionLabelMap(
  catalog: SectionCatalogItem[]
): Map<string, string> {
  return new Map(catalog.map((section) => [section.key, section.label]))
}
