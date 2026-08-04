// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NumberInput } from './NumberInput'

describe('NumberInput', () => {
  it('formats grouping while accepting an editable decimal draft', () => {
    const onValueChange = vi.fn()
    render(
      <NumberInput aria-label='Amount' value='' onValueChange={onValueChange} />
    )

    const input = screen.getByLabelText('Amount')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '1234567.' } })

    expect(input).toHaveValue('1,234,567.')
    expect(onValueChange).toHaveBeenLastCalledWith(1_234_567, '1234567.')
  })

  it('ignores negative values and a fourth decimal digit', () => {
    render(<NumberInput aria-label='Rate' value='' onValueChange={vi.fn()} />)

    const input = screen.getByLabelText('Rate')
    fireEvent.change(input, { target: { value: '-1' } })
    expect(input).toHaveValue('')

    fireEvent.change(input, { target: { value: '12.345' } })
    fireEvent.change(input, { target: { value: '12.3456' } })
    expect(input).toHaveValue('12.345')
  })
})
