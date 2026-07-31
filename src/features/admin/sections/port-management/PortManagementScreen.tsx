'use client'

import {
  AdminDataPanel,
  AdminSection,
} from '@/shared/components/layout/dashboard/admin'
import { PortEditorDialog } from './PortEditorDialog'
import { PortsTable } from './PortsTable'
import { PortsToolbar } from './PortsToolbar'
import { usePortEditor } from './usePortEditor'
import { usePortRowActions } from './usePortRowActions'
import { usePortsCatalog } from './usePortsCatalog'
import { usePortsTable } from './usePortsTable'

/** Composes port management state with its focused toolbar, table and editor views. */
export function PortManagementScreen() {
  const catalog = usePortsCatalog()
  const editor = usePortEditor({
    provinces: catalog.provinces,
    createName: catalog.createName,
    onSaved: catalog.invalidate,
  })
  const rowActions = usePortRowActions(catalog.invalidate)
  const busy =
    catalog.isLoading ||
    catalog.isFetching ||
    editor.isSaving ||
    rowActions.isBusy
  const table = usePortsTable({
    rows: catalog.rows,
    totalElements: catalog.totalElements,
    pageCount: catalog.pageCount,
    pageIndex: catalog.page,
    busy,
    onPageChange: catalog.setPage,
    onEdit: editor.startEdit,
    onDelete: rowActions.deletePort,
    onToggleHasInfo: rowActions.toggleHasInfo,
  })

  return (
    <>
      <AdminSection
        toolbar={
          <PortsToolbar
            table={table}
            search={catalog.search}
            searchField={catalog.searchField}
            searchFieldLabel={catalog.searchFieldLabel}
            canAddPort={catalog.canAddPort}
            onSearchChange={catalog.setSearch}
            onSearchFieldChange={catalog.setSearchField}
            onClear={catalog.clearFilters}
            onAdd={editor.startCreate}
          />
        }
      >
        <AdminDataPanel
          meta={catalog.tableTitle}
          loading={busy && catalog.rows.length === 0}
          empty={!busy && catalog.rows.length === 0}
          emptyMessage={
            catalog.hasActiveSearch
              ? 'No ports match your search. You can add a new port using the button above.'
              : 'Search for a port by name, area, province, or other fields.'
          }
        >
          <PortsTable
            table={table}
            totalElements={catalog.totalElements}
            isFetching={catalog.isFetching && catalog.rows.length > 0}
          />
        </AdminDataPanel>
      </AdminSection>

      <PortEditorDialog
        open={editor.open}
        editing={editor.editing}
        busy={busy}
        form={editor.form}
        provinces={editor.provincesForArea}
        onOpenChange={editor.setOpen}
        onChange={editor.updateForm}
        onAreaChange={editor.selectArea}
        onSave={editor.save}
      />
    </>
  )
}
