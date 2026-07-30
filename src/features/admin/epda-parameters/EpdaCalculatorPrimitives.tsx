/* eslint-disable react-refresh/only-export-components -- shared calculator render helpers intentionally live together */
import type { ReactNode } from 'react'
import type { GrtTier } from '@/modules/inquiries/components/common/quoteParameters'
import { parseFiniteNumber } from '@/shared/utils/parseNumber'

export function boldNumbers(text: string): ReactNode {
  return text.split(/(\d[\d.,]*)/g).map((part, i) =>
    /^\d/.test(part) ? (
      <strong key={i} className='font-semibold text-foreground'>
        {part}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}

export const fmtNum = (n: number) =>
  n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

/** Compact two-column row used inside the guide example tables. */
export function ScanRow({
  label,
  test,
  hit,
}: {
  label: ReactNode
  test: ReactNode
  hit?: boolean
}) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-md px-3 py-2 text-base ${
        hit
          ? 'bg-primary/10 font-semibold text-foreground'
          : 'text-muted-foreground'
      }`}
    >
      <span>{label}</span>
      <span className='tabular-nums'>{test}</span>
    </div>
  )
}

/**
 * Live garbage calculator. Garbage = rate × ⌈days / 2⌉ (a block per 2 days).
 * Staff enter the days. HCM has berth + buoy, QN berth only.
 */
export function resolveGrtBand(tiers: GrtTier[], grt: number): GrtTier | undefined {
  if (!tiers.length) return undefined
  const grtNum = parseFiniteNumber(grt)
  if (grtNum === null) return undefined
  let i = tiers.findIndex((tr) => {
    const maxGrt = tr.maxGrt === null ? null : parseFiniteNumber(tr.maxGrt)
    return maxGrt === null || grtNum <= maxGrt
  })
  if (i < 0) i = tiers.length - 1
  return tiers[i]
}

/**
 * Live moor / unmooring calculator. Staff type a GRT and the matched charge appears.
 * QN has a single table; HCM has separate berth & buoy tables, both shown.
 */
