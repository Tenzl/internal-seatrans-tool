'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/shared/i18n/I18nProvider'
import type { EpdaParameterDiffRow } from '@/features/admin/sections/epda-editor/controller/epdaParameterDiff'

type EpdaParameterDiffDialogProps = {
  open: boolean
  rows: EpdaParameterDiffRow[]
  onApply: () => void
  onSkip: () => void
}

export function EpdaParameterDiffDialog({
  open,
  rows,
  onApply,
  onSkip,
}: EpdaParameterDiffDialogProps) {
  const { t } = useI18n()

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className='max-h-[85vh] max-w-3xl overflow-hidden sm:max-w-3xl'
        showCloseButton={false}
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t('epda.paramDiffTitle')}</DialogTitle>
          <DialogDescription>{t('epda.paramDiffBody')}</DialogDescription>
        </DialogHeader>

        <div className='max-h-[50vh] overflow-auto rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('epda.paramDiffColParameter')}</TableHead>
                <TableHead>{t('epda.paramDiffColCurrent')}</TableHead>
                <TableHead>{t('epda.paramDiffColLatest')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.path}>
                  <TableCell className='align-top font-mono text-xs'>
                    {row.path}
                  </TableCell>
                  <TableCell className='align-top whitespace-pre-wrap break-all text-xs'>
                    {row.current}
                  </TableCell>
                  <TableCell className='align-top whitespace-pre-wrap break-all text-xs'>
                    {row.latest}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter className='gap-2 sm:gap-2'>
          <Button type='button' variant='outline' onClick={onSkip}>
            {t('epda.paramDiffSkip')}
          </Button>
          <Button type='button' onClick={onApply}>
            {t('epda.paramDiffApply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
