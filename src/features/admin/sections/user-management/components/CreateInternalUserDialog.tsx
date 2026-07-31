import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/shared/utils/toast'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
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
  adminUsersService,
  type AdminRoleOption,
} from '../api/adminUsersService'
import { ADMIN_USERS_QUERY_ROOT } from '../model/userManagement.constants'
import {
  buildCreateUserInput,
  type CreateUserFormValues,
} from '../model/userManagementRules'

const EMPTY_FORM: CreateUserFormValues = {
  email: '',
  username: '',
  fullName: '',
  password: '',
  roleId: '',
}

type CreateInternalUserDialogProps = {
  open: boolean
  roles: AdminRoleOption[]
  isLoadingRoles: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateInternalUserDialog({
  open,
  roles,
  isLoadingRoles,
  onOpenChange,
}: CreateInternalUserDialogProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CreateUserFormValues>(EMPTY_FORM)
  const [isCreating, setIsCreating] = useState(false)
  const internalRoles = useMemo(
    () => roles.filter((role) => role.roleGroup === 'INTERNAL'),
    [roles]
  )

  const close = () => {
    setForm(EMPTY_FORM)
    onOpenChange(false)
  }

  const updateField = (field: keyof CreateUserFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
  }

  const handleCreate = async () => {
    const result = buildCreateUserInput(form)
    if (!result.ok) {
      toast.error(result.error)
      return
    }

    setIsCreating(true)
    try {
      await adminUsersService.createInternalUser(result.data)
      toast.success('User created')
      close()
      await queryClient.invalidateQueries({ queryKey: ADMIN_USERS_QUERY_ROOT })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create user'
      )
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          onOpenChange(true)
        } else {
          close()
        }
      }}
    >
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>Create internal user</DialogTitle>
        </DialogHeader>

        <div className='grid gap-4'>
          <FormInput
            label='Email'
            value={form.email}
            onChange={(value) => updateField('email', value)}
            placeholder='name@company.com'
            name='email'
          />
          <FormInput
            label='Username (optional)'
            value={form.username}
            onChange={(value) => updateField('username', value)}
            placeholder='username'
            name='username'
          />
          <FormInput
            label='Full name (optional)'
            value={form.fullName}
            onChange={(value) => updateField('fullName', value)}
            placeholder='Full name'
            name='fullName'
          />
          <FormInput
            label='Password'
            value={form.password}
            onChange={(value) => updateField('password', value)}
            placeholder='At least 8 characters'
            name='password'
            type='password'
          />

          <div className='space-y-1.5'>
            <Label>Role</Label>
            <Select
              value={form.roleId}
              onValueChange={(value) => updateField('roleId', value)}
              disabled={isLoadingRoles}
            >
              <SelectTrigger className='h-9'>
                <SelectValue
                  placeholder={
                    isLoadingRoles ? 'Loading roles…' : 'Select role'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {internalRoles.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className='text-xs text-muted-foreground'>
              Only INTERNAL roles can be created here.
            </p>
          </div>
        </div>

        <DialogFooter className='mt-4'>
          <Button type='button' variant='outline' onClick={close}>
            Cancel
          </Button>
          <Button
            type='button'
            onClick={() => void handleCreate()}
            disabled={isCreating}
          >
            {isCreating ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              'Create'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type FormInputProps = {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  name: string
  type?: 'text' | 'password'
}

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  name,
  type = 'text',
}: FormInputProps) {
  return (
    <div className='space-y-1.5'>
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'new-password' : 'off'}
        name={name}
      />
    </div>
  )
}
