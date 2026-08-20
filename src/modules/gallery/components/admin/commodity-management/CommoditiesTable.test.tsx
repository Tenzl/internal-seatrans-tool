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

    fireEvent.click(screen.getByLabelText('Edit Commodity Wood Chips'))
    fireEvent.change(screen.getByLabelText('Edit Commodity name'), {
      target: { value: 'Biomass' },
    })
    fireEvent.click(screen.getByLabelText('Save Commodity'))

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

    const catalog = screen.getByRole('table', {
      name: 'Commodities catalog',
    }).parentElement
    expect(catalog).toHaveClass('overflow-y-auto')
    expect(catalog).toHaveClass('max-h-[15rem]')

    fireEvent.change(screen.getByLabelText('Search Commodities'), {
      target: { value: 'rice' },
    })

    expect(screen.getByText('Rice')).toBeTruthy()
    expect(screen.queryByText('Wood Chips')).toBeNull()
    expect(screen.getByText('1 shown')).toBeTruthy()
  })
})
