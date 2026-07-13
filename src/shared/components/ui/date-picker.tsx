"use client"

import * as React from "react"
import { format } from "date-fns"
import { ChevronDownIcon, X } from "lucide-react"

import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { Calendar } from "@/shared/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover"

interface DatePickerProps {
  id?: string
  value?: string
  onChange?: (date: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

export const DatePicker = React.memo(function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  )

  const handleSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
    if (selectedDate && onChange) {
      // Format as YYYY-MM-DD for form submission
      const formattedDate = format(selectedDate, "yyyy-MM-dd")
      onChange(formattedDate)
    } else if (!selectedDate && onChange) {
      onChange("")
    }
    setOpen(false)
  }

  // Update internal state when value prop changes
  React.useEffect(() => {
    if (value) {
      setDate(new Date(value))
    } else {
      setDate(undefined)
    }
  }, [value])

  const handleClearClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (!disabled && date) {
      handleSelect(undefined)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-between text-left font-normal bg-white",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {date ? date.toLocaleDateString() : placeholder}
          {date ? (
            <span
              role="button"
              aria-label="Clear selected date"
              className="-mr-3 ml-2 inline-flex min-h-9 min-w-10 items-center justify-center border-l border-input px-3 text-red-500 hover:text-red-600"
              onMouseDown={handleClearClick}
              onClick={handleClearClick}
            >
              <X className="h-4 w-4" />
            </span>
          ) : (
            <ChevronDownIcon />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          captionLayout="dropdown"
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  )
},
(prev, next) =>
  prev.value === next.value &&
  prev.disabled === next.disabled &&
  prev.id === next.id &&
  prev.placeholder === next.placeholder &&
  prev.className === next.className &&
  prev.required === next.required
)
