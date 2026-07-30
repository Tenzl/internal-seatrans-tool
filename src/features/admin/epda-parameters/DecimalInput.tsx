'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { formatDecimalValue, parseDecimalText } from './decimalInputUtils'

type DecimalInputProps = {
  value: number
  onChange: (value: number) => void
  className?: string
  placeholder?: string
}

/** Keeps decimal text editable without reformatting it between keystrokes. */
export function DecimalInput({
  value,
  onChange,
  className,
  placeholder,
}: DecimalInputProps) {
  const [text, setText] = useState(() => formatDecimalValue(value))
  const [focused, setFocused] = useState(false)

  return (
    <Input
      type='text'
      inputMode='decimal'
      className={className}
      placeholder={placeholder}
      value={focused ? text : formatDecimalValue(value)}
      onFocus={() => {
        setText(formatDecimalValue(value))
        setFocused(true)
      }}
      onBlur={() => {
        setFocused(false)
        const parsed = parseDecimalText(text)
        if (parsed === null) {
          setText(formatDecimalValue(value))
          return
        }
        onChange(parsed)
        setText(formatDecimalValue(parsed))
      }}
      onChange={(event) => {
        const raw = event.target.value
        if (raw !== '' && !/^-?\d*\.?\d*$/.test(raw)) return
        setText(raw)
        const parsed = parseDecimalText(raw)
        if (parsed !== null) onChange(parsed)
      }}
    />
  )
}
