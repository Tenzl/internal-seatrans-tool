'use client'

import { useEffect, useRef, useState, type ComponentProps } from 'react'
import {
  formatNumberInputValue,
  MAX_NUMBER_INPUT_DECIMALS,
  type NumberInputDecimalScale,
  parseNumberInputDraft,
} from '@/shared/utils/numberInput'
import { Input } from '@/components/ui/input'

type BaseInputProps = ComponentProps<typeof Input>

export interface NumberInputProps extends Omit<
  BaseInputProps,
  'inputMode' | 'max' | 'min' | 'onChange' | 'step' | 'type' | 'value'
> {
  value: number | string | null | undefined
  onValueChange: (value: number | null, canonical: string) => void
  decimalScale?: NumberInputDecimalScale
  min?: number
  max?: number
}

/**
 * Non-negative numeric input with live thousands grouping and an editable draft.
 * The second onValueChange argument is an ungrouped string for string-backed APIs.
 */
export function NumberInput({
  value,
  onValueChange,
  decimalScale = MAX_NUMBER_INPUT_DECIMALS,
  min = 0,
  max,
  maxLength = 32,
  onBlur,
  onFocus,
  ...props
}: NumberInputProps) {
  const focusedRef = useRef(false)
  const [draft, setDraft] = useState(() =>
    formatNumberInputValue(value, decimalScale)
  )

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(formatNumberInputValue(value, decimalScale))
    }
  }, [decimalScale, value])

  const parsedDraft = parseNumberInputDraft(draft, {
    decimalScale,
    min,
    max,
  })

  return (
    <Input
      {...props}
      type='text'
      inputMode='decimal'
      role='spinbutton'
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={parsedDraft?.value ?? undefined}
      maxLength={maxLength}
      value={draft}
      onFocus={(event) => {
        focusedRef.current = true
        setDraft(formatNumberInputValue(value, decimalScale))
        onFocus?.(event)
      }}
      onBlur={(event) => {
        focusedRef.current = false
        const parsed = parseNumberInputDraft(draft, {
          decimalScale,
          min,
          max,
        })
        if (parsed?.value == null) {
          setDraft('')
          onValueChange(null, '')
        } else {
          const formatted = formatNumberInputValue(parsed.value, decimalScale)
          setDraft(formatted)
          onValueChange(parsed.value, String(parsed.value))
        }
        onBlur?.(event)
      }}
      onChange={(event) => {
        const parsed = parseNumberInputDraft(event.target.value, {
          decimalScale,
          min,
          max,
        })
        if (!parsed) return
        setDraft(parsed.formatted)
        onValueChange(parsed.value, parsed.canonical)
      }}
    />
  )
}
