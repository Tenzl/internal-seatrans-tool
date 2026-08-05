'use client'

import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { isAdminRole } from '@/config/section-catalog'
import { queryKeys } from '@/shared/config/react-query.config'
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue'
import { toast } from '@/shared/utils/toast'
import { Loader2, Lock } from 'lucide-react'
import { useCurrentUser } from '@/hooks/use-current-user'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PartnerFormDialog } from './PartnerFormDialog'
import { PartnerImportDialog } from './PartnerImportDialog'
import { PartnerTable } from './PartnerTable'
import { hardResetPartnerCaches } from './partnerCache'
import {
  createEmptyPartnerForm,
  partnerDetailToForm,
  partnerFormToRequest,
  validatePartnerForm,
} from './partnerFormModel'
import {
  PARTNERS_PAGE_SIZE,
  partnerManagementService,
} from './partnerManagementService'
import type {
  CustomerStatus,
  CustomerType,
  PartnerAdditionType,
} from './partnerManagementTypes'

export function PartnerManagementScreen() {
  const queryClient = useQueryClient()
  const currentUser = useCurrentUser()
  const canHardDelete = isAdminRole(currentUser?.role)
  const canViewEditHistory = isAdminRole(currentUser?.role)
  const [pageIndex, setPageIndex] = useState(0)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [additionType, setAdditionType] = useState<PartnerAdditionType | 'ALL'>(
    'ALL'
  )
  const [customerStatus, setCustomerStatus] = useState<CustomerStatus | 'ALL'>(
    'ALL'
  )
  const [customerType, setCustomerType] = useState<CustomerType | 'ALL'>('ALL')
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [locking, setLocking] = useState(false)
  const [lockConfirmOpen, setLockConfirmOpen] = useState(false)
  const [lockedAt, setLockedAt] = useState<string | null>(null)
  const [form, setForm] = useState(createEmptyPartnerForm)
  const [fieldChangeHistoryKey, setFieldChangeHistoryKey] = useState(0)

  const partnersQuery = useQuery({
    queryKey: queryKeys.partnersList(
      pageIndex,
      debouncedSearch,
      additionType,
      customerStatus,
      customerType
    ),
    queryFn: () =>
      partnerManagementService.list({
        page: pageIndex,
        size: PARTNERS_PAGE_SIZE,
        sort: 'updatedAt,desc',
        q: debouncedSearch.trim() || undefined,
        additionTypes: additionType === 'ALL' ? undefined : [additionType],
        additionTypesMode: 'OR',
        customerStatus: customerStatus === 'ALL' ? undefined : customerStatus,
        customerType: customerType === 'ALL' ? undefined : customerType,
        includeArchived: false,
      }),
  })

  const partnersPage = partnersQuery.data
  const rows = partnersPage?.content ?? []
  const totalElements = partnersPage?.totalElements ?? 0
  const pageCount = Math.max(1, partnersPage?.totalPages ?? 1)
  const loading = partnersQuery.isLoading || partnersQuery.isFetching

  const resetPartnerCaches = useCallback(() => {
    return hardResetPartnerCaches(queryClient)
  }, [queryClient])

  const openCreateDialog = useCallback(() => {
    setEditingId(null)
    setLockedAt(null)
    setForm(createEmptyPartnerForm())
    setFormDialogOpen(true)
  }, [])

  const openEditDialog = useCallback(async (id: number) => {
    try {
      const detail = await partnerManagementService.detail(id)
      setEditingId(id)
      setLockedAt(detail.lockedAt ?? null)
      setForm(partnerDetailToForm(detail))
      setFormDialogOpen(true)
    } catch (error) {
      toast.error('Failed to load partner detail', error)
    }
  }, [])

  const savePartner = async () => {
    if (lockedAt) {
      toast.error('Partner is locked and cannot be edited')
      return
    }

    const validationMessage = validatePartnerForm(form)
    if (validationMessage) {
      toast.error(validationMessage)
      return
    }

    try {
      setSaving(true)
      const request = partnerFormToRequest(form)

      if (editingId != null) {
        await partnerManagementService.update(editingId, request)
        toast.success('Partner updated successfully')
        setFieldChangeHistoryKey((key) => key + 1)
      } else {
        await partnerManagementService.create(request)
        toast.success('Partner created successfully')
      }

      await resetPartnerCaches()
      setFormDialogOpen(false)
      setForm(createEmptyPartnerForm())
      setEditingId(null)
      setLockedAt(null)
    } catch (error) {
      toast.error('Failed to save partner', error)
    } finally {
      setSaving(false)
    }
  }

  const confirmLockPartner = async () => {
    if (editingId == null || lockedAt) return

    try {
      setLocking(true)
      const locked = await partnerManagementService.lock(editingId)
      setLockedAt(locked.lockedAt ?? new Date().toISOString())
      setFieldChangeHistoryKey((key) => key + 1)
      await resetPartnerCaches()
      setLockConfirmOpen(false)
      toast.success('Partner locked successfully')
    } catch (error) {
      toast.error('Failed to lock partner', error)
    } finally {
      setLocking(false)
    }
  }

  const deletePartner = useCallback(
    async (id: number) => {
      if (!confirm('Delete this partner?')) return

      try {
        await partnerManagementService.delete(id)
        await resetPartnerCaches()
        toast.success('Partner deleted successfully')
      } catch (error) {
        toast.error('Failed to delete partner', error)
      }
    },
    [resetPartnerCaches]
  )

  const deleteAllPartners = async () => {
    if (totalElements === 0) {
      toast.info?.('No partners to delete')
      return
    }

    const confirmation = prompt(
      `Permanently delete ALL ${totalElements} partners and dependent shipping settings?\n` +
        'This cannot be undone. Type DELETE ALL PARTNERS to continue.'
    )
    if (confirmation !== 'DELETE ALL PARTNERS') return

    try {
      const { deleted } =
        await partnerManagementService.deleteAll(totalElements)
      setPageIndex(0)
      await resetPartnerCaches()
      toast.success(`Deleted all ${deleted} partner(s)`)
    } catch (error) {
      toast.error('Failed to delete all partners', error)
    }
  }

  const changeSearch = (value: string) => {
    setSearch(value)
    setPageIndex(0)
  }

  const changeAdditionType = (value: PartnerAdditionType | 'ALL') => {
    setAdditionType(value)
    setPageIndex(0)
  }

  const changeCustomerStatus = (value: CustomerStatus | 'ALL') => {
    setCustomerStatus(value)
    setPageIndex(0)
  }

  const changeCustomerType = (value: CustomerType | 'ALL') => {
    setCustomerType(value)
    setPageIndex(0)
  }

  return (
    <>
      <PartnerTable
        rows={rows}
        totalElements={totalElements}
        pageCount={pageCount}
        pageIndex={pageIndex}
        loading={loading}
        search={search}
        additionType={additionType}
        customerStatus={customerStatus}
        customerType={customerType}
        onPageChange={setPageIndex}
        onSearchChange={changeSearch}
        onAdditionTypeChange={changeAdditionType}
        onCustomerStatusChange={changeCustomerStatus}
        onCustomerTypeChange={changeCustomerType}
        onCreate={openCreateDialog}
        onEdit={openEditDialog}
        onDelete={deletePartner}
        onDeleteAll={deleteAllPartners}
        canHardDelete={canHardDelete}
        onImport={() => setImportDialogOpen(true)}
      />

      <PartnerFormDialog
        open={formDialogOpen}
        editingId={editingId}
        form={form}
        saving={saving}
        locking={locking}
        isLocked={Boolean(lockedAt)}
        canViewEditHistory={canViewEditHistory}
        historyRefreshKey={fieldChangeHistoryKey}
        onOpenChange={(open) => {
          setFormDialogOpen(open)
          if (!open) {
            setLockedAt(null)
            setLockConfirmOpen(false)
          }
        }}
        onFormChange={setForm}
        onSave={savePartner}
        onLock={() => setLockConfirmOpen(true)}
      />

      <AlertDialog
        open={lockConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !locking) setLockConfirmOpen(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lock this partner?</AlertDialogTitle>
            <AlertDialogDescription>
              After locking partner #{editingId}, you will no longer be able to
              edit this record. Unlock is not supported. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={locking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={locking}
              onClick={(event) => {
                event.preventDefault()
                void confirmLockPartner()
              }}
              className='gap-2'
            >
              {locking ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Lock className='h-4 w-4' />
              )}
              Lock edit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PartnerImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImported={() => void resetPartnerCaches()}
      />
    </>
  )
}
