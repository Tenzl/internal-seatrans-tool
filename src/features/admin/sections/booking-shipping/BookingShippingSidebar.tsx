import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PartnerOption } from '@/features/admin/sections/partner-management/partnerManagementService'
import { AsyncSearchSelect, type SearchSelectOption } from './AsyncSearchSelect'
import {
  type BookingContact,
  composeBookingContact,
  contactOptionLabel,
} from './bookingShippingForm'

type BookingShippingSidebarProps = {
  partnerId: number | null
  selectedPartner: PartnerOption | null
  partnerOptions: SearchSelectOption[]
  partnerSearch: string
  partnerOptionsLoading: boolean
  showForm: boolean
  contacts: BookingContact[]
  contactsLoading: boolean
  contactIndex: string
  onPartnerSearchChange: (search: string) => void
  onPartnerChange: (id: number | null) => void
  onContactIndexChange: (index: string) => void
  onContactChange: (contact: string | null) => void
}

export function BookingShippingSidebar({
  partnerId,
  selectedPartner,
  partnerOptions,
  partnerSearch,
  partnerOptionsLoading,
  showForm,
  contacts,
  contactsLoading,
  contactIndex,
  onPartnerSearchChange,
  onPartnerChange,
  onContactIndexChange,
  onContactChange,
}: BookingShippingSidebarProps) {
  return (
    <aside className='space-y-4 lg:border-r lg:border-border/60 lg:pr-5'>
      <div>
        <p className='mb-2 text-[0.65rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase'>
          Partner
        </p>
        <AsyncSearchSelect
          label='Select partner'
          value={partnerId}
          selectedLabel={selectedPartner?.name ?? null}
          options={partnerOptions}
          search={partnerSearch}
          onSearchChange={onPartnerSearchChange}
          isLoading={partnerOptionsLoading}
          placeholder='Name or customer ID…'
          emptyMessage='No partner found.'
          allowClear
          onChange={onPartnerChange}
        />
        {selectedPartner ? (
          <p className='mt-2 font-mono text-xs text-muted-foreground'>
            {selectedPartner.customerId}
          </p>
        ) : null}
      </div>

      {showForm ? (
        <div>
          <p className='mb-2 text-[0.65rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase'>
            Contact person
          </p>
          <Select
            value={contactIndex || undefined}
            disabled={contactsLoading || contacts.length === 0}
            onValueChange={(value) => {
              if (value === 'NONE') {
                onContactIndexChange('')
                onContactChange(null)
                return
              }

              onContactIndexChange(value)
              const contact = contacts[Number(value)]
              if (contact) onContactChange(composeBookingContact(contact))
            }}
          >
            <SelectTrigger className='h-9 w-full bg-background'>
              <SelectValue
                placeholder={contacts.length ? 'Available' : 'None'}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='NONE'>None</SelectItem>
              {contacts.map((contact, index) => (
                <SelectItem key={index} value={String(index)}>
                  {contactOptionLabel(contact)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <p className='text-sm text-muted-foreground'>
          Pick a partner to load shipment data.
        </p>
      )}
    </aside>
  )
}
