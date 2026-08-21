'use client'

import { formatPortDisplay } from '@/modules/logistics/portDisplay'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { ChevronDown, ChevronUp, LockKeyhole } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AREA_OPTIONS, getAreaLabel } from '../epdaFormParameters'

export type EpdaArea = (typeof AREA_OPTIONS)[number]['value']

interface EpdaPortOption {
  id: number
  name?: string | null
  portOfCall?: string | null
  countryCode?: string | null
  code?: string | null
}

interface EpdaPortSelectorProps {
  area: EpdaArea | ''
  port: string
  ports: EpdaPortOption[]
  collapsed: boolean
  isLoading: boolean
  areaLocked: boolean
  onAreaChange: (area: EpdaArea) => void
  onPortChange: (port: string, portId: number | null) => void
  onCollapsedChange: (collapsed: boolean) => void
}

/** Area and port selection header used before editing an EPDA worksheet. */
export function EpdaPortSelector({
  area,
  port,
  ports,
  collapsed,
  isLoading,
  areaLocked,
  onAreaChange,
  onPortChange,
  onCollapsedChange,
}: EpdaPortSelectorProps) {
  const { t } = useI18n()
  const selectedPort = ports.find((item) => item.portOfCall === port)
  const selectedPortLabel = selectedPort
    ? formatPortDisplay({
        name: selectedPort.name?.trim() || port,
        countryCode: selectedPort.countryCode,
        code: selectedPort.code,
      })
    : port

  return (
    <>
      {area && port ? (
        <button
          type='button'
          onClick={() => onCollapsedChange(!collapsed)}
          className='flex w-full items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-left lg:hidden'
        >
          <span className='min-w-0 truncate text-sm'>
            <span className='text-muted-foreground'>{getAreaLabel(area)}</span>
            <span className='mx-1.5 text-muted-foreground'>·</span>
            <span className='font-medium'>{selectedPortLabel}</span>
          </span>
          <span className='flex shrink-0 items-center gap-1 text-xs font-medium text-primary'>
            {collapsed ? t('common.edit') : t('epda.collapse')}
            {collapsed ? (
              <ChevronDown className='h-4 w-4' />
            ) : (
              <ChevronUp className='h-4 w-4' />
            )}
          </span>
        </button>
      ) : null}

      <div
        className={cn(
          'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
          collapsed && area && port && 'hidden lg:grid'
        )}
      >
        <div className='grid gap-2'>
          <div className='flex items-center justify-between gap-2'>
            <Label htmlFor='portArea' className='font-bold'>
              {t('epda.portArea')}
            </Label>
            {areaLocked ? (
              <span className='inline-flex items-center gap-1 text-xs text-muted-foreground'>
                <LockKeyhole className='h-3.5 w-3.5' />
                {t('epda.areaLocked')}
              </span>
            ) : null}
          </div>
          <Select
            value={area}
            onValueChange={(value) => onAreaChange(value as EpdaArea)}
            disabled={areaLocked}
          >
            <SelectTrigger id='portArea'>
              <SelectValue placeholder={t('epda.selectArea')}>
                {area ? getAreaLabel(area) : null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {AREA_OPTIONS.map((areaOption) => (
                <SelectItem key={areaOption.value} value={areaOption.value}>
                  {areaOption.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='grid gap-2'>
          <Label htmlFor='portOfCallSelect' className='font-bold'>
            {t('epda.portOfCall')}
          </Label>
          <Select
            value={port}
            onValueChange={(value) => {
              onPortChange(
                value,
                ports.find((item) => item.portOfCall === value)?.id ?? null
              )
            }}
            disabled={!area || isLoading}
          >
            <SelectTrigger id='portOfCallSelect'>
              <SelectValue
                placeholder={
                  !area
                    ? t('epda.selectAreaFirst')
                    : isLoading
                      ? t('epda.loadingPorts')
                      : t('epda.selectPortOfCall')
                }
              >
                {selectedPortLabel || null}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ports.map((item) => (
                <SelectItem key={item.id} value={item.portOfCall as string}>
                  {formatPortDisplay({
                    name: item.name?.trim() || item.portOfCall || '',
                    countryCode: item.countryCode,
                    code: item.code,
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  )
}
