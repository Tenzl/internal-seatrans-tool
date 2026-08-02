'use client'

import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { isAdminRole } from '@/config/section-catalog'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useIsMobile } from '@/hooks/use-mobile'
import { queryKeys } from '@/shared/config/react-query.config'
import { toast } from '@/shared/utils/toast'
import { AlertCircle, History, Loader2, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { TransportDocumentHistoryActions } from './TransportDocumentHistoryActions'
import { TransportDocumentHistoryDataTable } from './TransportDocumentHistoryDataTable'
import { TransportDocumentMutationDialogs } from './TransportDocumentMutationDialogs'
import type {
  TransportDocumentActionPermissions,
  TransportDocumentRecord,
} from './transportDocument.types'
import { buildTransportDocumentHistoryColumns } from './transportDocumentHistoryColumns'
import { transportDocumentService } from './transportDocumentService'
import { useTransportDocumentHistoryActions } from './useTransportDocumentHistoryActions'

/**
 * History list chrome mirrors InquiryHistoryCard + InquiryDataTable:
 * Card header/reload, TanStack table borders/sticky header/columns toggle,
 * desktop buttons + mobile dropdown actions, EPDA-style status badges.
 */
export function TransportDocumentHistoryScreen() {
  const [page, setPage] = useState(0)
  const pageSize = 10
  const currentUser = useCurrentUser()
  const isMobile = useIsMobile()
  const isAdmin = isAdminRole(currentUser?.role)
  const permissions = useMemo<TransportDocumentActionPermissions>(
    () => ({
      canLock: true,
      canUnlock: isAdmin,
      canArchive: !isAdmin,
      canHardDelete: isAdmin,
    }),
    [isAdmin]
  )

  const historyQuery = useQuery({
    queryKey: queryKeys.transportDocumentHistory(page, pageSize),
    queryFn: () =>
      transportDocumentService.history({
        page,
        size: pageSize,
      }),
    placeholderData: keepPreviousData,
  })

  const records: TransportDocumentRecord[] = historyQuery.data?.content ?? []
  const totalPages = historyQuery.data?.totalPages ?? 0
  const actions = useTransportDocumentHistoryActions({
    onMutated: () => historyQuery.refetch(),
  })

  useEffect(() => {
    if (historyQuery.error) {
      toast.error(
        historyQuery.error instanceof Error
          ? historyQuery.error.message
          : 'Failed to load document history'
      )
    }
  }, [historyQuery.error])

  const columns = useMemo(
    () =>
      buildTransportDocumentHistoryColumns({
        renderActions: (record) => (
          <TransportDocumentHistoryActions
            record={record}
            permissions={permissions}
            onViewDetails={actions.openDetail}
            onLock={actions.openLock}
            onUnlock={actions.openUnlock}
            onDelete={actions.openDelete}
          />
        ),
      }),
    [actions.openDelete, actions.openDetail, actions.openLock, actions.openUnlock, permissions]
  )

  const busy = historyQuery.isLoading || historyQuery.isFetching
  const errorMessage =
    historyQuery.error instanceof Error
      ? historyQuery.error.message
      : historyQuery.error
        ? 'Failed to load document history'
        : null

  return (
    <div className='mx-auto max-w-7xl space-y-5 pb-8'>
      <Card>
        <CardHeader className='border-b border-border/50 pb-4'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='min-w-0 flex-1 space-y-1.5'>
              <CardTitle className='flex items-center gap-2 text-lg font-semibold tracking-tight'>
                <History className='h-5 w-5' />
                Transport document history
              </CardTitle>
              <CardDescription className='max-w-2xl text-sm leading-relaxed'>
                Arrival Notice, Booking Confirmation, Delivery Order, and Bill
                of Lading records. Save drafts as Processing, complete with
                Create &amp; Preview, then lock or archive as needed. Admins can
                unlock locked records to edit again.
              </CardDescription>
            </div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => void historyQuery.refetch()}
              disabled={busy}
              className='h-10 shrink-0 gap-2 active:scale-[0.98] sm:h-9'
            >
              {busy ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <RefreshCw className='h-4 w-4' />
              )}
              Reload
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading && records.length === 0 ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-6 w-6 animate-spin' />
            </div>
          ) : errorMessage && records.length === 0 ? (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : records.length === 0 ? (
            <div className='py-8 text-center text-muted-foreground'>
              No transport document records yet.
            </div>
          ) : (
            <TransportDocumentHistoryDataTable
              columns={columns}
              data={records}
              page={page}
              totalPages={totalPages}
              isBusy={busy}
              onPageChange={setPage}
              initialColumnVisibility={
                isMobile ? { createdAt: false, createdBy: false } : undefined
              }
            />
          )}
        </CardContent>
      </Card>

      <TransportDocumentMutationDialogs actions={actions} />
    </div>
  )
}
