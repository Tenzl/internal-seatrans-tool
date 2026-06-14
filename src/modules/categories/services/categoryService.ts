import { apiClient } from '@/shared/utils/apiClient'
import { API_CONFIG } from '@/shared/config/api.config'
import type { ApiResponse } from '@/shared/types/api.types'

export interface Category {
  id: number
  name: string
  description?: string
  createdAt: string
}

export interface CategoryRequest {
  name: string
  slug: string
  description?: string
}

export const categoryService = {
  // Get all categories (public)
  getAllCategories: async (): Promise<Category[]> => {
    try {
      const response = await apiClient.get<ApiResponse<Category[]>>(
        API_CONFIG.CATEGORIES.PUBLIC_BASE,
        { skipAuth: true }
      )

      if (!response.ok) {
        console.warn('Categories endpoint not available:', response.status)
        return []
      }

      const result: ApiResponse<Category[]> = await response.json()
      return result.data
    } catch (error) {
      console.warn('Failed to fetch categories, using empty list')
      return []
    }
  },

  // Admin: Get all categories (with fallback to public endpoint)
  getAdminCategories: async (): Promise<Category[]> => {
    try {
      const response = await apiClient.get<ApiResponse<Category[]>>(API_CONFIG.CATEGORIES.ADMIN_BASE)
      
      if (response.ok) {
        const result: ApiResponse<Category[]> = await response.json()
        return result.data
      }
      
      console.log('Admin categories endpoint not available, trying public endpoint')
      return await categoryService.getAllCategories()
    } catch (error) {
      console.log('Error fetching admin categories, using fallback')
      return await categoryService.getAllCategories()
    }
  },

  // Admin: Create category
  createCategory: async (data: CategoryRequest): Promise<Category> => {
    const response = await apiClient.post<ApiResponse<Category>>(API_CONFIG.CATEGORIES.ADMIN_BASE, data)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create category')
    }

    const result: ApiResponse<Category> = await response.json()
    return result.data
  },

  // Admin: Update category
  updateCategory: async (id: number, data: CategoryRequest): Promise<Category> => {
    const response = await apiClient.put<ApiResponse<Category>>(
      `${API_CONFIG.CATEGORIES.ADMIN_BASE}/${id}`,
      data
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update category')
    }

    const result: ApiResponse<Category> = await response.json()
    return result.data
  },

  // Admin: Delete category
  deleteCategory: async (id: number): Promise<void> => {
    const response = await apiClient.delete(`${API_CONFIG.CATEGORIES.ADMIN_BASE}/${id}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to delete category')
    }
  },
}
