import { AdminPageShell } from '@/components/layout/admin-page-shell'
import { BookingShippingScreen } from '@/features/admin/sections/booking-shipping/BookingShippingScreen'

/** Data Management: shipment records. */
export default function Page() {
  return (
    <AdminPageShell>
      <BookingShippingScreen />
    </AdminPageShell>
  )
}
