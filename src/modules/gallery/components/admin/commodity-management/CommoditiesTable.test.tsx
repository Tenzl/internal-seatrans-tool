// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CommoditiesTable } from './CommoditiesTable'

const commodity = {
  id: 9,
  serviceTypeId: 1,
  name: 'WOOD_CHIPS',
  displayName: 'Wood Chips',
  description: 'Biomass cargo',
  requiredImageCount: 18,
  cargoType: 'IN_BULK',
}

afterEach(cleanup)

describe('CommoditiesTable hidden internal code contract', () => {
  it('does not render the internal code input or table column', () => {
    render(
      <CommoditiesTable
        commodities={[commodity]}
        loading={false}
        canManage
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    expect(screen.queryByLabelText('New Commodity code')).toBeNull()
    expect(screen.queryByLabelText('Edit Commodity code')).toBeNull()
    expect(screen.queryByRole('columnheader', { name: 'Code' })).toBeNull()
    expect(screen.queryByText('WOOD_CHIPS')).toBeNull()
  })

  it('hides Description while preserving existing data during a rename', async () => {
    const onCreate = vi.fn().mockResolvedValue(true)
    const onUpdate = vi.fn().mockResolvedValue(true)
    render(
      <CommoditiesTable
        commodities={[commodity]}
        loading={false}
        canManage
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={vi.fn()}
      />
    )

    fireEvent.change(screen.getByLabelText('New Commodity name'), {
      target: { value: 'Rice' },
    })
    expect(screen.queryByLabelText('New Commodity description')).toBeNull()
    expect(screen.queryByLabelText('Edit Commodity description')).toBeNull()
    expect(
      screen.queryByRole('columnheader', { name: 'Description' })
    ).toBeNull()
    expect(screen.queryByRole('columnheader')).toBeNull()
    expect(screen.queryByText('Biomass cargo')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Add Commodity' }))

    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({
        displayName: 'Rice',
        description: '',
      })
    )

    const editButton = screen.getByLabelText('Edit Commodity Wood Chips')
    expect(editButton).toHaveTextContent('Edit')
    expect(
      screen.getByLabelText('Delete Commodity Wood Chips')
    ).toHaveTextContent('Delete')
    fireEvent.click(editButton)
    const editInput = screen.getByLabelText('Edit Commodity name')
    fireEvent.change(editInput, {
      target: { value: 'Biomass' },
    })
    fireEvent.keyDown(editInput, { key: 'Enter' })

    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(9, {
        displayName: 'Biomass',
        description: 'Biomass cargo',
      })
    )
  })

  it('filters by Commodity name and keeps a six-row scroll viewport', () => {
    render(
      <CommoditiesTable
        commodities={[
          commodity,
          {
            ...commodity,
            id: 10,
            name: 'RICE',
            displayName: 'Rice',
            description: 'Food cargo',
          },
        ]}
        loading={false}
        canManage
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
      />
    )

    const table = screen.getByRole('table', {
      name: 'Commodities catalog',
    })
    const catalog = table.closest('.admin-data-table')
    expect(catalog).not.toBeNull()
    expect((catalog as HTMLElement).style.maxHeight).toBe('15rem')
    expect(screen.queryByRole('columnheader')).toBeNull()

    fireEvent.change(screen.getByLabelText('Search Commodities'), {
      target: { value: 'rice' },
    })

    expect(screen.getByText('Rice')).toBeTruthy()
    expect(screen.queryByText('Wood Chips')).toBeNull()
    expect(screen.getByText('1 shown')).toBeTruthy()
  })
})
