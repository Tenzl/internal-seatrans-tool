'use client'

import { useQuery } from '@tanstack/react-query'
import { isAdminRole } from '@/config/section-catalog'
import {
  epdaParametersService,
  type PartialEpdaParameterValues,
} from '@/modules/inquiries/services/epdaParametersService'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { History } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  getAreaShortLabel,
  type AreaOption,
} from '@/features/admin/components/invoice/epdaFormParameters'
import { createEpdaParameterLabelFns } from '@/features/admin/epda-parameters/epdaParameterLabels'

const getAreaLabel = (area: AreaOption) => getAreaShortLabel(area)

export function ParamHistoryButton({ area }: { area: AreaOption }) {
  const { t } = useI18n()
  const currentUser = useCurrentUser()
  const canViewHistory = isAdminRole(currentUser?.role)
  const { data: logs } = useQuery({
    queryKey: ['epda-param-logs', area],
    queryFn: () => epdaParametersService.listChangeLogs({ area, limit: 50 }),
    enabled: canViewHistory,
  })

  if (!canViewHistory || !logs || logs.length === 0) return null

  const { sectionLabel, fieldLabel, rowFieldLabel } =
    createEpdaParameterLabelFns(t)

  const fmtVal = (v: unknown): string => {
    if (v === undefined || v === null) return '—'
    if (typeof v === 'number')
      return v.toLocaleString('en-US', { maximumFractionDigits: 4 })
    return String(v)
  }

  const fmtArrayRow = (row: unknown): string => {
    if (!row || typeof row !== 'object') return fmtVal(row)
    const entries = Object.entries(row as Record<string, unknown>)
      .filter(([, val]) => val !== undefined)
      .map(([k, val]) => `${rowFieldLabel('row', k)}: ${fmtVal(val)}`)
    return entries.length ? entries.join(' | ') : '—'
  }

  const NESTED_GROUPS = ['hours', 'garbage', 'quarantine', 'coeff']
  const ARRAY_FIELDS = [
    'agencyFeeTiers',
    'moorUnmoorBerthTiers',
    'moorUnmoorBuoyTiers',
    'tugTiers',
    'cargoAgencyRates',
  ]

  // Detailed per-field diff: scalar fields show before → after; array sections
  // (tiers/rates) expand into row-level changes so the history shows the full edit.
  const fieldChanges = (
    before: PartialEpdaParameterValues | null,
    after: PartialEpdaParameterValues | null
  ): { label: string; from: string; to: string }[] => {
    const b = (before ?? {}) as Record<
      string,
      Record<string, unknown> | unknown[]
    >
    const a = (after ?? {}) as Record<
      string,
      Record<string, unknown> | unknown[]
    >
    const out: { label: string; from: string; to: string }[] = []
    for (const grp of NESTED_GROUPS) {
      const bg = (b[grp] ?? {}) as Record<string, unknown>
      const ag = (a[grp] ?? {}) as Record<string, unknown>
      const keys = new Set([...Object.keys(bg), ...Object.keys(ag)])
      keys.forEach((k) => {
        if (JSON.stringify(bg[k]) !== JSON.stringify(ag[k]))
          out.push({
            label: fieldLabel(grp, k),
            from: fmtVal(bg[k]),
            to: fmtVal(ag[k]),
          })
      })
    }
    for (const group of ARRAY_FIELDS) {
      const beforeRows = Array.isArray(b[group])
        ? (b[group] as Record<string, unknown>[])
        : []
      const afterRows = Array.isArray(a[group])
        ? (a[group] as Record<string, unknown>[])
        : []
      const max = Math.max(beforeRows.length, afterRows.length)
      for (let i = 0; i < max; i += 1) {
        const beforeRow = beforeRows[i]
        const afterRow = afterRows[i]
        const beforeExists = beforeRow && typeof beforeRow === 'object'
        const afterExists = afterRow && typeof afterRow === 'object'
        if (!beforeExists || !afterExists) {
          if (JSON.stringify(beforeRow) !== JSON.stringify(afterRow)) {
            out.push({
              label: `${sectionLabel(group)} · #${i + 1}`,
              from: fmtArrayRow(beforeRow),
              to: fmtArrayRow(afterRow),
            })
          }
          continue
        }

        const keys = new Set([
          ...Object.keys(beforeRow as Record<string, unknown>),
          ...Object.keys(afterRow as Record<string, unknown>),
        ])

        keys.forEach((key) => {
          const fromVal = (beforeRow as Record<string, unknown>)[key]
          const toVal = (afterRow as Record<string, unknown>)[key]
          if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
            out.push({
              label: `${sectionLabel(group)} · #${i + 1} · ${rowFieldLabel(group, key)}`,
              from: fmtVal(fromVal),
              to: fmtVal(toVal),
            })
          }
        })
      }
    }
    return out
  }

  const changeKind = (
    from: string,
    to: string
  ): 'added' | 'removed' | 'updated' => {
    if ((from === '—' || from === '') && to !== '—' && to !== '') return 'added'
    if ((to === '—' || to === '') && from !== '—' && from !== '')
      return 'removed'
    return 'updated'
  }

  const changeBadge = (kind: 'added' | 'removed' | 'updated') => {
    if (kind === 'added') {
      return (
        <Badge
          variant='outline'
          className='border-emerald-200 bg-emerald-50 text-emerald-700'
        >
          Added
        </Badge>
      )
    }
    if (kind === 'removed') {
      return (
        <Badge
          variant='outline'
          className='border-rose-200 bg-rose-50 text-rose-700'
        >
          Removed
        </Badge>
      )
    }
    return (
      <Badge
        variant='outline'
        className='border-sky-200 bg-sky-50 text-sky-700'
      >
        Updated
      </Badge>
    )
  }

  const actionLabel = (action: string) =>
    ({
      UPSERT_AREA: t('phist.upsertArea'),
      UPSERT_PORT: t('phist.upsertPort'),
      DELETE_PORT: t('phist.deletePort'),
      UPSERT_GROUP: t('phist.upsertGroup'),
      DELETE_GROUP: t('phist.deleteGroup'),
      SET_GROUP_MEMBERS: t('phist.setMembers'),
    })[action] ?? action

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant='outline' size='sm' className='gap-2'>
          <History className='h-4 w-4' /> {t('phist.btn')} ({logs.length})
        </Button>
      </DialogTrigger>
      <DialogContent className='max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <History className='h-4 w-4 text-muted-foreground' />
            {t('phist.title', { area: getAreaLabel(area) })}
          </DialogTitle>
        </DialogHeader>
        <ul className='max-h-[60vh] space-y-2 overflow-y-auto pr-1'>
          {logs.map((log) => {
            const isDelete =
              log.action === 'DELETE_PORT' || log.action === 'DELETE_GROUP'
            const isMembers = log.action === 'SET_GROUP_MEMBERS'
            const isCreate = !log.beforeValues && !isDelete && !isMembers
            const changes = fieldChanges(log.beforeValues, log.afterValues)
            const who =
              log.changedBy.fullName ||
              log.changedBy.email ||
              (log.changedBy.id ? `User #${log.changedBy.id}` : '—')
            return (
              <li
                key={log.id}
                className='rounded-md border border-border/50 bg-muted/20 px-3 py-2.5 text-sm'
              >
                <div className='flex flex-wrap items-baseline justify-between gap-x-3'>
                  <p className='font-medium'>
                    {actionLabel(log.action)}
                    {log.scope === 'PORT' && log.portId != null
                      ? ` · ${t('phist.port')} #${log.portId}`
                      : ''}
                  </p>
                  <p className='text-[11px] text-muted-foreground'>
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>

                {/* Who made the change */}
                <p className='mt-0.5 text-[12px]'>
                  <span className='text-muted-foreground'>
                    {t('phist.by')}:{' '}
                  </span>
                  <span className='font-medium text-foreground'>{who}</span>
                </p>

                {/* What changed — field-level before → after */}
                {isMembers ? (
                  <p className='mt-1 text-[12px] text-muted-foreground'>
                    {t('phist.setMembers')}
                  </p>
                ) : changes.length ? (
                  <ul className='mt-1 space-y-0.5'>
                    {changes.map((c, i) => (
                      <li
                        key={i}
                        className='rounded-sm border border-border/50 bg-background/70 px-2 py-1.5 text-[12px] leading-snug'
                      >
                        <div className='mb-1 flex flex-wrap items-center gap-2'>
                          {changeBadge(changeKind(c.from, c.to))}
                          <span className='font-medium text-foreground'>
                            {c.label}
                          </span>
                        </div>
                        <div className='flex flex-wrap items-center gap-1.5'>
                          <span className='rounded bg-rose-50 px-1.5 py-0.5 font-medium text-rose-700 line-through'>
                            {c.from}
                          </span>
                          <span className='text-muted-foreground'>→</span>
                          <span className='rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700 tabular-nums'>
                            {c.to}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : isCreate ? (
                  <p className='mt-1 text-[12px] text-muted-foreground'>
                    {t('phist.created')}
                  </p>
                ) : !isDelete ? (
                  <p className='mt-1 text-[12px] text-muted-foreground'>—</p>
                ) : null}
              </li>
            )
          })}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

// ---------- page ----------
