'use client'

import { useI18n } from '@/shared/i18n/I18nProvider'
import { Loader2, Lock, Printer, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EpdaFieldChangeHistory } from './EpdaFieldChangeHistory'

interface EpdaEditorActionsProps {
  inquiryId: number | null | undefined
  canViewEditHistory: boolean
  historyRefreshKey: number
  isBusy: boolean
  isSavingDraft: boolean
  isLoadingPreview: boolean
  isLocked: boolean
  showSaveDraft: boolean
  onReset: () => void
  onSaveDraft: () => void
  onPreview: () => void
}

/** Actions shared by create and editable EPDA worksheets. */
export function EpdaEditorActions({
  inquiryId,
  canViewEditHistory,
  historyRefreshKey,
  isBusy,
  isSavingDraft,
  isLoadingPreview,
  isLocked,
  showSaveDraft,
  onReset,
  onSaveDraft,
  onPreview,
}: EpdaEditorActionsProps) {
  const { t } = useI18n()

  return (
    <div className='grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap md:items-center md:justify-end'>
      {canViewEditHistory && inquiryId ? (
        <EpdaFieldChangeHistory
          inquiryId={inquiryId}
          refreshKey={historyRefreshKey}
        />
      ) : null}
      <Button
        variant='outline'
        onClick={onReset}
        disabled={isBusy}
        className='h-11 active:scale-[0.98] sm:h-9'
      >
        <span className='hidden sm:inline'>{t('epda.reset')}</span>
        <span className='sm:hidden'>{t('epda.resetShort')}</span>
      </Button>
      <Button
        variant='outline'
        onClick={onPreview}
        disabled={isBusy}
        className='col-span-2 h-11 gap-2 border-transparent bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 hover:text-white focus-visible:ring-emerald-600/30 active:scale-[0.98] md:col-span-1 md:h-9 dark:bg-emerald-500 dark:hover:bg-emerald-400'
      >
        {isLoadingPreview ? (
          <>
            <Loader2 className='h-4 w-4 animate-spin' />
            <span className='hidden sm:inline'>{t('epda.generating')}</span>
            <span className='sm:hidden'>{t('epda.loading')}</span>
          </>
        ) : (
          <>
            <Printer className='h-4 w-4' />
            {t('epda.preview')}
          </>
        )}
      </Button>
      {showSaveDraft ? (
        <Button
          onClick={onSaveDraft}
          disabled={isBusy}
          className='h-11 gap-2 active:scale-[0.98] sm:h-9'
        >
          {isSavingDraft ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <Save className='h-4 w-4' />
          )}
          <span className='hidden sm:inline'>{t('epda.saveDraft')}</span>
          <span className='sm:hidden'>{t('epda.saveShort')}</span>
        </Button>
      ) : null}
      {isLocked ? (
        <span className='col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 text-sm font-medium text-amber-800 sm:col-span-1 sm:h-9 dark:text-amber-200'>
          <Lock className='h-4 w-4 shrink-0' />
          {t('epda.locked')}
        </span>
      ) : null}
    </div>
  )
}
