'use client'

import * as React from 'react'
import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import {
  applyClockParts,
  formatLocalDateTime,
  getClockParts,
  parseLocalDateTime,
  type ClockParts,
  type Meridiem,
} from '@/shared/utils/dateTimePicker'
import { CalendarDays, Clock3, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 12 }, (_, index) =>
  String(index + 1).padStart(2, '0')
)
const MINUTES = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, '0')
)
const DEFAULT_CLOCK: ClockParts = {
  hour: '12',
  minute: '00',
  meridiem: 'AM',
}

export interface DateTimePickerProps {
  id?: string
  value?: string | null
  onValueChange: (value: string) => void
  includeTime?: boolean
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
  minDate?: Date
  maxDate?: Date
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function DateTimePicker({
  id,
  value,
  onValueChange,
  includeTime = false,
  placeholder = includeTime ? 'Select date and time' : 'Select date',
  disabled = false,
  required = false,
  className,
  minDate,
  maxDate,
}: DateTimePickerProps) {
  const selected = React.useMemo(() => parseLocalDateTime(value), [value])
  const [open, setOpen] = React.useState(false)
  const [currentMonth, setCurrentMonth] = React.useState(
    () => selected ?? new Date()
  )
  const [draftDate, setDraftDate] = React.useState<Date | undefined>(selected)
  const [clock, setClock] = React.useState<ClockParts>(() =>
    selected ? getClockParts(selected) : DEFAULT_CLOCK
  )

  const resetDraft = React.useCallback(() => {
    const anchor = selected ?? new Date()
    setCurrentMonth(new Date(anchor.getFullYear(), anchor.getMonth(), 1))
    setDraftDate(selected)
    setClock(selected ? getClockParts(selected) : DEFAULT_CLOCK)
  }, [selected])

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) resetDraft()
    setOpen(nextOpen)
  }

  const minimumDay = React.useMemo(
    () => (minDate ? startOfLocalDay(minDate) : undefined),
    [minDate]
  )
  const maximumDay = React.useMemo(
    () => (maxDate ? startOfLocalDay(maxDate) : undefined),
    [maxDate]
  )
  const dateDisabled = (date: Date) =>
    Boolean(
      (minimumDay && startOfLocalDay(date) < minimumDay) ||
      (maximumDay && startOfLocalDay(date) > maximumDay)
    )

  const calendarDays = React.useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const firstDay = startOfWeek(monthStart, { weekStartsOn: 1 })
    const lastDay = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 })
    const days: Date[] = []
    for (let day = firstDay; day <= lastDay; day = addDays(day, 1)) {
      days.push(day)
    }
    return days
  }, [currentMonth])

  const years = React.useMemo(() => {
    const todayYear = new Date().getFullYear()
    const selectedYear = selected?.getFullYear() ?? todayYear
    const firstYear =
      minDate?.getFullYear() ?? Math.min(todayYear, selectedYear) - 10
    const lastYear =
      maxDate?.getFullYear() ?? Math.max(todayYear, selectedYear) + 20
    return Array.from(
      { length: lastYear - firstYear + 1 },
      (_, index) => firstYear + index
    )
  }, [maxDate, minDate, selected])

  const handleDateSelect = (date: Date) => {
    if (dateDisabled(date)) return
    if (!includeTime) {
      onValueChange(formatLocalDateTime(date, false))
      setOpen(false)
      return
    }
    setDraftDate(applyClockParts(date, clock))
  }

  const updateClock = (patch: Partial<ClockParts>) => {
    const next = { ...clock, ...patch }
    setClock(next)
    setDraftDate((current) =>
      current ? applyClockParts(current, next) : current
    )
  }

  const handleApply = () => {
    if (!draftDate) return
    onValueChange(formatLocalDateTime(applyClockParts(draftDate, clock), true))
    setOpen(false)
  }

  const handleClear = () => {
    onValueChange('')
    setDraftDate(undefined)
    setClock(DEFAULT_CLOCK)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type='button'
          variant='outline'
          disabled={disabled}
          aria-required={required}
          aria-label={placeholder}
          data-empty={!selected}
          className={cn(
            'w-full justify-start gap-2 bg-background text-left font-normal shadow-sm transition-[border-color,box-shadow,background-color] duration-200 hover:border-primary/40 hover:bg-background focus-visible:ring-2 focus-visible:ring-ring/20 data-[empty=true]:text-muted-foreground',
            className
          )}
        >
          <CalendarDays className='h-4 w-4 shrink-0 opacity-70' />
          <span className='min-w-0 flex-1 truncate'>
            {selected
              ? format(
                  selected,
                  includeTime ? 'MMM d, yyyy, h:mm a' : 'MMM d, yyyy'
                )
              : placeholder}
          </span>
          {includeTime ? (
            <Clock3 className='h-4 w-4 shrink-0 opacity-60' />
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className='w-[22rem] max-w-[calc(100vw-2rem)] space-y-3 rounded-xl p-3 shadow-xl'
        align='start'
      >
        <div className='flex items-center justify-between gap-2'>
          <Select
            value={String(currentMonth.getMonth())}
            onValueChange={(month) =>
              setCurrentMonth(
                new Date(currentMonth.getFullYear(), Number(month), 1)
              )
            }
          >
            <SelectTrigger aria-label='Month' className='w-[150px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month, index) => (
                <SelectItem key={month} value={String(index)}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(currentMonth.getFullYear())}
            onValueChange={(year) =>
              setCurrentMonth(
                new Date(Number(year), currentMonth.getMonth(), 1)
              )
            }
          >
            <SelectTrigger aria-label='Year' className='w-[104px]'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='grid grid-cols-7 gap-1.5 text-center text-xs font-medium text-muted-foreground'>
          {WEEKDAYS.map((weekday) => (
            <div key={weekday} className='py-1'>
              {weekday}
            </div>
          ))}
        </div>

        <div
          key={format(currentMonth, 'yyyy-MM')}
          className='grid animate-in grid-cols-7 gap-1.5 duration-200 fade-in-0 slide-in-from-right-1'
        >
          {calendarDays.map((day) => {
            const outsideMonth = !isSameMonth(day, currentMonth)
            const active = Boolean(draftDate && isSameDay(day, draftDate))
            const unavailable = dateDisabled(day)

            return (
              <Button
                key={format(day, 'yyyy-MM-dd')}
                type='button'
                variant='ghost'
                disabled={unavailable}
                aria-label={format(day, 'PPP')}
                aria-pressed={active}
                onClick={() => handleDateSelect(day)}
                className={cn(
                  'relative h-10 min-w-0 rounded-md border p-0 text-sm font-normal shadow-none transition-all duration-150 hover:-translate-y-px hover:border-primary/50 hover:bg-accent hover:shadow-sm',
                  outsideMonth && 'bg-muted/20 text-muted-foreground/60',
                  isToday(day) &&
                    !active &&
                    'border-primary/50 font-semibold text-primary',
                  active &&
                    'border-primary bg-primary font-semibold text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground'
                )}
              >
                {format(day, 'd')}
                {isToday(day) ? (
                  <span className='absolute bottom-1 h-1 w-1 rounded-full bg-current' />
                ) : null}
              </Button>
            )
          })}
        </div>

        {includeTime ? (
          <div className='animate-in space-y-3 rounded-lg border bg-muted/20 p-3 duration-200 fade-in-0 slide-in-from-top-2'>
            <div className='flex items-center gap-2'>
              <Clock3 className='h-4 w-4 text-muted-foreground' />
              <h4 className='text-sm font-medium'>
                {draftDate ? format(draftDate, 'PPP') : 'Select a date'}
              </h4>
            </div>
            <div className='flex items-center gap-2'>
              <Select
                value={clock.hour}
                onValueChange={(hour) => updateClock({ hour })}
              >
                <SelectTrigger aria-label='Hour' className='w-[72px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span aria-hidden='true' className='text-muted-foreground'>
                :
              </span>
              <Select
                value={clock.minute}
                onValueChange={(minute) => updateClock({ minute })}
              >
                <SelectTrigger aria-label='Minute' className='w-[72px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MINUTES.map((minute) => (
                    <SelectItem key={minute} value={minute}>
                      {minute}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={clock.meridiem}
                onValueChange={(meridiem) =>
                  updateClock({ meridiem: meridiem as Meridiem })
                }
              >
                <SelectTrigger aria-label='AM or PM' className='w-[76px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='AM'>AM</SelectItem>
                  <SelectItem value='PM'>PM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type='button'
              className='w-full'
              onClick={handleApply}
              disabled={!draftDate}
            >
              Apply date & time
            </Button>
          </div>
        ) : null}

        <div className='flex justify-end border-t pt-2'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={handleClear}
            disabled={!selected && !draftDate}
            className='text-muted-foreground'
          >
            <X className='h-4 w-4' />
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
