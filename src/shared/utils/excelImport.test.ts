import { describe, expect, it, vi } from 'vitest'

import { parseExcelFile } from './excelImport'

vi.mock('read-excel-file/browser', () => ({
  default: vi.fn().mockResolvedValue([
    {
      sheet: 'Partners',
      data: [
        ['Name*', 'Payment Due Days'],
        ['Ocean Partner', 30],
      ],
    },
  ]),
}))

describe('parseExcelFile', () => {
  it('parses quoted CSV values without splitting embedded commas', async () => {
    const file = new File(
      ['\uFEFFName*,Address\n"Ocean Partner","Da Nang, Viet Nam"\n'],
      'partners.csv',
      { type: 'text/csv' },
    )

    await expect(parseExcelFile(file)).resolves.toEqual({
      headers: ['Name*', 'Address'],
      rows: [{ 'name*': 'Ocean Partner', address: 'Da Nang, Viet Nam' }],
    })
  })

  it('loads XLSX data through the lightweight browser reader', async () => {
    const file = new File(['PK'], 'partners.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    await expect(parseExcelFile(file)).resolves.toEqual({
      headers: ['Name*', 'Payment Due Days'],
      rows: [{ 'name*': 'Ocean Partner', payment_due_days: '30' }],
    })
  })
})
