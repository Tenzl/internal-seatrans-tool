// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { BookingCommoditySelect } from './BookingCommoditySelect'

const commodityServiceMock = vi.hoisted(() => ({
  resolveServiceTypeId: vi.fn(),
  listCommodityTypes: vi.fn(),
  listAdminCommodities: vi.fn(),
}))

vi.mock('@/modules/gallery/services/commodityService', () => ({
  commodityService: commodityServiceMock,
}))

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false)
  window.HTMLElement.prototype.setPointerCapture = vi.fn()
  window.HTMLElement.prototype.releasePointerCapture = vi.fn()
})

afterEach(cleanup)

function renderSelect(
  props: Partial<React.ComponentProps<typeof BookingCommoditySelect>> = {}
) {
  const onTypeChange = vi.fn()
  const onCommodityChange = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <BookingCommoditySelect
        commodityType=''
        commodityTypeId={null}
        commodityName=''
        commodityId={null}
        description=''
        onTypeChange={onTypeChange}
        onCommodityChange={onCommodityChange}
        {...props}
      />
    </QueryClientProvider>
  )
  return { onTypeChange, onCommodityChange }
}

describe('BookingCommoditySelect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    commodityServiceMock.resolveServiceTypeId.mockResolvedValue(2)
    commodityServiceMock.listCommodityTypes.mockResolvedValue([
      { id: 7, serviceTypeId: 2, code: 'FOOD', name: 'FOODSTUFFS' },
    ])
    commodityServiceMock.listAdminCommodities.mockResolvedValue([
      {
        id: 42,
        serviceTypeId: 2,
        name: 'RICE',
        displayName: 'RICE',
      },
    ])
  })

  it('loads both Freight Forwarding catalogs and changes each selection independently', async () => {
    const { onTypeChange, onCommodityChange } = renderSelect()

    await waitFor(() => {
      expect(commodityServiceMock.listCommodityTypes).toHaveBeenCalledWith(
        2,
        expect.any(AbortSignal)
      )
      expect(commodityServiceMock.listAdminCommodities).toHaveBeenCalledWith(
        2,
        expect.any(AbortSignal)
      )
    })

    fireEvent.click(screen.getByRole('combobox', { name: 'Type' }))
    fireEvent.click(await screen.findByRole('option', { name: 'FOODSTUFFS' }))
    expect(onTypeChange).toHaveBeenCalledWith('FOODSTUFFS', 7)
    expect(onCommodityChange).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('combobox', { name: 'Commodity' }))
    fireEvent.click(await screen.findByRole('option', { name: 'RICE' }))
    expect(onCommodityChange).toHaveBeenCalledWith('RICE', 42)
    expect(onTypeChange).toHaveBeenCalledTimes(1)
  })

  it('keeps a legacy combined description selectable when snapshots are absent', async () => {
    renderSelect({
      commodityId: 91,
      description: 'Historical commodity IN Old group',
    })

    await waitFor(() =>
      expect(commodityServiceMock.listAdminCommodities).toHaveBeenCalled()
    )
    fireEvent.click(screen.getByRole('combobox', { name: 'Commodity' }))

    expect(
      await screen.findByRole('option', {
        name: 'Historical commodity IN Old group',
      })
    ).toBeInTheDocument()
  })

  it('searches Type and Commodity in six-row scrollable lists', async () => {
    commodityServiceMock.listCommodityTypes.mockResolvedValue(
      Array.from({ length: 10 }, (_, index) => ({
        id: index + 1,
        serviceTypeId: 2,
        name: `TYPE ${String(index + 1).padStart(2, '0')}`,
      }))
    )
    commodityServiceMock.listAdminCommodities.mockResolvedValue(
      Array.from({ length: 10 }, (_, index) => ({
        id: index + 101,
        serviceTypeId: 2,
        name: `COMMODITY ${String(index + 1).padStart(2, '0')}`,
        displayName: `COMMODITY ${String(index + 1).padStart(2, '0')}`,
      }))
    )
    const { onTypeChange, onCommodityChange } = renderSelect()

    await waitFor(() => {
      expect(commodityServiceMock.listCommodityTypes).toHaveBeenCalled()
      expect(commodityServiceMock.listAdminCommodities).toHaveBeenCalled()
    })
    fireEvent.click(screen.getByRole('combobox', { name: 'Type' }))
    const typeSearch = await screen.findByPlaceholderText('Search types...')
    const typeList = typeSearch
      .closest('[data-slot="command"]')
      ?.querySelector('[data-slot="command-list"]')
    expect(typeList).toHaveClass('max-h-[200px]')

    fireEvent.change(typeSearch, { target: { value: 'TYPE 09' } })
    fireEvent.click(await screen.findByRole('option', { name: 'TYPE 09' }))
    expect(onTypeChange).toHaveBeenCalledWith('TYPE 09', 9)

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Type' })).toHaveAttribute(
        'aria-expanded',
        'false'
      )
    )
    const commodityTrigger = screen.getByRole('combobox', {
      name: 'Commodity',
    })
    fireEvent.click(commodityTrigger)
    await waitFor(() =>
      expect(commodityTrigger).toHaveAttribute('aria-expanded', 'true')
    )
    const commoditySearch = await screen.findByPlaceholderText(
      'Search commodities...'
    )
    const commodityList = commoditySearch
      .closest('[data-slot="command"]')
      ?.querySelector('[data-slot="command-list"]')
    expect(commodityList).toHaveClass('max-h-[200px]')

    fireEvent.change(commoditySearch, {
      target: { value: 'COMMODITY 10' },
    })
    fireEvent.click(await screen.findByRole('option', { name: 'COMMODITY 10' }))
    expect(onCommodityChange).toHaveBeenCalledWith('COMMODITY 10', 110)
  })
})
