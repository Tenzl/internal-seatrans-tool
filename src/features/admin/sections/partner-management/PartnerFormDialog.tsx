import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { Plus, Trash2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  APPROVE_STATUS_OPTIONS,
  createEmptyPartnerContact,
  CUSTOMER_STATUS_OPTIONS,
  CUSTOMER_TYPE_OPTIONS,
  formatAdditionTypeLabel,
  PARTNER_ADDITION_TYPE_OPTIONS,
  type PartnerFormState,
} from './partnerFormModel'
import { PartnerFieldChangeHistory } from './PartnerFieldChangeHistory'
import type {
  ApproveStatus,
  CustomerStatus,
  CustomerType,
  PartnerAdditionType,
  PartnerContact,
} from './partnerManagementTypes'

type PartnerFormDialogProps = {
  open: boolean
  editingId: number | null
  form: PartnerFormState
  saving: boolean
  locking?: boolean
  isLocked?: boolean
  canViewEditHistory?: boolean
  historyRefreshKey?: number
  onOpenChange: (open: boolean) => void
  onFormChange: Dispatch<SetStateAction<PartnerFormState>>
  onSave: () => void
  onLock?: () => void
}

type TextFieldProps = {
  form: PartnerFormState
  field: keyof PartnerFormState
  label: string
  type?: string
  wide?: boolean
  disabled?: boolean
  min?: number
  placeholder?: string
  onFormChange: Dispatch<SetStateAction<PartnerFormState>>
}

function FormSection({
  step,
  title,
  description,
  action,
  children,
}: {
  step: number
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className='space-y-3'>
      <div className='flex items-center gap-3'>
        <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-semibold text-primary tabular-nums'>
          {step}
        </span>
        <div className='min-w-0 flex-1'>
          <h3 className='text-sm leading-none font-semibold'>{title}</h3>
          {description ? (
            <p className='mt-1 text-xs text-muted-foreground'>{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className='rounded-lg border bg-muted/20 p-4'>{children}</div>
    </section>
  )
}

function FieldGrid({ children }: { children: ReactNode }) {
  return (
    <div className='grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
      {children}
    </div>
  )
}

function Field({
  label,
  wide,
  children,
}: {
  label: string
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={`space-y-1.5 ${wide ? 'sm:col-span-2 lg:col-span-3 xl:col-span-4' : ''}`}
    >
      <Label className='text-xs font-medium text-muted-foreground'>
        {label}
      </Label>
      {children}
    </div>
  )
}

function TextField({
  form,
  field,
  label,
  type,
  wide,
  disabled,
  min,
  placeholder,
  onFormChange,
}: TextFieldProps) {
  return (
    <Field label={label} wide={wide}>
      <Input
        type={type}
        min={min}
        value={String(form[field] ?? '')}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) =>
          onFormChange((current) => ({
            ...current,
            [field]: event.target.value,
          }))
        }
      />
    </Field>
  )
}

export function PartnerFormDialog({
  open,
  editingId,
  form,
  saving,
  locking = false,
  isLocked = false,
  canViewEditHistory = false,
  historyRefreshKey = 0,
  onOpenChange,
  onFormChange,
  onSave,
  onLock,
}: PartnerFormDialogProps) {
  const updateSelect = (
    field: 'customerStatus' | 'customerType' | 'approveStatus',
    value: string
  ) => {
    onFormChange((current) => ({
      ...current,
      [field]: value === 'NONE' ? '' : value,
    }))
  }

  const toggleAdditionType = (type: PartnerAdditionType, checked: boolean) => {
    onFormChange((current) => ({
      ...current,
      additionTypes: checked
        ? [...current.additionTypes, type]
        : current.additionTypes.filter((item) => item !== type),
    }))
  }

  const addContact = () => {
    onFormChange((current) => ({
      ...current,
      contacts: [...current.contacts, createEmptyPartnerContact()],
    }))
  }

  const removeContact = (index: number) => {
    onFormChange((current) => ({
      ...current,
      contacts: current.contacts.filter(
        (_, contactIndex) => contactIndex !== index
      ),
    }))
  }

  const updateContact = (
    index: number,
    field: keyof PartnerContact,
    value: string
  ) => {
    onFormChange((current) => ({
      ...current,
      contacts: current.contacts.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [field]: value } : contact
      ),
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-6xl sm:max-w-[min(96vw,84rem)]'>
        <DialogHeader>
          <div className='flex flex-wrap items-center gap-2'>
            <DialogTitle>
              {editingId ? 'Edit partner' : 'Create partner'}
            </DialogTitle>
            {isLocked ? (
              <span className='inline-flex h-7 items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 text-xs font-medium text-amber-800 dark:text-amber-200'>
                <Lock className='h-3.5 w-3.5 shrink-0' />
                Locked
              </span>
            ) : null}
          </div>
          <DialogDescription>
            {isLocked
              ? 'This partner is locked. Edits are disabled and unlock is not supported.'
              : 'Leave Customer ID blank to auto-generate; it cannot be changed after creation.'}
          </DialogDescription>
        </DialogHeader>

        <fieldset
          disabled={isLocked || saving || locking}
          className='max-h-[72vh] space-y-6 overflow-y-auto px-1 pb-2 disabled:opacity-90'
        >
          <FormSection
            step={1}
            title='Identity'
            description='Name and what roles this partner plays.'
          >
            <FieldGrid>
              <TextField
                form={form}
                field='name'
                label='Name *'
                onFormChange={onFormChange}
              />
              <TextField
                form={form}
                field='customerId'
                label='Customer ID'
                disabled={editingId != null}
                placeholder={
                  editingId != null ? undefined : 'Auto-generated if blank'
                }
                onFormChange={onFormChange}
              />
              <Field label='Additional types' wide>
                <div className='flex flex-wrap gap-x-4 gap-y-2'>
                  {PARTNER_ADDITION_TYPE_OPTIONS.map((type) => (
                    <label
                      key={type}
                      className='inline-flex items-center gap-2 text-sm'
                    >
                      <Checkbox
                        checked={form.additionTypes.includes(type)}
                        onCheckedChange={(state) =>
                          toggleAdditionType(type, state === true)
                        }
                      />
                      {formatAdditionTypeLabel(type)}
                    </label>
                  ))}
                </div>
              </Field>
            </FieldGrid>
          </FormSection>

          <FormSection step={2} title='Classification & approval'>
            <FieldGrid>
              <Field label='Customer status'>
                <Select
                  value={form.customerStatus || 'NONE'}
                  onValueChange={(value) =>
                    updateSelect(
                      'customerStatus',
                      value as CustomerStatus | 'NONE'
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='NONE'>None</SelectItem>
                    {CUSTOMER_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label='Customer type'>
                <Select
                  value={form.customerType || 'NONE'}
                  onValueChange={(value) =>
                    updateSelect('customerType', value as CustomerType | 'NONE')
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select type' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='NONE'>None</SelectItem>
                    {CUSTOMER_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label='Approve status'>
                <Select
                  value={form.approveStatus || 'NONE'}
                  onValueChange={(value) =>
                    updateSelect(
                      'approveStatus',
                      value as ApproveStatus | 'NONE'
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='NONE'>None</SelectItem>
                    {APPROVE_STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <TextField
                form={form}
                field='approveBy'
                label='Approve by'
                onFormChange={onFormChange}
              />
            </FieldGrid>
          </FormSection>

          <FormSection
            step={3}
            title='Contact persons'
            description='Add one or more people. Company phone/fax stay in the next section.'
            action={
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='gap-1.5'
                onClick={addContact}
              >
                <Plus className='h-3.5 w-3.5' />
                Add contact
              </Button>
            }
          >
            {form.contacts.length === 0 ? (
              <p className='text-sm text-muted-foreground'>
                No contact person yet. Click &ldquo;Add contact&rdquo; to record
                name, title, email, phone, and date of birth.
              </p>
            ) : (
              <div className='space-y-3'>
                {form.contacts.map((contact, index) => (
                  <div
                    key={index}
                    className='rounded-md border bg-background p-3'
                  >
                    <div className='mb-2 flex items-center justify-between'>
                      <span className='text-xs font-medium text-muted-foreground'>
                        Contact #{index + 1}
                      </span>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='h-7 gap-1 px-2 text-destructive hover:text-destructive'
                        onClick={() => removeContact(index)}
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                        Remove
                      </Button>
                    </div>
                    <FieldGrid>
                      <ContactField
                        label='Contact person'
                        value={contact.person}
                        onChange={(value) =>
                          updateContact(index, 'person', value)
                        }
                      />
                      <ContactField
                        label='Title'
                        value={contact.title}
                        onChange={(value) =>
                          updateContact(index, 'title', value)
                        }
                      />
                      <ContactField
                        label='Date of birth'
                        type='date'
                        value={contact.dateOfBirth}
                        onChange={(value) =>
                          updateContact(index, 'dateOfBirth', value)
                        }
                      />
                      <ContactField
                        label='First name'
                        value={contact.firstName}
                        onChange={(value) =>
                          updateContact(index, 'firstName', value)
                        }
                      />
                      <ContactField
                        label='Last name'
                        value={contact.lastName}
                        onChange={(value) =>
                          updateContact(index, 'lastName', value)
                        }
                      />
                      <ContactField
                        label='Email'
                        type='email'
                        value={contact.email}
                        onChange={(value) =>
                          updateContact(index, 'email', value)
                        }
                      />
                      <ContactField
                        label='Phone'
                        value={contact.phone}
                        onChange={(value) =>
                          updateContact(index, 'phone', value)
                        }
                      />
                    </FieldGrid>
                  </div>
                ))}
              </div>
            )}
          </FormSection>

          <FormSection step={4} title='Company & terms'>
            <FieldGrid>
              <TextField
                form={form}
                field='country'
                label='Country'
                onFormChange={onFormChange}
              />
              <TextField
                form={form}
                field='city'
                label='City'
                onFormChange={onFormChange}
              />
              <TextField
                form={form}
                field='phone'
                label='Phone'
                onFormChange={onFormChange}
              />
              <TextField
                form={form}
                field='fax'
                label='Fax'
                onFormChange={onFormChange}
              />
              <TextField
                form={form}
                field='trackingUrl'
                label='Tracking URL'
                onFormChange={onFormChange}
              />
              <TextField
                form={form}
                field='companyEstablishmentDate'
                label='Company establishment date'
                type='date'
                onFormChange={onFormChange}
              />
              <TextField
                form={form}
                field='paymentDueDays'
                label='Payment due (days)'
                type='number'
                min={0}
                onFormChange={onFormChange}
              />
              <TextField
                form={form}
                field='contractNo'
                label='Contract no.'
                onFormChange={onFormChange}
              />
              <TextField
                form={form}
                field='address'
                label='Address'
                wide
                onFormChange={onFormChange}
              />
            </FieldGrid>
          </FormSection>

          <FormSection step={5} title='Invoice & bank'>
            <FieldGrid>
              <TextField
                form={form}
                field='taxNumber'
                label='Tax number'
                onFormChange={onFormChange}
              />
              <TextField
                form={form}
                field='invoiceCompanyName'
                label='Invoice company name'
                onFormChange={onFormChange}
              />
              <TextField
                form={form}
                field='invoiceCompanyPhone'
                label='Invoice company phone'
                onFormChange={onFormChange}
              />
              <TextField
                form={form}
                field='invoiceCompanyEmail'
                label='Invoice company email'
                type='email'
                onFormChange={onFormChange}
              />
              <TextField
                form={form}
                field='invoiceCompanyAddress'
                label='Invoice company address'
                wide
                onFormChange={onFormChange}
              />
              <TextField
                form={form}
                field='invoiceBankName'
                label='Invoice bank name'
                onFormChange={onFormChange}
              />
              <TextField
                form={form}
                field='invoiceBankBranch'
                label='Invoice bank branch'
                onFormChange={onFormChange}
              />
              <TextField
                form={form}
                field='invoiceBankAccount'
                label='Invoice bank account'
                onFormChange={onFormChange}
              />
            </FieldGrid>
          </FormSection>
        </fieldset>

        <DialogFooter className='gap-2 sm:justify-between'>
          <div className='flex flex-wrap items-center gap-2'>
            {canViewEditHistory && editingId != null ? (
              <PartnerFieldChangeHistory
                partnerId={editingId}
                refreshKey={historyRefreshKey}
              />
            ) : null}
          </div>
          <div className='flex flex-wrap items-center justify-end gap-2'>
            <Button
              variant='outline'
              onClick={() => onOpenChange(false)}
              disabled={saving || locking}
            >
              Cancel
            </Button>
            {editingId != null && !isLocked && onLock ? (
              <Button
                variant='outline'
                onClick={onLock}
                disabled={saving || locking}
                className='gap-2'
              >
                <Lock className='h-4 w-4' />
                {locking ? 'Locking...' : 'Lock edit'}
              </Button>
            ) : null}
            {!isLocked ? (
              <Button disabled={saving || locking} onClick={onSave}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ContactField({
  label,
  value,
  type,
  onChange,
}: {
  label: string
  value: string | null | undefined
  type?: string
  onChange: (value: string) => void
}) {
  return (
    <Field label={label}>
      <Input
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  )
}
