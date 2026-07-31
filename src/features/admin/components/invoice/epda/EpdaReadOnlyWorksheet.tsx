'use client'

import type { ReactNode } from 'react'
import { useI18n } from '@/shared/i18n/I18nProvider'
import { Eye, Loader2, Lock, Send } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EpdaFieldChangeHistory } from './EpdaFieldChangeHistory'

interface EpdaReadOnlyWorksheetProps {
  backNavigation: ReactNode
  inquiryId: number | null | undefined
  canViewEditHistory: boolean
  historyRefreshKey: number
  isLocked: boolean
  isBusy: boolean
  isIssuing: boolean
  isLoadingPreview: boolean
  isLoadingInquiry: boolean
  isLoadingCargoCatalog: boolean
  inquiryStatus?: string | null
  onIssue: () => void
  onPreview: () => void
}

/** Compact command surface shown when an EPDA cannot be edited. */
export function EpdaReadOnlyWorksheet({
  backNavigation,
  inquiryId,
  canViewEditHistory,
  historyRefreshKey,
  isLocked,
  isBusy,
  isIssuing,
  isLoadingPreview,
  isLoadingInquiry,
  isLoadingCargoCatalog,
  inquiryStatus,
  onIssue,
  onPreview,
}: EpdaReadOnlyWorksheetProps) {
  const { t } = useI18n()

  return (
    <div className='min-h-0 space-y-4'>
      {backNavigation}
      <div className='flex flex-wrap items-center justify-between gap-2'>
        {inquiryId ? (
          <Badge variant='outline' className='w-fit font-mono text-xs'>
            {t('epda.inquiryNo', { id: inquiryId })}
          </Badge>
        ) : (
          <span />
        )}
        <div className='flex flex-wrap items-center justify-end gap-2'>
          {isLocked ? (
            <span className='inline-flex h-11 items-center justify-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 text-sm font-medium text-amber-800 sm:h-9 dark:text-amber-200'>
              <Lock className='h-4 w-4 shrink-0' />
              {t('epda.locked')}
            </span>
          ) : null}
          {canViewEditHistory && inquiryId ? (
            <EpdaFieldChangeHistory
              inquiryId={inquiryId}
              refreshKey={historyRefreshKey}
            />
          ) : null}
          <Button
            variant='secondary'
            onClick={onIssue}
            disabled={isBusy || !inquiryId || inquiryStatus === 'QUOTED'}
            className='h-11 gap-2 active:scale-[0.98] sm:h-9'
          >
            {isIssuing ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Send className='h-4 w-4 shrink-0' />
            )}
            <span className='hidden sm:inline'>{t('epda.issue')}</span>
            <span className='sm:hidden'>{t('epda.issueShort')}</span>
          </Button>
          <Button
            onClick={onPreview}
            disabled={isBusy}
            className='h-11 gap-2 active:scale-[0.98] sm:h-9'
          >
            {isLoadingPreview ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Eye className='h-4 w-4' />
            )}
            {t('epda.preview')}
          </Button>
        </div>
      </div>
      {isLoadingInquiry || isLoadingCargoCatalog ? (
        <div className='flex min-h-[160px] items-center justify-center'>
          <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
        </div>
      ) : (
        <p className='text-sm text-muted-foreground'>
          {isLocked
            ? 'EPDA is locked — tariff snapshot is frozen. Edit is disabled.'
            : 'View-only EPDA. Open preview, or use Edit when unlocked.'}
        </p>
      )}
    </div>
  )
}
