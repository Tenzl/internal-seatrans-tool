import { describe, expect, it } from 'vitest'
import { formatPortDisplay } from './portDisplay'

describe('formatPortDisplay', () => {
  it('formats port name, country and code in one canonical label', () => {
    expect(
      formatPortDisplay({
        name: 'Hakata/Fukuoka',
        countryCode: 'jp',
        code: 'jphkt',
      })
    ).toBe('HAKATA/FUKUOKA, JP (JPHKT)')
  })

  it('keeps useful fallbacks when country or code is missing', () => {
    expect(formatPortDisplay({ name: 'Qui Nhon', countryCode: 'VN' })).toBe(
      'QUI NHON, VN'
    )
    expect(formatPortDisplay({ name: 'Unknown', code: 'ABC' })).toBe(
      'UNKNOWN (ABC)'
    )
    expect(formatPortDisplay({ name: 'Local port' })).toBe('LOCAL PORT')
  })
})
