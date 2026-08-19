// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommodityTypesTable } from './CommodityTypesTable'

afterEach(cleanup)

const bulkType = {
  id: 1,
  serviceTypeId: 1,
  name: 'Bulk',
  createdAt: '2026-08-19T00:00:00.000Z',
  updatedAt: '2026-08-19T00:00:00.000Z',
}

describe('CommodityTypesTable', () => {
  it('creates a Type from one name field and has no code UI', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn().mockResolvedValue(true)
    render(
      <CommodityTypesTable
        types={[]}
        loading={false}
        canManage
        onCreate={onCreate}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    expect(screen.queryByLabelText('New Type code')).not.toBeInTheDocument()
    expect(screen.getAllByRole('textbox')).toHaveLength(1)
    const name = screen.getByRole('textbox', { name: 'New Type name' })
    await user.type(name, 'Breakbulk')
    await user.click(screen.getByRole('button', { name: 'Add Type' }))

    expect(onCreate).toHaveBeenCalledWith({ name: 'Breakbulk' })
    expect(name).toHaveValue('')
  })

  it('renames and deletes by ID without rendering a code column', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn().mockResolvedValue(true)
    const onDelete = vi.fn().mockResolvedValue(true)
    render(
      <CommodityTypesTable
        types={[bulkType]}
        loading={false}
        canManage
        onCreate={vi.fn()}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    )

    expect(screen.queryByRole('columnheader', { name: 'Code' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Edit Type Bulk' }))
    expect(screen.queryByLabelText('Edit Type code')).not.toBeInTheDocument()

    const name = screen.getByRole('textbox', { name: 'Edit Type name' })
    await user.clear(name)
    await user.type(name, 'Dry Bulk')
    await user.click(screen.getByRole('button', { name: 'Save Type' }))
    expect(onUpdate).toHaveBeenCalledWith(1, { name: 'Dry Bulk' })

    await user.click(screen.getByRole('button', { name: 'Delete Type Bulk' }))
    expect(onDelete).toHaveBeenCalledWith(1)
  })

  it('searches Types by name and keeps a ten-row scroll viewport', () => {
    const types = Array.from({ length: 11 }, (_, index) => ({
      ...bulkType,
      id: index + 1,
      name: index === 10 ? 'Liquid bulk' : `Type ${index + 1}`,
    }))

    render(
      <CommodityTypesTable
        types={types}
        loading={false}
        canManage
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    const catalog = screen.getByRole('list', { name: 'Types catalog' })
    expect(catalog).toHaveClass('overflow-y-auto')
    expect(catalog.className).toContain('max-h-')

    fireEvent.change(screen.getByLabelText('Search Types'), {
      target: { value: 'liquid' },
    })

    expect(screen.getByText('Liquid bulk')).toBeTruthy()
    expect(screen.queryByText('Type 1')).toBeNull()
    expect(screen.getByText('1 shown')).toBeTruthy()
  })
})
