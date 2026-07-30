'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  defaultParameterValues,
  mergeParameterValues,
} from '@/modules/inquiries/components/common/quoteParameters'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate } from '@/lib/router'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  AREA_OPTIONS,
  AREA_TO_VARIANT,
  getAreaShortLabel,
  type AreaOption,
} from '@/features/admin/components/invoice/epdaFormParameters'
import {
  epdaParametersService,
  type EpdaParameterSet,
  type EpdaParameterValues,
} from '@/modules/inquiries/services/epdaParametersService'
import { cloneParameterValues } from './parameterOverrides'
import { ValuesEditor } from './EpdaValuesEditor'
import { AREA_SET_HIDDEN_SECTION_IDS } from './epdaParameterSections'
import { ParamHistoryButton } from './ParamHistoryButton'
import { PortOverridesCard } from './PortOverridesCard'

const VISIBLE_AREA_OPTIONS = AREA_OPTIONS

const getAreaLabel = (area: AreaOption) => getAreaShortLabel(area)

export function EpdaParametersScreen() {
  const qc = useQueryClient()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [area, setArea] = useState<AreaOption>(VISIBLE_AREA_OPTIONS[0].value)
  // Href the user clicked while there were unsaved edits — drives the leave popup.
  const [leaveHref, setLeaveHref] = useState<string | null>(null)
  // Area tab the user tried to switch to while there were unsaved edits.
  const [pendingArea, setPendingArea] = useState<AreaOption | null>(null)

  const { data: sets, isLoading } = useQuery({
    queryKey: ['epda-parameters'],
    queryFn: () => epdaParametersService.listAll(),
  })

  const variant = AREA_TO_VARIANT[area]
  const areaSet = useMemo<EpdaParameterSet | undefined>(
    () => sets?.find((s) => s.scope === 'AREA' && s.area === area),
    [sets, area]
  )
  const areaValues = useMemo(
    () =>
      mergeParameterValues(defaultParameterValues(variant), areaSet?.values),
    [areaSet, variant]
  )

  const areaValuesKey = useMemo(() => JSON.stringify(areaValues), [areaValues])
  const [draftState, setDraftState] = useState({
    sourceKey: areaValuesKey,
    value: cloneParameterValues(areaValues),
  })
  const draft =
    draftState.sourceKey === areaValuesKey
      ? draftState.value
      : cloneParameterValues(areaValues)
  const setDraft = (value: EpdaParameterValues) =>
    setDraftState({ sourceKey: areaValuesKey, value })

  const saveArea = useMutation({
    mutationFn: () =>
      epdaParametersService.upsertArea(area, draft, areaSet?.version ?? null),
    onSuccess: () => {
      toast.success(`Saved parameters for ${area}`)
      qc.invalidateQueries({ queryKey: ['epda-parameters'] })
      qc.invalidateQueries({ queryKey: ['epda-param-logs'] })
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Failed to save'),
  })

  // Dirty when the editable draft differs from the saved server values.
  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(areaValues),
    [draft, areaValues]
  )

  // Warn before leaving with unsaved area edits — covers refresh/close (beforeunload)
  // and in-app link clicks (e.g. switching to another route via the sidebar).
  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || anchor.target === '_blank') return
      // Intercept the in-app navigation and show a styled confirm popup instead
      // of the native window.confirm.
      e.preventDefault()
      e.stopPropagation()
      setLeaveHref(href)
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [isDirty])

  // Switching area tabs is not an <a> click, so guard unsaved edits explicitly here.
  const handleAreaChange = (next: AreaOption) => {
    if (next === area) return
    if (isDirty) {
      setPendingArea(next)
      return
    }
    setArea(next)
  }

  // Discard unsaved edits — switch to the pending area, or go to the captured href.
  const confirmLeave = () => {
    if (pendingArea) {
      setArea(pendingArea)
      setPendingArea(null)
      return
    }
    const href = leaveHref
    setLeaveHref(null)
    if (href) navigate({ to: href })
  }

  // Save the area first, then switch area / continue to the captured destination.
  const saveThenLeave = () => {
    const href = leaveHref
    const nextArea = pendingArea
    saveArea.mutate(undefined, {
      onSuccess: () => {
        if (nextArea) {
          setArea(nextArea)
          setPendingArea(null)
          return
        }
        setLeaveHref(null)
        if (href) navigate({ to: href })
      },
    })
  }

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div className='space-y-1.5'>
            <h2 className='text-2xl font-bold tracking-tight sm:text-3xl'>
              {t('param.title')}
            </h2>
            <p className='max-w-2xl text-base text-muted-foreground'>
              {t('param.subtitle')}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className='flex min-h-[200px] items-center justify-center'>
            <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <div className='mt-4 space-y-6'>
            {/* Area selector — pinned under the header on mobile (compact) so you
                can switch area without scrolling back up; static on desktop. */}
            <Tabs
              value={area}
              onValueChange={(v) => handleAreaChange(v as AreaOption)}
              className='sticky top-[var(--header-height,4rem)] z-30 -mx-4 border-b bg-background/95 px-4 py-2 supports-[backdrop-filter]:bg-background/80 max-md:backdrop-blur-none md:backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none'
            >
              <TabsList className='h-auto w-full lg:w-auto'>
                {VISIBLE_AREA_OPTIONS.map((a) => (
                  <TabsTrigger
                    key={a.value}
                    value={a.value}
                    className='flex-1 px-3 py-1.5 text-sm font-medium lg:flex-none lg:px-5 lg:py-2 lg:text-base'
                  >
                    {a.shortLabel}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <Card>
              <CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div>
                  <CardTitle className='text-xl'>
                    {t('param.areaSet', { area: getAreaLabel(area) })}
                  </CardTitle>
                  <CardDescription className='text-base'>
                    {t('param.areaDesc')}
                  </CardDescription>
                </div>
                <div className='flex flex-col gap-2 sm:w-auto sm:flex-row sm:items-center [&>*]:w-full sm:[&>*]:w-auto'>
                  <ParamHistoryButton area={area} />
                  <Button
                    onClick={() => saveArea.mutate()}
                    disabled={!isDirty || saveArea.isPending}
                  >
                    {saveArea.isPending ? (
                      <Loader2 className='h-4 w-4 animate-spin' />
                    ) : (
                      <Save className='h-4 w-4' />
                    )}
                    {t('param.saveArea')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ValuesEditor
                  variant={variant}
                  values={draft}
                  onChange={setDraft}
                  hiddenSectionIds={AREA_SET_HIDDEN_SECTION_IDS}
                />
              </CardContent>
            </Card>

            <div>
              <PortOverridesCard
                key={`${area}:${areaValuesKey}`}
                area={area}
                variant={variant}
                areaValues={areaValues}
                overrides={(sets ?? []).filter(
                  (s) => s.scope === 'PORT' && s.area === area
                )}
                groups={[]}
              />
            </div>
          </div>
        )}
      </Main>

      <AlertDialog
        open={leaveHref !== null || pendingArea !== null}
        onOpenChange={(open) => {
          if (!open) {
            setLeaveHref(null)
            setPendingArea(null)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('param.unsavedTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('param.unsavedBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='gap-2 sm:gap-2'>
            <AlertDialogCancel>{t('param.stay')}</AlertDialogCancel>
            <Button
              variant='destructive'
              onClick={confirmLeave}
              disabled={saveArea.isPending}
            >
              {t('param.leave')}
            </Button>
            <AlertDialogAction
              onClick={saveThenLeave}
              disabled={saveArea.isPending}
            >
              {saveArea.isPending ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Save className='h-4 w-4' />
              )}
              {t('param.saveAndLeave')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

