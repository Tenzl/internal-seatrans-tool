import { describe, expect, it } from 'vitest'
import {
  applyClockParts,
  formatLocalDateTime,
  getClockParts,
  parseLocalDateTime,
} from './dateTimePicker'

describe('dateTimePicker utilities', () => {
  it('round-trips date-only and local date-time values without UTC shifting', () => {
    const date = parseLocalDateTime('2026-08-03')
    const dateTime = parseLocalDateTime('2026-08-03T16:25')

    expect(date && formatLocalDateTime(date, false)).toBe('2026-08-03')
    expect(dateTime && formatLocalDateTime(dateTime, true)).toBe(
      '2026-08-03T16:25'
    )
  })

  it('rejects impossible calendar values', () => {
    expect(parseLocalDateTime('2026-02-30')).toBeUndefined()
    expect(parseLocalDateTime('not-a-date')).toBeUndefined()
  })

  it('converts midnight and noon correctly in the 12-hour selector', () => {
    const date = new Date(2026, 7, 3)
    const midnight = applyClockParts(date, {
      hour: '12',
      minute: '05',
      meridiem: 'AM',
    })
    const noon = applyClockParts(date, {
      hour: '12',
      minute: '30',
      meridiem: 'PM',
    })

    expect(getClockParts(midnight)).toEqual({
      hour: '12',
      minute: '05',
      meridiem: 'AM',
    })
    expect(formatLocalDateTime(noon, true)).toBe('2026-08-03T12:30')
  })
})
