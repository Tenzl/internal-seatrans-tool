import { AdminPageShell } from '@/components/layout/admin-page-shell'
import { BookingHistoryScreen } from './BookingHistoryScreen'
import { BookingReportsScreen } from './BookingReportsScreen'
import { TransportDocumentsScreen } from './TransportDocumentsScreen'
import type { TransportDocumentType } from './transportDocument.types'

export function CreateTransportDocumentPage({
  documentType,
}: {
  documentType: TransportDocumentType
}) {
  return (
    <AdminPageShell>
      <TransportDocumentsScreen documentType={documentType} />
    </AdminPageShell>
  )
}

export function BookingHistoryPage() {
  return (
    <AdminPageShell>
      <BookingHistoryScreen />
    </AdminPageShell>
  )
}

export function BookingReportsPage() {
  return (
    <AdminPageShell>
      <BookingReportsScreen />
    </AdminPageShell>
  )
}
