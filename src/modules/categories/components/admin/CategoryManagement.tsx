'use client'

import { CategoryDeleteDialog } from './category-management/CategoryDeleteDialog'
import { CategoryFeedback } from './category-management/CategoryFeedback'
import { CategoryForm } from './category-management/CategoryForm'
import { CategoryTableSection } from './category-management/CategoryTableSection'
import { useCategoryManagement } from './category-management/useCategoryManagement'

export function ManageCategories() {
  const categoryManagement = useCategoryManagement()

  return (
    <>
      <CategoryTableSection
        categories={categoryManagement.categories}
        loading={categoryManagement.loading}
        onEdit={categoryManagement.startEditing}
        onDelete={categoryManagement.requestDelete}
        managementControls={
          <>
            <CategoryForm
              formData={categoryManagement.formData}
              isEditing={categoryManagement.isEditing}
              onNameChange={categoryManagement.updateName}
              onDescriptionChange={categoryManagement.updateDescription}
              onSubmit={() => void categoryManagement.saveCategory()}
              onCancel={categoryManagement.resetForm}
            />
            <CategoryFeedback
              successMessage={categoryManagement.successMessage}
              errorMessage={categoryManagement.errorMessage}
              onDismissSuccess={categoryManagement.dismissSuccess}
              onDismissError={categoryManagement.dismissError}
            />
          </>
        }
      />

      <CategoryDeleteDialog
        open={categoryManagement.deleteDialog.isOpen}
        category={categoryManagement.deleteDialog.category}
        onClose={categoryManagement.closeDeleteDialog}
        onConfirm={() => void categoryManagement.confirmDelete()}
      />
    </>
  )
}
