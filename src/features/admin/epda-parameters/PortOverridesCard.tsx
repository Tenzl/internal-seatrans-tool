'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  mergeParameterValues,
  type QuoteVariant,
} from '@/modules/inquiries/components/common/quoteParameters'
import {
  epdaParametersService,
  planPortOverrideWrite,
  type EpdaParameterSet,
  type EpdaParameterValues,
} from '@/modules/inquiries/services/epdaParametersService'
import { portService } from '@/modules/logistics/services/portService'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { Loader2, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getAreaShortLabel,
  type AreaOption,
} from '@/features/admin/components/invoice/epdaFormParameters'
import { OverriddenBadges, ValuesEditor } from './EpdaValuesEditor'
import { PORT_OVERRIDE_VISIBLE_SECTION_IDS } from './epdaParameterSections'
import {
  diffParameterValues,
  getOverrideSectionLabels,
} from './parameterOverrides'

const getAreaLabel = (area: AreaOption) => getAreaShortLabel(area)

function scrollEditPanelIntoView(element: HTMLElement | null) {
  if (!element) return
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  })
}

export function PortOverridesCard({
  area,
  variant,
  areaValues,
  overrides,
  groups,
}: {
  area: AreaOption
  variant: QuoteVariant
  areaValues: EpdaParameterValues
  overrides: EpdaParameterSet[]
  groups: EpdaParameterSet[]
}) {
  const qc = useQueryClient()
  const { t } = useI18n()
  const [editingPortId, setEditingPortId] = useState<number | null>(null)
  const [draft, setDraft] = useState<EpdaParameterValues>(areaValues)
  const editPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editingPortId == null) return
    scrollEditPanelIntoView(editPanelRef.current)
  }, [editingPortId])

  const { data: ports } = useQuery({
    queryKey: ['ports-by-area', area],
    queryFn: () => portService.getPortsByArea(area),
  })

  const overrideByPort = useMemo(() => {
    const m = new Map<number, EpdaParameterSet>()
    overrides.forEach((o) => {
      if (o.portId != null) m.set(o.portId, o)
    })
    return m
  }, [overrides])

  // A port's effective baseline = area set overlaid with its group's override (if any).
  // The port override stores only the diff from THIS baseline (matching port > group > area).
  const baselineForPort = (portId: number): EpdaParameterValues => {
    const group = groups.find((g) => (g.memberPortIds ?? []).includes(portId))
    return mergeParameterValues(areaValues, group?.values)
  }

  // Show the same label Create EPDA uses (portOfCall), falling back to name.
  const portName = (id: number) => {
    const p = ports?.find((x) => x.id === id)
    return p?.portOfCall?.trim() || p?.name || `Port #${id}`
  }

  const beginEdit = (portId: number) => {
    const ov = overrideByPort.get(portId)
    setDraft(mergeParameterValues(baselineForPort(portId), ov?.values))
    setEditingPortId(portId)
  }

  const save = useMutation({
    mutationFn: async () => {
      const portId = editingPortId!
      const existing = overrideByPort.get(portId)
      const baseline = baselineForPort(portId)
      const values = diffParameterValues(baseline, draft)
      /* eslint-disable no-console -- local EPDA payload diagnostics */
      if (process.env.NODE_ENV === 'development') {
        console.groupCollapsed(`[EPDA] Save PORT override #${portId}`)
        console.log('baseline', baseline)
        console.log('draft shown by form', draft)
        console.log('existing override', existing?.values ?? null)
        console.log('diff before sanitize', values)
        console.groupEnd()
      }
      /* eslint-enable no-console */
      const plan = planPortOverrideWrite(values, existing)
      if (plan.action === 'none') {
        return 'unchanged' as const
      }
      if (plan.action === 'delete') {
        await epdaParametersService.deletePort(portId, plan.expectedVersion)
        return 'deleted' as const
      }
      await epdaParametersService.upsertPort(
        portId,
        plan.values,
        plan.expectedVersion
      )
      return 'saved' as const
    },
    onSuccess: (result) => {
      toast.success(
        result === 'deleted'
          ? 'Port now inherits its area/group parameters'
          : result === 'unchanged'
            ? 'Port already inherits its area/group parameters'
            : 'Port-specific dues saved'
      )
      qc.invalidateQueries({ queryKey: ['epda-parameters'] })
      qc.invalidateQueries({ queryKey: ['epda-param-logs'] })
      setEditingPortId(null)
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Failed to save'),
  })

  const remove = useMutation({
    mutationFn: (portId: number) => {
      const existing = overrideByPort.get(portId)
      if (!existing) return Promise.resolve()
      return epdaParametersService.deletePort(portId, existing.version)
    },
    onSuccess: () => {
      toast.success('Removed port-specific dues (port now inherits area)')
      qc.invalidateQueries({ queryKey: ['epda-parameters'] })
      qc.invalidateQueries({ queryKey: ['epda-param-logs'] })
      setEditingPortId(null)
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Failed to remove'),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t('param.portOverrides', { area: getAreaLabel(area) })}
        </CardTitle>
        <CardDescription>{t('param.portOverridesDesc')}</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid gap-1.5'>
          <Label className='text-xs text-muted-foreground'>
            {t('param.addEditPort')}
          </Label>
          <Select
            value={editingPortId ? String(editingPortId) : ''}
            onValueChange={(v) => beginEdit(Number(v))}
          >
            <SelectTrigger className='w-full sm:max-w-xs'>
              <SelectValue placeholder={t('param.selectPort')} />
            </SelectTrigger>
            <SelectContent>
              {(ports ?? []).map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.portOfCall?.trim() || p.name}
                  {overrideByPort.has(p.id)
                    ? `  ${t('param.overrideTag')}`
                    : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {overrides.length === 0 ? (
          <p className='rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground'>
            {t('param.noOverrides')}
          </p>
        ) : (
          <ul className='grid gap-3'>
            {overrides.map((o) => {
              const isActive = editingPortId === o.portId
              return (
                <li
                  key={o.id}
                  className={`rounded-xl border bg-card p-4 transition-colors ${
                    isActive
                      ? 'border-primary/50 ring-1 ring-primary/20'
                      : 'hover:border-primary/30'
                  }`}
                >
                  <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                    <div className='min-w-0 space-y-2'>
                      <span className='block truncate text-base font-semibold'>
                        {portName(o.portId!)}
                      </span>
                      <OverriddenBadges
                        labels={getOverrideSectionLabels(t, o.values)}
                      />
                    </div>
                    <div className='flex shrink-0 items-center gap-1.5'>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => beginEdit(o.portId!)}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        aria-label={t('param.resetToArea')}
                        onClick={() => remove.mutate(o.portId!)}
                      >
                        <Trash2 className='h-4 w-4 text-destructive' />
                      </Button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {editingPortId && (
          <Card ref={editPanelRef} className='scroll-mt-24 border-primary/40'>
            <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <CardTitle className='text-base'>
                {t('param.overrideTitle', { port: portName(editingPortId) })}
              </CardTitle>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setEditingPortId(null)}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  size='sm'
                  onClick={() => save.mutate()}
                  disabled={save.isPending}
                >
                  {save.isPending ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <Save className='h-4 w-4' />
                  )}
                  {t('param.saveOverride')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ValuesEditor
                variant={variant}
                values={draft}
                onChange={setDraft}
                visibleSectionIds={PORT_OVERRIDE_VISIBLE_SECTION_IDS}
              />
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  )
}
