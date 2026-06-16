'use client'

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type TourStep = {
  /** CSS selector for the element to highlight, e.g. '[data-tour="area-tabs"]'. */
  target: string
  title: string
  body: string
}

type TourLabels = {
  next: string
  back: string
  done: string
  skip: string
  /** e.g. (2, 5) => "2 / 5" */
  step: (i: number, n: number) => string
}

const PAD = 6 // spotlight padding around the target
const GAP = 12 // gap between spotlight and the card

/**
 * Lightweight product tour: dims the page, spotlights one element at a time,
 * and shows a card with Back / Next / Skip. No external deps — the cut-out is a
 * transparent box with a huge box-shadow, and the card is positioned with the
 * target's live bounding rect (recomputed on scroll/resize).
 */
export function GuidedTour({
  steps,
  run,
  onClose,
  labels,
}: {
  steps: TourStep[]
  run: boolean
  onClose: () => void
  labels: TourLabels
}) {
  const [mounted, setMounted] = useState(false)
  const [active, setActive] = useState<TourStep[]>([])
  const [idx, setIdx] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => setMounted(true), [])

  // When the tour starts, keep only steps whose target is actually on the page
  // (e.g. the history button is hidden until there are logs).
  useEffect(() => {
    if (!run) return
    setActive(steps.filter((s) => document.querySelector(s.target)))
    setIdx(0)
  }, [run, steps])

  const current = active[idx]

  const measure = useCallback(() => {
    if (!current) return
    const el = document.querySelector(current.target)
    setRect(el ? el.getBoundingClientRect() : null)
  }, [current])

  // Scroll the target into view, then track its rect on scroll/resize.
  useEffect(() => {
    if (!run || !current) return
    const el = document.querySelector(current.target) as HTMLElement | null
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    measure()
    const t = window.setTimeout(measure, 320)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [run, current, measure])

  // Position the card below the spotlight, or above when there's no room.
  useLayoutEffect(() => {
    if (!rect || !cardRef.current) return
    const card = cardRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    let top = rect.bottom + GAP
    if (top + card.height > vh - GAP) {
      const above = rect.top - card.height - GAP
      top = above >= GAP ? above : Math.max(GAP, vh - card.height - GAP)
    }
    let left = rect.left + rect.width / 2 - card.width / 2
    left = Math.max(GAP, Math.min(left, vw - card.width - GAP))
    setPos({ top, left })
  }, [rect, idx])

  // Keyboard: Esc skips, arrows navigate.
  useEffect(() => {
    if (!run) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') setIdx((i) => Math.min(i + 1, active.length - 1))
      else if (e.key === 'ArrowLeft') setIdx((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [run, active.length, onClose])

  if (!mounted || !run || active.length === 0 || !current) return null

  const isLast = idx === active.length - 1
  const next = () => (isLast ? onClose() : setIdx((i) => i + 1))
  const back = () => setIdx((i) => Math.max(0, i - 1))

  const spotlight = rect
    ? {
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null

  return createPortal(
    <div className='fixed inset-0 z-[100]' aria-live='polite' role='dialog'>
      {/* Dim + spotlight cut-out (huge box-shadow). Captures clicks so the user
          stays on the tour; the page underneath is not interactive. */}
      {spotlight ? (
        <div
          className='pointer-events-auto absolute rounded-lg ring-2 ring-primary transition-all duration-200'
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.6)',
          }}
        />
      ) : (
        <div className='pointer-events-auto absolute inset-0 bg-slate-900/60' />
      )}

      {/* Step card */}
      <div
        ref={cardRef}
        className='pointer-events-auto absolute w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border bg-popover p-4 text-popover-foreground shadow-xl'
        style={{
          top: pos?.top ?? -9999,
          left: pos?.left ?? -9999,
          opacity: pos ? 1 : 0,
        }}
      >
        <button
          type='button'
          onClick={onClose}
          aria-label={labels.skip}
          className='absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
        >
          <X className='h-4 w-4' />
        </button>

        <p className='pr-6 text-sm font-semibold'>{current.title}</p>
        <p className='mt-1 text-sm text-muted-foreground'>{current.body}</p>

        <div className='mt-4 flex items-center justify-between gap-2'>
          <span className='text-xs tabular-nums text-muted-foreground'>
            {labels.step(idx + 1, active.length)}
          </span>
          <div className='flex items-center gap-2'>
            {idx > 0 && (
              <Button variant='ghost' size='sm' onClick={back}>
                {labels.back}
              </Button>
            )}
            <Button size='sm' onClick={next}>
              {isLast ? labels.done : labels.next}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
