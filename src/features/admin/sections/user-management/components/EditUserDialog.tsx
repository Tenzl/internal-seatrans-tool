import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/shared/utils/toast'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  adminUsersService,
  type AdminUserRow,
} from '../api/adminUsersService'
import { ADMIN_USERS_QUERY_ROOT } from '../model/userManagement.constants'
import {
  buildUpdateUserProfileInput,
  type EditUserFormValues,
} from '../model/userManagementRules'

type EditUserDialogProps = {
  user: AdminUserRow | null
  onClose: () => void
}

export function EditUserDialog(props: EditUserDialogProps) {
  if (!props.user) return null

  return <OpenEditUserDialog key={props.user.id} {...props} user={props.user} />
}

function OpenEditUserDialog({
  user,
  onClose,
}: Omit<EditUserDialogProps, 'user'> & { user: AdminUserRow }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<EditUserFormValues>({
    email: user.email ?? '',
    username: user.username ?? '',
    fullName: user.fullName ?? '',
    companyEmail: user.companyEmail ?? '',
  })
  const [isSaving, setIsSaving] = useState(false)

  const updateField = (field: keyof EditUserFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleSave = async () => {
    const result = buildUpdateUserProfileInput(form)
    if (!result.ok) {
      toast.error(result.error)
      return
    }

    const next = result.data
    const unchanged =
      next.email === user.email &&
      (next.username ?? null) === (user.username ?? null) &&
      next.fullName === (user.fullName ?? '').trim() &&
      (next.companyEmail ?? null) === (user.companyEmail ?? null)
    if (unchanged) {
      onClose()
      return
    }

    setIsSaving(true)
    try {
      await adminUsersService.updateUserProfile(user.id, next)
      toast.success('User updated')
      onClose()
      await queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_ROOT })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to update user'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
          <DialogDescription>
            Update name and login details. Company email is a shared inbox and
            may match other users.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4'>
          <Field
            id='edit-user-full-name'
            label='Full name'
            value={form.fullName}
            onChange={(value) => updateField('fullName', value)}
            placeholder='Full name'
          />
          <Field
            id='edit-user-username'
            label='Username'
            value={form.username}
            onChange={(value) => updateField('username', value)}
            placeholder='username'
            hint='Optional. Used for login. Must be unique.'
          />
          <Field
            id='edit-user-email'
            label='Email'
            type='email'
            value={form.email}
            onChange={(value) => updateField('email', value)}
            placeholder='name@company.com'
            hint='Login email. Must be unique.'
          />
          <Field
            id='edit-user-company-email'
            label='Company email'
            type='email'
            value={form.companyEmail}
            onChange={(value) => updateField('companyEmail', value)}
            placeholder='ops@company.com'
            hint='Used for booking PIC. Not for login. Duplicates allowed.'
          />
        </div>

        <DialogFooter className='mt-4'>
          <Button type='button' variant='outline' onClick={onClose}>
            Cancel
          </Button>
          <Button
            type='button'
            onClick={() => void handleSave()}
            disabled={isSaving}
            className='transition-transform active:scale-[0.98]'
          >
            {isSaving ? <Loader2 className='h-4 w-4 animate-spin' /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  type = 'text',
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  hint?: string
  type?: 'text' | 'email'
}) {
  return (
    <div className='space-y-1.5'>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete='off'
        className='transition-[color,box-shadow] duration-200'
      />
      {hint ? (
        <p className='text-xs text-muted-foreground'>{hint}</p>
      ) : null}
    </div>
  )
}
