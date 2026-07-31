import type { Dispatch, SetStateAction } from 'react'
import type { Province } from '@/modules/logistics/services/provinceService'
import { AlertCircle, CheckCircle2, ExternalLink, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { OfficeFormState, ParsedGoogleMap } from './officeModel'

type OfficeFormProps = {
  adding: boolean
  form: OfficeFormState
  parsedMap: ParsedGoogleMap
  provinces: Province[]
  onFormChange: Dispatch<SetStateAction<OfficeFormState>>
  onSave: () => void
  onCancel: () => void
}

export function OfficeForm({
  adding,
  form,
  parsedMap,
  provinces,
  onFormChange,
  onSave,
  onCancel,
}: OfficeFormProps) {
  const setField = <Key extends keyof OfficeFormState>(
    field: Key,
    value: OfficeFormState[Key]
  ) => {
    onFormChange((current) => ({ ...current, [field]: value }))
  }

  return (
    <div className='mb-6 rounded-lg border bg-card p-6'>
      <h2 className='mb-4 text-xl font-semibold'>
        {adding ? 'Add New Office' : 'Edit Office'}
      </h2>
      <div className='grid gap-4 md:grid-cols-2'>
        <div>
          <Label htmlFor='provinceId'>Province *</Label>
          <select
            id='provinceId'
            name='provinceId'
            aria-label='Select province'
            value={form.provinceId}
            onChange={(event) => setField('provinceId', event.target.value)}
            className='mt-2 w-full rounded-lg border bg-background px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none'
            required
          >
            <option value=''>Select province...</option>
            {provinces.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name}
              </option>
            ))}
          </select>
        </div>

        <TextField
          id='name'
          label='Office Name *'
          value={form.name}
          placeholder='e.g., SEATRANS Head Office'
          onChange={(value) => setField('name', value)}
        />

        <div className='md:col-span-2'>
          <Label htmlFor='address'>Address *</Label>
          <Textarea
            id='address'
            value={form.address}
            onChange={(event) => setField('address', event.target.value)}
            placeholder='Full address'
            rows={2}
            required
          />
        </div>

        <div className='space-y-2 md:col-span-2'>
          <div className='flex items-baseline justify-between gap-3'>
            <Label htmlFor='mapUrl'>Google Maps Link *</Label>
            <span className='text-xs text-muted-foreground'>
              Open the place in Google Maps and paste the URL from the browser
              address bar.
            </span>
          </div>
          <Textarea
            id='mapUrl'
            value={form.mapUrl}
            onChange={(event) => setField('mapUrl', event.target.value)}
            placeholder='https://www.google.com/maps/place/...'
            rows={2}
            required
            spellCheck={false}
            className={`font-mono text-xs ${
              form.mapUrl && !parsedMap.ok
                ? 'border-destructive focus-visible:ring-destructive/30'
                : ''
            }`}
          />
          {form.mapUrl ? (
            parsedMap.ok ? (
              <div className='flex items-center justify-between gap-3 rounded-lg border border-emerald-200/60 bg-emerald-50/60 px-3 py-2 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30'>
                <div className='flex items-center gap-2'>
                  <CheckCircle2 className='h-4 w-4 text-emerald-600 dark:text-emerald-400' />
                  <span className='font-mono text-xs text-emerald-900 tabular-nums dark:text-emerald-200'>
                    {parsedMap.lat.toFixed(7)}, {parsedMap.lng.toFixed(7)}
                  </span>
                  <span className='text-[10px] tracking-wider text-emerald-700/70 uppercase dark:text-emerald-400/70'>
                    {parsedMap.source === 'pin'
                      ? 'place pin'
                      : parsedMap.source === 'viewport'
                        ? 'viewport center'
                        : 'query'}
                  </span>
                </div>
                <a
                  href={form.mapUrl.trim()}
                  target='_blank'
                  rel='noreferrer'
                  className='inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-200'
                >
                  Preview <ExternalLink className='h-3 w-3' />
                </a>
              </div>
            ) : (
              <div className='flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive'>
                <AlertCircle className='mt-0.5 h-4 w-4 shrink-0' />
                <span>{parsedMap.message}</span>
              </div>
            )
          ) : null}
        </div>

        <TextField
          id='managerName'
          label='Manager Name'
          value={form.managerName}
          placeholder='e.g., Minh Khang (Mr)'
          onChange={(value) => setField('managerName', value)}
        />
        <TextField
          id='managerTitle'
          label='Manager Title'
          value={form.managerTitle}
          placeholder='e.g., Office Supervisor'
          onChange={(value) => setField('managerTitle', value)}
        />
        <TextField
          id='managerMobile'
          label='Manager Mobile'
          value={form.managerMobile}
          placeholder='e.g., +84 90-111-2233'
          onChange={(value) => setField('managerMobile', value)}
        />
        <TextField
          id='managerEmail'
          label='Manager Email'
          type='email'
          value={form.managerEmail}
          placeholder='e.g., office@seatrans.com.vn'
          onChange={(value) => setField('managerEmail', value)}
        />

        <div className='flex items-center gap-2 md:col-span-2'>
          <input
            type='checkbox'
            id='isHeadquarter'
            name='isHeadquarter'
            aria-label='Mark as head office'
            checked={form.isHeadquarter}
            onChange={(event) =>
              setField('isHeadquarter', event.target.checked)
            }
            className='h-4 w-4'
          />
          <Label htmlFor='isHeadquarter' className='!mb-0 cursor-pointer'>
            Mark as Head Office
          </Label>
        </div>
      </div>

      <div className='mt-6 flex gap-2'>
        <Button onClick={onSave}>
          <Save className='mr-2 h-4 w-4' />
          Save
        </Button>
        <Button onClick={onCancel} variant='outline'>
          <X className='mr-2 h-4 w-4' />
          Cancel
        </Button>
      </div>
    </div>
  )
}

function TextField({
  id,
  label,
  value,
  type,
  placeholder,
  onChange,
}: {
  id: string
  label: string
  value: string
  type?: string
  placeholder?: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={label.endsWith('*')}
      />
    </div>
  )
}
