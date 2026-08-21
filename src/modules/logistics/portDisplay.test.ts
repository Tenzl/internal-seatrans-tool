import { describe, expect, it } from 'vitest'
import { buildPortDisplayOptions, formatPortDisplay } from './portDisplay'

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

  it('creates independently selectable main and sub-name labels with one Port identity', () => {
    expect(
      buildPortDisplayOptions({
        id: 42,
        name: 'QUY NHON PORT',
        subName1: 'QUI NHON',
        subName2: 'QUY NHON',
        countryCode: 'VN',
        code: 'VNUIH',
      })
    ).toEqual([
      {
        key: '42-main',
        kind: 'main',
        name: 'QUY NHON PORT',
        label: 'QUY NHON PORT, VN (VNUIH)',
      },
      {
        key: '42-sub-1',
        kind: 'sub',
        name: 'QUI NHON',
        label: 'QUI NHON, VN (VNUIH)',
      },
      {
        key: '42-sub-2',
        kind: 'sub',
        name: 'QUY NHON',
        label: 'QUY NHON, VN (VNUIH)',
      },
    ])
  })
})
