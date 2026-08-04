export type Meridiem = 'AM' | 'PM'

export type ClockParts = {
  hour: string
  minute: string
  meridiem: Meridiem
}

const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function parseLocalDateTime(
  value: string | null | undefined
): Date | undefined {
  const match = value?.trim().match(LOCAL_DATE_TIME)
  if (!match) return undefined

  const [, yearText, monthText, dayText, hourText = '00', minuteText = '00'] =
    match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59
  ) {
    return undefined
  }

  const parsed = new Date(year, month - 1, day, hour, minute, 0, 0)
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return undefined
  }
  return parsed
}

export function formatLocalDateTime(date: Date, includeTime: boolean): string {
  const dateValue = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  if (!includeTime) return dateValue
  return `${dateValue}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function getClockParts(date: Date): ClockParts {
  const hours = date.getHours()
  return {
    hour: pad(hours % 12 || 12),
    minute: pad(date.getMinutes()),
    meridiem: hours >= 12 ? 'PM' : 'AM',
  }
}

export function applyClockParts(date: Date, parts: ClockParts): Date {
  const next = new Date(date)
  const hour12 = Math.min(12, Math.max(1, Number(parts.hour) || 12))
  const minute = Math.min(59, Math.max(0, Number(parts.minute) || 0))
  const hour24 = parts.meridiem === 'PM' ? (hour12 % 12) + 12 : hour12 % 12
  next.setHours(hour24, minute, 0, 0)
  return next
}
