// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DateTimePicker } from './DateTimePicker'

afterEach(cleanup)

describe('DateTimePicker', () => {
  it('renders the supplied month-grid design without an event title field', () => {
    render(
      <DateTimePicker
        value='2026-08-03T14:36'
        includeTime
        onValueChange={vi.fn()}
      />
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Select date and time' })
    )

    expect(screen.getByLabelText('Month')).toBeInTheDocument()
    expect(screen.getByLabelText('Year')).toBeInTheDocument()
    expect(screen.getByText('Mon')).toBeInTheDocument()
    expect(screen.getByLabelText('Hour')).toBeInTheDocument()
    expect(screen.getByLabelText('Minute')).toBeInTheDocument()
    expect(
      screen.queryByPlaceholderText(/event title/i)
    ).not.toBeInTheDocument()
  })

  it('keeps time controls off for date-only fields', () => {
    render(<DateTimePicker value='2026-08-03' onValueChange={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Select date' }))

    expect(screen.queryByLabelText('Hour')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Minute')).not.toBeInTheDocument()
  })

  it('shows time controls immediately before a date is selected', () => {
    render(<DateTimePicker value='' includeTime onValueChange={vi.fn()} />)

    fireEvent.click(
      screen.getByRole('button', { name: 'Select date and time' })
    )

    expect(screen.getByLabelText('Hour')).toBeInTheDocument()
    expect(screen.getByLabelText('Minute')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Apply date & time' })
    ).toBeDisabled()
  })
})
