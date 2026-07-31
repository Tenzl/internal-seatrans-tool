import { AdminPageShell } from '@/components/layout/admin-page-shell'
import { TransportDocumentHistoryScreen } from './TransportDocumentHistoryScreen'
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

export function TransportDocumentHistoryPage() {
  return (
    <AdminPageShell>
      <TransportDocumentHistoryScreen />
    </AdminPageShell>
  )
}
