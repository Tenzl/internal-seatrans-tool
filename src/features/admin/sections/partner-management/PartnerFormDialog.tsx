import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { DateTimePicker } from '@/shared/components/DateTimePicker'
import { NumberInput } from '@/shared/components/NumberInput'
import { cn } from '@/lib/utils'
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
  formatCustomerStatusLabel,
  formatCustomerTypeLabel,
  PARTNER_ADDITION_TYPE_OPTIONS,
  type PartnerFormState,
} from './partnerFormModel'
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
      <Label className='text-xs font-medium tracking-wide text-muted-foreground'>
        {label}
      </Label>
      {children}
    </div>
  )
}

function OptionCheckRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className='space-y-2'>
      <Label className='text-xs font-medium tracking-wide text-muted-foreground'>
        {label}
      </Label>
      <div className='flex flex-wrap gap-2'>{children}</div>
    </div>
  )
}

function OptionCheck({
  checked,
  label,
  onCheckedChange,
}: {
  checked: boolean
  label: string
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors duration-200',
        checked
          ? 'border-primary/35 bg-primary/8 text-foreground'
          : 'border-border/70 bg-background/70 text-foreground hover:bg-muted/50'
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(state) => onCheckedChange(state === true)}
      />
      <span className='leading-none'>{label}</span>
    </label>
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
      {type === 'number' ? (
        <NumberInput
          value={String(form[field] ?? '')}
          decimalScale={0}
          min={min ?? 0}
          disabled={disabled}
          placeholder={placeholder}
          onValueChange={(_value, canonical) =>
            onFormChange((current) => ({
              ...current,
              [field]: canonical,
            }))
          }
        />
      ) : type === 'date' ? (
        <DateTimePicker
          value={String(form[field] ?? '')}
          disabled={disabled}
          maxDate={new Date()}
          placeholder={placeholder}
          onValueChange={(value) =>
            onFormChange((current) => ({
              ...current,
              [field]: value,
            }))
          }
        />
      ) : (
        <Input
          type={type}
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
      )}
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
  onOpenChange,
  onFormChange,
  onSave,
  onLock,
}: PartnerFormDialogProps) {
  const updateApproveStatus = (value: string) => {
    onFormChange((current) => ({
      ...current,
      approveStatus: value === 'NONE' ? '' : (value as ApproveStatus),
    }))
  }

  const setCustomerStatus = (status: CustomerStatus, checked: boolean) => {
    onFormChange((current) => ({
      ...current,
      customerStatus: checked ? status : '',
    }))
  }

  const setCustomerType = (type: CustomerType, checked: boolean) => {
    onFormChange((current) => ({
      ...current,
      customerType: checked ? type : '',
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
              : editingId
                ? 'Customer ID is fixed after creation.'
                : 'Customer ID is assigned automatically when you save.'}
          </DialogDescription>
        </DialogHeader>

        <fieldset
          disabled={isLocked || saving || locking}
          className='max-h-[72vh] space-y-6 overflow-y-auto px-1 pb-2 disabled:opacity-90'
        >
          <FormSection
            step={1}
            title='Identity'
            description='Partner display name used across booking documents.'
          >
            <FieldGrid>
              <TextField
                form={form}
                field='name'
                label='Name *'
                onFormChange={onFormChange}
              />
              {editingId != null && form.customerId ? (
                <Field label='Customer ID'>
                  <p className='flex h-9 items-center rounded-md border border-dashed bg-muted/40 px-3 font-mono text-sm tabular-nums tracking-tight text-muted-foreground'>
                    {form.customerId}
                  </p>
                </Field>
              ) : null}
            </FieldGrid>
          </FormSection>

          <FormSection
            step={2}
            title={
              editingId != null
                ? 'Classification & approval'
                : 'Classification'
            }
            description='Pick status, type, and the roles this partner can fill.'
          >
            <div className='space-y-4'>
              <OptionCheckRow label='Customer status'>
                {CUSTOMER_STATUS_OPTIONS.map((status) => (
                  <OptionCheck
                    key={status}
                    checked={form.customerStatus === status}
                    label={formatCustomerStatusLabel(status)}
                    onCheckedChange={(checked) =>
                      setCustomerStatus(status, checked)
                    }
                  />
                ))}
              </OptionCheckRow>

              <OptionCheckRow label='Customer type'>
                {CUSTOMER_TYPE_OPTIONS.map((type) => (
                  <OptionCheck
                    key={type}
                    checked={form.customerType === type}
                    label={formatCustomerTypeLabel(type)}
                    onCheckedChange={(checked) =>
                      setCustomerType(type, checked)
                    }
                  />
                ))}
              </OptionCheckRow>

              <OptionCheckRow label='Additional types'>
                {PARTNER_ADDITION_TYPE_OPTIONS.map((type) => (
                  <OptionCheck
                    key={type}
                    checked={form.additionTypes.includes(type)}
                    label={formatAdditionTypeLabel(type)}
                    onCheckedChange={(checked) =>
                      toggleAdditionType(type, checked)
                    }
                  />
                ))}
              </OptionCheckRow>

              {editingId != null ? (
                <FieldGrid>
                  <Field label='Approve status'>
                    <Select
                      value={form.approveStatus || 'NONE'}
                      onValueChange={updateApproveStatus}
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
              ) : null}
            </div>
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

        <DialogFooter className='gap-2 sm:justify-end'>
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
      {type === 'date' ? (
        <DateTimePicker
          value={value ?? ''}
          onValueChange={onChange}
          maxDate={new Date()}
        />
      ) : (
        <Input
          type={type}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  )
}
