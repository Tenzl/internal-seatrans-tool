'use client'

import { useEffect, useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { isAdminRole } from '@/config/section-catalog'
import { queryKeys } from '@/shared/config/react-query.config'
import { toast } from '@/shared/utils/toast'
import { AlertCircle, History, Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useIsMobile } from '@/hooks/use-mobile'
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
import { buildBookingHistoryColumns } from './bookingHistoryColumns'
import type {
  TransportDocumentActionPermissions,
  TransportDocumentRecord,
} from './transportDocument.types'
import { transportDocumentService } from './transportDocumentService'
import { useTransportDocumentHistoryActions } from './useTransportDocumentHistoryActions'

/** Booking-root list; child documents are managed inside the workflow view. */
export function BookingHistoryScreen() {
  const [page, setPage] = useState(0)
  const pageSize = 10
  const currentUser = useCurrentUser()
  const isMobile = useIsMobile()
  const isAdmin = isAdminRole(currentUser?.role)
  const permissions = useMemo<TransportDocumentActionPermissions>(
    () => ({
      canLock: true,
      canUnlock: isAdmin,
      canHardDelete: true,
    }),
    [isAdmin]
  )

  const bookingQuery = useQuery({
    queryKey: [...queryKeys.bookingHistoryList(page, pageSize)],
    queryFn: () =>
      transportDocumentService.history({
        type: 'booking',
        page,
        size: pageSize,
      }),
    placeholderData: keepPreviousData,
  })

  const records: TransportDocumentRecord[] = bookingQuery.data?.content ?? []
  const totalPages = bookingQuery.data?.totalPages ?? 0
  const actions = useTransportDocumentHistoryActions({
    onMutated: () => bookingQuery.refetch(),
  })

  useEffect(() => {
    if (bookingQuery.error) {
      toast.error(
        bookingQuery.error instanceof Error
          ? bookingQuery.error.message
          : 'Failed to load bookings'
      )
    }
  }, [bookingQuery.error])

  const columns = useMemo(
    () =>
      buildBookingHistoryColumns({
        renderActions: (record) => (
          <TransportDocumentHistoryActions
            record={record}
            permissions={permissions}
            onViewDetails={actions.openDetail}
            onCopy={actions.copyBooking}
            onLock={actions.openLock}
            onUnlock={actions.openUnlock}
            onDelete={actions.openDelete}
          />
        ),
      }),
    [
      actions.openDelete,
      actions.copyBooking,
      actions.openDetail,
      actions.openLock,
      actions.openUnlock,
      permissions,
    ]
  )

  const busy = bookingQuery.isLoading || bookingQuery.isFetching
  const errorMessage =
    bookingQuery.error instanceof Error
      ? bookingQuery.error.message
      : bookingQuery.error
        ? 'Failed to load bookings'
        : null

  return (
    <div className='mx-auto max-w-7xl space-y-5 pb-8'>
      <Card>
        <CardHeader className='border-b border-border/50 pb-4'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='min-w-0 flex-1 space-y-1.5'>
              <CardTitle className='flex items-center gap-2 text-lg font-semibold tracking-tight'>
                <History className='h-5 w-5' />
                History
              </CardTitle>
              <CardDescription className='max-w-2xl text-sm leading-relaxed'>
                Booking workflow records for Import and Export. Open a booking
                to continue Bill of Lading (Export) or Arrival Notice and
                Delivery Order (Import).
              </CardDescription>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => void bookingQuery.refetch()}
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
          </div>
        </CardHeader>
        <CardContent>
          {bookingQuery.isLoading && records.length === 0 ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='h-6 w-6 animate-spin' />
            </div>
          ) : errorMessage && records.length === 0 ? (
            <Alert variant='destructive'>
              <AlertCircle className='h-4 w-4' />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : records.length === 0 ? (
            <div className='space-y-3 py-8 text-center'>
              <p className='text-muted-foreground'>
                No bookings yet. Create a booking to begin.
              </p>
              <Button asChild variant='outline' size='sm'>
                <Link href='/booking/documents/booking-confirmation'>
                  Create Booking
                </Link>
              </Button>
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
