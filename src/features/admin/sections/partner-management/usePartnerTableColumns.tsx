import { useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { useTableSortHeader } from '@/shared/hooks/useTableSortHeader'
import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatAdditionTypeLabel } from './partnerFormModel'
import type { BookingPartnerListItem } from './partnerManagementTypes'

export function usePartnerTableColumns(
  onEdit: (id: number) => void,
  onDelete: (id: number) => void,
  canHardDelete: boolean
) {
  const renderSortableHeader = useTableSortHeader<BookingPartnerListItem>()

  return useMemo<ColumnDef<BookingPartnerListItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: renderSortableHeader('Name'),
        cell: ({ row }) => (
          <span
            className='block w-full truncate font-medium'
            title={row.original.name}
          >
            {row.original.name}
          </span>
        ),
      },
      {
        accessorKey: 'customerId',
        header: renderSortableHeader('Customer ID'),
      },
      {
        accessorKey: 'additionTypes',
        header: 'Additional Types',
        enableSorting: false,
        cell: ({ row }) => (
          <div className='flex flex-wrap gap-1'>
            {row.original.additionTypes?.map((type) => (
              <Badge key={type} variant='outline' className='text-xs'>
                {formatAdditionTypeLabel(type)}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        accessorKey: 'country',
        header: renderSortableHeader('Country'),
      },
      {
        accessorKey: 'city',
        header: renderSortableHeader('City'),
      },
      {
        accessorKey: 'contacts',
        header: 'Contacts',
        enableSorting: false,
        cell: ({ row }) => {
          const contacts = row.original.contacts ?? []
          if (!contacts.length) return '-'

          const firstContact = contacts[0]
          const label =
            firstContact.person?.trim() ||
            [firstContact.firstName, firstContact.lastName]
              .filter(Boolean)
              .join(' ') ||
            firstContact.email ||
            'Contact'

          return (
            <div className='flex flex-col leading-tight'>
              <span className='font-medium'>{label}</span>
              {firstContact.email ? (
                <span className='text-xs text-muted-foreground'>
                  {firstContact.email}
                </span>
              ) : null}
              {contacts.length > 1 ? (
                <span className='text-xs text-muted-foreground'>
                  +{contacts.length - 1} more
                </span>
              ) : null}
            </div>
          )
        },
      },
      { accessorKey: 'phone', header: 'Phone', enableSorting: false },
      { accessorKey: 'fax', header: 'Fax', enableSorting: false },
      {
        accessorKey: 'trackingUrl',
        header: 'Tracking URL',
        enableSorting: false,
      },
      { accessorKey: 'address', header: 'Address', enableSorting: false },
      {
        accessorKey: 'customerStatus',
        header: renderSortableHeader('Customer Status'),
        cell: ({ row }) =>
          row.original.customerStatus ? (
            <Badge>{row.original.customerStatus}</Badge>
          ) : (
            '-'
          ),
      },
      {
        accessorKey: 'customerType',
        header: renderSortableHeader('Customer Type'),
      },
      {
        accessorKey: 'taxNumber',
        header: renderSortableHeader('Tax Number'),
      },
      {
        accessorKey: 'approveStatus',
        header: 'Approve Status',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.approveStatus ? (
            <Badge variant='outline'>{row.original.approveStatus}</Badge>
          ) : (
            '-'
          ),
      },
      { accessorKey: 'approveBy', header: 'Approve By', enableSorting: false },
      {
        accessorKey: 'companyEstablishmentDate',
        header: 'Company Establishment',
        enableSorting: false,
        cell: ({ row }) => row.original.companyEstablishmentDate || '-',
      },
      {
        accessorKey: 'paymentDueDays',
        header: 'Payment Due (Days)',
        enableSorting: false,
        cell: ({ row }) =>
          row.original.paymentDueDays != null
            ? row.original.paymentDueDays
            : '-',
      },
      {
        accessorKey: 'contractNo',
        header: 'Contract No.',
        enableSorting: false,
      },
      {
        accessorKey: 'invoiceCompanyName',
        header: 'Invoice Company Name',
        enableSorting: false,
      },
      {
        accessorKey: 'invoiceCompanyAddress',
        header: 'Invoice Company Address',
        enableSorting: false,
      },
      {
        accessorKey: 'invoiceCompanyPhone',
        header: 'Invoice Company Phone',
        enableSorting: false,
      },
      {
        accessorKey: 'invoiceCompanyEmail',
        header: 'Invoice Company Email',
        enableSorting: false,
      },
      {
        accessorKey: 'invoiceBankName',
        header: 'Invoice Bank Name',
        enableSorting: false,
      },
      {
        accessorKey: 'invoiceBankBranch',
        header: 'Invoice Bank Branch',
        enableSorting: false,
      },
      {
        accessorKey: 'invoiceBankAccount',
        header: 'Invoice Bank Account',
        enableSorting: false,
      },
      { accessorKey: 'updatedBy', header: 'Updated By', enableSorting: false },
      {
        accessorKey: 'updatedAt',
        header: renderSortableHeader('Updated At'),
        cell: ({ row }) =>
          row.original.updatedAt
            ? new Date(row.original.updatedAt).toLocaleDateString('en-CA')
            : '-',
      },
      { accessorKey: 'createdBy', header: 'Created By', enableSorting: false },
      {
        accessorKey: 'createdAt',
        header: renderSortableHeader('Created On'),
        cell: ({ row }) =>
          row.original.createdAt
            ? new Date(row.original.createdAt).toLocaleDateString('en-CA')
            : '-',
      },
      {
        id: 'actions',
        header: 'Actions',
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => (
          <div className='flex items-center justify-end gap-0.5'>
            <Button
              size='sm'
              variant='outline'
              onClick={() => onEdit(row.original.id)}
            >
              <Pencil className='h-3 w-3' />
            </Button>
            {canHardDelete ? (
              <Button
                size='sm'
                variant='outline'
                onClick={() => onDelete(row.original.id)}
              >
                <Trash2 className='h-3 w-3' />
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [canHardDelete, onDelete, onEdit, renderSortableHeader]
  )
}
