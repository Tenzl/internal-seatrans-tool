import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  categoryService,
  type Category,
  type CategoryRequest,
} from '@/modules/categories/services/categoryService'
import {
  capitalizeCategoryWords,
  createCategoryEditForm,
  EMPTY_CATEGORY_FORM,
  generateCategorySlug,
  getCategoryDeleteError,
} from './categoryManagementModel'

const SUCCESS_MESSAGE_DURATION_MS = 3_000
const ERROR_MESSAGE_DURATION_MS = 3_000
const DELETE_ERROR_DURATION_MS = 5_000

interface DeleteDialogState {
  isOpen: boolean
  category: Category | null
}

const CLOSED_DELETE_DIALOG: DeleteDialogState = {
  isOpen: false,
  category: null,
}

export function useCategoryManagement() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteDialog, setDeleteDialog] =
    useState<DeleteDialogState>(CLOSED_DELETE_DIALOG)
  const [formData, setFormData] = useState<CategoryRequest>(EMPTY_CATEGORY_FORM)
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const {
    data: categories = [],
    isPending,
    isFetching,
    refetch: reloadCategories,
  } = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: categoryService.getAdminCategories,
    retry: false,
  })

  const dismissSuccess = useCallback(() => {
    if (successTimer.current) clearTimeout(successTimer.current)
    successTimer.current = null
    setSuccessMessage(null)
  }, [])

  const dismissError = useCallback(() => {
    if (errorTimer.current) clearTimeout(errorTimer.current)
    errorTimer.current = null
    setErrorMessage(null)
  }, [])

  const showSuccess = useCallback(
    (message: string) => {
      dismissSuccess()
      dismissError()
      setSuccessMessage(message)
      successTimer.current = setTimeout(
        () => setSuccessMessage(null),
        SUCCESS_MESSAGE_DURATION_MS
      )
    },
    [dismissError, dismissSuccess]
  )

  const showError = useCallback(
    (message: string, duration = ERROR_MESSAGE_DURATION_MS) => {
      dismissError()
      setErrorMessage(message)
      errorTimer.current = setTimeout(() => setErrorMessage(null), duration)
    },
    [dismissError]
  )

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current)
      if (errorTimer.current) clearTimeout(errorTimer.current)
    }
  }, [])

  const resetForm = useCallback(() => {
    setEditingId(null)
    setFormData(EMPTY_CATEGORY_FORM)
  }, [])

  const updateName = useCallback((name: string) => {
    const normalizedName = capitalizeCategoryWords(name)
    setFormData((previous) => ({
      ...previous,
      name: normalizedName,
      slug: generateCategorySlug(normalizedName),
    }))
  }, [])

  const updateDescription = useCallback((description: string) => {
    setFormData((previous) => ({ ...previous, description }))
  }, [])

  const saveCategory = useCallback(async () => {
    try {
      if (editingId !== null) {
        await categoryService.updateCategory(editingId, formData)
        showSuccess('Category updated successfully')
      } else {
        await categoryService.createCategory(formData)
        showSuccess('Category created successfully')
      }
      resetForm()
      void reloadCategories()
    } catch (error) {
      showError(
        error instanceof Error ? error.message : 'Failed to save category'
      )
    }
  }, [editingId, formData, reloadCategories, resetForm, showError, showSuccess])

  const startEditing = useCallback((category: Category) => {
    setEditingId(category.id)
    setFormData(createCategoryEditForm(category))
  }, [])

  const requestDelete = useCallback((category: Category) => {
    setDeleteDialog({ isOpen: true, category })
  }, [])

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog(CLOSED_DELETE_DIALOG)
  }, [])

  const confirmDelete = useCallback(async () => {
    const category = deleteDialog.category
    if (!category) return

    try {
      await categoryService.deleteCategory(category.id)
      showSuccess('Category deleted successfully')
      void reloadCategories()
    } catch (error) {
      showError(
        getCategoryDeleteError(error, category.name),
        DELETE_ERROR_DURATION_MS
      )
    } finally {
      closeDeleteDialog()
    }
  }, [
    closeDeleteDialog,
    deleteDialog.category,
    reloadCategories,
    showError,
    showSuccess,
  ])

  return {
    categories,
    loading: isPending || isFetching,
    formData,
    isEditing: editingId !== null,
    deleteDialog,
    successMessage,
    errorMessage,
    updateName,
    updateDescription,
    saveCategory,
    resetForm,
    startEditing,
    requestDelete,
    closeDeleteDialog,
    confirmDelete,
    dismissSuccess,
    dismissError,
  }
}
