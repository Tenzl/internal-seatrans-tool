import { Loader2, Pencil, ShieldCheck, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { AdminRole } from './rolesService'

type RoleListProps = {
  roles: AdminRole[]
  loading: boolean
  sectionLabels: Map<string, string>
  onEdit: (role: AdminRole) => void
  onDelete: (role: AdminRole) => void
}

export function RoleList({
  roles,
  loading,
  sectionLabels,
  onEdit,
  onDelete,
}: RoleListProps) {
  if (loading) {
    return (
      <div className='flex min-h-[200px] items-center justify-center'>
        <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
      </div>
    )
  }

  return (
    <ul className='grid gap-3 pt-4'>
      {roles.map((role) => (
        <li key={role.id} className='rounded-xl border bg-card p-4'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
            <div className='min-w-0 space-y-2'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='text-base font-semibold'>{role.name}</span>
                {role.isAdmin ? (
                  <Badge className='gap-1' variant='default'>
                    <ShieldCheck className='h-3 w-3' /> Full access
                  </Badge>
                ) : null}
                <Badge
                  variant='outline'
                  className='font-normal text-muted-foreground'
                >
                  {role.roleGroup === 'INTERNAL' ? 'Internal' : 'External'}
                </Badge>
                <Badge variant='secondary' className='font-normal'>
                  {role.userCount} user{role.userCount === 1 ? '' : 's'}
                </Badge>
              </div>
              {role.description ? (
                <p className='text-sm text-muted-foreground'>
                  {role.description}
                </p>
              ) : null}
              <div className='flex flex-wrap gap-1'>
                {role.isAdmin ? (
                  <span className='text-sm text-muted-foreground'>
                    Every section
                  </span>
                ) : role.sections.length === 0 ? (
                  <span className='text-sm text-muted-foreground'>
                    No sections granted
                  </span>
                ) : (
                  role.sections.map((key) => (
                    <Badge
                      key={key}
                      variant='secondary'
                      className='font-normal'
                    >
                      {sectionLabels.get(key) ?? key}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div className='flex shrink-0 items-center gap-1.5'>
              <Button variant='outline' size='sm' onClick={() => onEdit(role)}>
                <Pencil className='h-4 w-4' /> Edit
              </Button>
              <Button
                variant='ghost'
                size='icon'
                aria-label='Delete role'
                disabled={role.isAdmin}
                onClick={() => onDelete(role)}
              >
                <Trash2 className='h-4 w-4 text-destructive' />
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
