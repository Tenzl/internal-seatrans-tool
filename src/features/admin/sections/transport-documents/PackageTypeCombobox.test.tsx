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
import { PackageTypeCombobox } from './PackageTypeCombobox'
import { packageTypeService } from './packageTypeService'

const packageTypeServiceMock = vi.hoisted(() => ({
  listActive: vi.fn(),
}))

vi.mock('./packageTypeService', () => ({
  packageTypeService: packageTypeServiceMock,
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
})

afterEach(cleanup)

function renderCombobox(value: string, onValueChange = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <PackageTypeCombobox
        value={value}
        onValueChange={onValueChange}
        aria-label='Package type'
      />
    </QueryClientProvider>
  )
  return onValueChange
}

describe('PackageTypeCombobox', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    packageTypeServiceMock.listActive.mockResolvedValue([
      {
        id: 8,
        code: 'PAL',
        displayName: 'Pallet',
        isActive: true,
        sortOrder: 10,
      },
      {
        id: 9,
        code: 'CRT',
        displayName: 'Carton',
        isActive: true,
        sortOrder: 20,
      },
    ])
  })

  it('pins the stored legacy snapshot first, then keeps backend catalog order', async () => {
    renderCombobox('CRATE(S)')
    fireEvent.click(screen.getByRole('combobox', { name: 'Package type' }))

    await waitFor(() =>
      expect(packageTypeService.listActive).toHaveBeenCalled()
    )
    await screen.findByText('Pallet')
    const options = await screen.findAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      'CRATE(S)',
      '—',
      'Pallet',
      'Carton',
    ])
  })

  it('searches database labels and selects their stable code', async () => {
    const onValueChange = renderCombobox('')
    fireEvent.click(screen.getByRole('combobox', { name: 'Package type' }))
    const search = await screen.findByPlaceholderText('Search package type...')
    fireEvent.change(search, { target: { value: 'pall' } })
    fireEvent.click(await screen.findByText('Pallet'))

    expect(onValueChange).toHaveBeenCalledWith('PAL')
  })

  it('preserves the current value and allows a typed fallback on API error', async () => {
    packageTypeServiceMock.listActive.mockRejectedValue(new Error('offline'))
    const onValueChange = renderCombobox('CRATE(S)')
    expect(
      screen.getByRole('combobox', { name: 'Package type' })
    ).toHaveTextContent('CRATE(S)')
    fireEvent.click(screen.getByRole('combobox', { name: 'Package type' }))
    const search = await screen.findByPlaceholderText('Search package type...')
    fireEvent.change(search, { target: { value: 'CUSTOM PACK' } })
    fireEvent.click(await screen.findByText('Use "CUSTOM PACK"'))

    expect(onValueChange).toHaveBeenCalledWith('CUSTOM PACK')
  })
})
