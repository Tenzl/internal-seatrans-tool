import { describe, expect, it } from 'vitest'
import {
  createEmptyRoleEditor,
  groupGrantableSections,
  roleEditorToInput,
  roleToEditor,
  toggleRoleSection,
  toggleRoleSectionGroup,
} from './roleModel'
import type { AdminRole, SectionCatalogItem } from './rolesService'

describe('role model', () => {
  it('excludes admin-only sections from the grant matrix', () => {
    const catalog: SectionCatalogItem[] = [
      { key: 'data-ports', label: 'Ports', group: 'Data' },
      { key: 'admin-users', label: 'Users', group: 'Admin', adminOnly: true },
    ]

    expect(groupGrantableSections(catalog)).toEqual([
      ['Data', [{ key: 'data-ports', label: 'Ports', group: 'Data' }]],
    ])
  })

  it('toggles one section without mutating the current selection', () => {
    const current = new Set(['data-ports'])
    const next = toggleRoleSection(current, 'data-offices')

    expect([...current]).toEqual(['data-ports'])
    expect([...next]).toEqual(['data-ports', 'data-offices'])
    expect([...toggleRoleSection(next, 'data-ports')]).toEqual(['data-offices'])
  })

  it('selects and clears a complete section group', () => {
    const selected = toggleRoleSectionGroup(
      new Set(['existing']),
      ['a', 'b'],
      true
    )
    expect([...selected]).toEqual(['existing', 'a', 'b'])
    expect([...toggleRoleSectionGroup(selected, ['a', 'b'], false)]).toEqual([
      'existing',
    ])
  })

  it('maps role data to an independent editor and trims its payload', () => {
    const role = {
      id: 1,
      name: ' ROLE_EDITOR ',
      description: ' Data editor ',
      roleGroup: 'INTERNAL',
      isAdmin: false,
      userCount: 0,
      sections: ['data-ports'],
    } satisfies AdminRole
    const editor = roleToEditor(role)
    editor.sections.add('data-offices')

    expect(role.sections).toEqual(['data-ports'])
    expect(roleEditorToInput(editor)).toEqual({
      name: 'ROLE_EDITOR',
      description: 'Data editor',
      roleGroup: 'INTERNAL',
      sections: ['data-ports', 'data-offices'],
    })
  })

  it('creates independent empty section sets', () => {
    const first = createEmptyRoleEditor()
    const second = createEmptyRoleEditor()
    first.sections.add('data-ports')
    expect(second.sections.size).toBe(0)
  })
})
