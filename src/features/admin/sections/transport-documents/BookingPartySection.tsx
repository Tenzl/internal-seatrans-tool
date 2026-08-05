import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import type { PartnerOption } from '../partner-management/partnerManagementService'
import { PartySearchSelect } from './PartySearchSelect'
import { formatPartyDocumentValue } from './partyPickerModel'
import type { BillToMode } from './transportDocument.types'

interface BookingPartySectionProps {
  values: Record<string, unknown>
  onFieldChange: (key: string, value: unknown) => void
}

const idValue = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value > 0
    ? value
    : null

const textValue = (value: unknown): string =>
  typeof value === 'string' ? value : ''

const firstLine = (value: string) => value.split(/\r?\n/, 1)[0]?.trim() ?? ''

export function BookingPartySection({
  values,
  onFieldChange,
}: BookingPartySectionProps) {
  const shipper = textValue(values.shipper)
  const agent = textValue(values.agent)
  const consignee = textValue(values.consignee)
  const notifyParty = textValue(values.notifyParty)
  const shipperPartyId = idValue(values.shipperPartyId)
  const agentPartyId = idValue(values.agentPartyId)
  const consigneePartyId = idValue(values.consigneePartyId)
  const notifyPartyId = idValue(values.notifyPartyId)
  const notifySame = values.notifyPartySameAsConsignee === true
  const rawBillToMode = values.billToMode
  const billToMode: BillToMode =
    rawBillToMode === 'SAME_AS_SHIPPER' ||
    rawBillToMode === 'SAME_AS_NOTIFY_PARTY' ||
    rawBillToMode === 'SAME_AS_CONSIGNEE'
      ? rawBillToMode
      : 'NONE'
  const billTo = textValue(values.to)

  const setParty = (
    textKey: 'shipper' | 'agent' | 'consignee' | 'notifyParty',
    idKey:
      'shipperPartyId' | 'agentPartyId' | 'consigneePartyId' | 'notifyPartyId',
    option: PartnerOption | null
  ) => {
    const nextText = option ? formatPartyDocumentValue(option) : ''
    const nextId = option?.id ?? null
    onFieldChange(textKey, nextText)
    onFieldChange(idKey, nextId)

    const matchingMode: Partial<Record<typeof textKey, BillToMode>> = {
      shipper: 'SAME_AS_SHIPPER',
      consignee: 'SAME_AS_CONSIGNEE',
      notifyParty: 'SAME_AS_NOTIFY_PARTY',
    }
    if (matchingMode[textKey] === billToMode) {
      onFieldChange('billToMode', nextId == null ? 'NONE' : billToMode)
      onFieldChange('to', nextId == null ? '' : nextText)
    }

    if (textKey === 'consignee' && notifySame) {
      onFieldChange('notifyParty', nextText)
      onFieldChange('notifyPartyId', nextId)
      if (billToMode === 'SAME_AS_NOTIFY_PARTY') {
        onFieldChange('billToMode', nextId == null ? 'NONE' : billToMode)
        onFieldChange('to', nextId == null ? '' : nextText)
      }
    }
  }

  const setNotifySame = (checked: boolean) => {
    onFieldChange('notifyPartySameAsConsignee', checked)
    onFieldChange('notifyParty', checked ? consignee : '')
    onFieldChange('notifyPartyId', checked ? consigneePartyId : null)
    if (billToMode === 'SAME_AS_NOTIFY_PARTY') {
      onFieldChange(
        'billToMode',
        checked && consigneePartyId ? billToMode : 'NONE'
      )
      onFieldChange('to', checked && consigneePartyId ? consignee : '')
    }
  }

  const billToSource = (mode: BillToMode): string => {
    switch (mode) {
      case 'SAME_AS_SHIPPER':
        return shipper
      case 'SAME_AS_NOTIFY_PARTY':
        return notifyParty
      case 'SAME_AS_CONSIGNEE':
        return consignee
      case 'NONE':
        return ''
    }
  }

  const setBillToMode = (mode: BillToMode) => {
    onFieldChange('billToMode', mode)
    onFieldChange('to', billToSource(mode))
  }

  return (
    <div className='grid gap-x-4 gap-y-5 lg:grid-cols-2'>
      <div className='space-y-5'>
        <PartyField label='Shipper'>
          <PartySearchSelect
            id='transport-document-shipper'
            value={shipperPartyId}
            documentValue={shipper}
            additionType='SHIPPER'
            onChange={(option) => setParty('shipper', 'shipperPartyId', option)}
            placeholder='Search Shipper name...'
          />
        </PartyField>

        <PartyField label='Consignee'>
          <PartySearchSelect
            id='transport-document-consignee'
            value={consigneePartyId}
            documentValue={consignee}
            additionType='CONSIGNEE'
            onChange={(option) =>
              setParty('consignee', 'consigneePartyId', option)
            }
            placeholder='Search Consignee name...'
          />
        </PartyField>

        <div className='flex justify-end'>
          <label className='flex items-center gap-2 text-sm text-muted-foreground'>
            <Checkbox
              checked={notifySame}
              disabled={consigneePartyId == null}
              onCheckedChange={(checked) => setNotifySame(checked === true)}
            />
            Same as Consignee
          </label>
        </div>

        <PartyField label='Notify Party'>
          <PartySearchSelect
            id='transport-document-notify-party'
            value={notifyPartyId}
            documentValue={notifyParty}
            additionType='NOTIFY_PARTY'
            disabled={notifySame}
            onChange={(option) =>
              setParty('notifyParty', 'notifyPartyId', option)
            }
            placeholder='Search Notify Party name...'
          />
        </PartyField>
      </div>

      <div className='space-y-5'>
        <PartyField label='Agent'>
          <PartySearchSelect
            id='transport-document-agent'
            value={agentPartyId}
            documentValue={agent}
            customerType='AGENT'
            onChange={(option) => setParty('agent', 'agentPartyId', option)}
            placeholder='Search Agent name...'
          />
        </PartyField>

        <div className='space-y-3'>
          <Label className='text-xs font-medium text-muted-foreground'>
            Bill To
          </Label>
          <RadioGroup
            value={billToMode}
            onValueChange={(value) => setBillToMode(value as BillToMode)}
            className='grid gap-2 sm:grid-cols-2'
          >
            <BillToChoice value='NONE' label='None' />
            <BillToChoice
              value='SAME_AS_SHIPPER'
              label='Same as Shipper'
              disabled={shipperPartyId == null}
            />
            <BillToChoice
              value='SAME_AS_NOTIFY_PARTY'
              label='Same as Notify Party'
              disabled={notifyPartyId == null}
            />
            <BillToChoice
              value='SAME_AS_CONSIGNEE'
              label='Same as Consignee'
              disabled={consigneePartyId == null}
            />
          </RadioGroup>
          {billTo ? (
            <div className='space-y-2'>
              <Input
                value={firstLine(billTo)}
                readOnly
                className='bg-muted/30'
              />
              <Textarea
                value={billTo}
                readOnly
                rows={3}
                aria-label='Bill To details'
                className='min-h-20 resize-none bg-muted/30 text-sm'
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function PartyField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className='space-y-1.5'>
      <Label className='text-xs font-medium text-muted-foreground'>
        {label}
      </Label>
      {children}
    </div>
  )
}

function BillToChoice({
  value,
  label,
  disabled = false,
}: {
  value: BillToMode
  label: string
  disabled?: boolean
}) {
  const id = `bill-to-${value.toLowerCase()}`
  return (
    <div className='flex items-center gap-2'>
      <RadioGroupItem id={id} value={value} disabled={disabled} />
      <Label htmlFor={id} className='text-sm font-normal'>
        {label}
      </Label>
    </div>
  )
}
