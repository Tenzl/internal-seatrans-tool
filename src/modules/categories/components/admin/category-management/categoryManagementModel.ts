import type {
  Category,
  CategoryRequest,
} from '@/modules/categories/services/categoryService'

export const EMPTY_CATEGORY_FORM: CategoryRequest = {
  name: '',
  slug: '',
  description: '',
}

export function generateCategorySlug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function capitalizeCategoryWords(text: string) {
  return text
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function createCategoryEditForm(category: Category): CategoryRequest {
  return {
    name: category.name,
    // Slugs follow the current category name when an existing row is edited.
    slug: generateCategorySlug(category.name),
    description: category.description || '',
  }
}

export function getCategoryDeleteError(error: unknown, categoryName: string) {
  const message = error instanceof Error ? error.message : ''
  const isCategoryInUse =
    message.includes('foreign key constraint') ||
    message.includes('Cannot delete or update a parent row')

  return isCategoryInUse
    ? `Cannot delete "${categoryName}" - this category is being used by one or more posts. Please remove it from posts first.`
    : message || 'Failed to delete category'
}

export function formatCategoryDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function getCategoryTableTitle(
  search: string,
  filteredCount: number,
  total: number
) {
  return search.trim()
    ? `${filteredCount} result${filteredCount === 1 ? '' : 's'}`
    : `All Categories (${total})`
}
