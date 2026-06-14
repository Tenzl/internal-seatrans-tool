import { apiClient } from '@/shared/utils/apiClient'
import { API_CONFIG } from '@/shared/config/api.config'
import type { ApiResponse } from '@/shared/types/api.types'

export interface CategoryResponse {
  id: number
  name: string
  description?: string
  createdAt?: string
}

export interface Post {
  id: number
  title: string
  content: string
  summary?: string
  authorId: number
  authorName: string
  author?: { fullName?: string }
  categories: CategoryResponse[]
  tags?: string[]
  readingTime?: number
  thumbnailUrl?: string
  thumbnailPublicId?: string
  publishedAt?: string
  isPublished: boolean
  viewCount: number
  createdAt: string
  updatedAt: string
}

export interface PostRequest {
  title: string
  content: string
  categoryIds?: number[]
  thumbnailUrl?: string
  thumbnailPublicId?: string
  isPublished?: boolean
}

const mapPost = (raw: any): Post => {
  const words = typeof raw?.content === 'string' ? raw.content.split(/\s+/).length : 0
  const readingTime = raw?.readingTime ?? Math.max(1, Math.round(words / 200))
  return {
    ...raw,
    categories: Array.isArray(raw?.categories) ? raw.categories : [],
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    summary: raw?.summary ?? '',
    author: { fullName: raw?.authorFullName || raw?.authorName },
    readingTime,
  }
}

const viewRecordInflight = new Map<number, Promise<number>>()

async function requestRecordPostView(id: number): Promise<number> {
  const response = await apiClient.post<ApiResponse<{ viewCount: number }>>(
    API_CONFIG.POSTS.PUBLIC_RECORD_VIEW(id),
    {},
    { skipAuth: true },
  )

  if (!response.ok) {
    throw new Error('Failed to record post view')
  }

  const result: ApiResponse<{ viewCount: number }> = await response.json()
  return result.data?.viewCount ?? 0
}

export const postService = {
  // Admin endpoints
  getAllPosts: async (): Promise<Post[]> => {
    const response = await apiClient.get<ApiResponse<Post[]>>(
      `${API_CONFIG.POSTS.ADMIN_BASE}?limit=100`,
    )
    const result = await response.json()
    return Array.isArray(result.data) ? result.data.map(mapPost) : []
  },

  getPostById: async (id: number): Promise<Post> => {
    const response = await apiClient.get<ApiResponse<Post>>(API_CONFIG.POSTS.ADMIN_BY_ID(id))
    const result = await response.json()
    return mapPost(result.data)
  },

  createPost: async (postData: PostRequest): Promise<Post> => {
    const response = await apiClient.post<ApiResponse<Post>>(API_CONFIG.POSTS.ADMIN_BASE, postData)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create post')
    }

    const result: ApiResponse<Post> = await response.json()
    return mapPost(result.data)
  },

  updatePost: async (id: number, postData: PostRequest): Promise<Post> => {
    const response = await apiClient.put<ApiResponse<Post>>(API_CONFIG.POSTS.ADMIN_BY_ID(id), postData)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update post')
    }

    const result: ApiResponse<Post> = await response.json()
    return mapPost(result.data)
  },

  deletePost: async (id: number): Promise<void> => {
    const response = await apiClient.delete(API_CONFIG.POSTS.ADMIN_BY_ID(id))

    if (!response.ok) {
      throw new Error('Failed to delete post')
    }
  },

  publishPost: async (id: number): Promise<Post> => {
    const existing = await postService.getPostById(id)
    return postService.updatePost(id, {
      title: existing.title,
      content: existing.content,
      categoryIds: existing.categories.map((c) => c.id),
      thumbnailUrl: existing.thumbnailUrl,
      thumbnailPublicId: existing.thumbnailPublicId,
      isPublished: true,
    })
  },

  unpublishPost: async (id: number): Promise<Post> => {
    const existing = await postService.getPostById(id)
    return postService.updatePost(id, {
      title: existing.title,
      content: existing.content,
      categoryIds: existing.categories.map((c) => c.id),
      thumbnailUrl: existing.thumbnailUrl,
      thumbnailPublicId: existing.thumbnailPublicId,
      isPublished: false,
    })
  },

  getPublishedPosts: async (category?: string, search?: string): Promise<Post[]> => {
    const params = new URLSearchParams()
    params.set('page', '0')
    params.set('size', '100')
    if (category) params.append('category', category)
    if (search) params.append('q', search)

    const url = `${API_CONFIG.POSTS.PUBLIC_BASE}?${params.toString()}`
    const response = await apiClient.get<
      ApiResponse<{ content?: Post[]; items?: Post[] }>
    >(url, { skipAuth: true })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to fetch posts:', errorText)
      throw new Error(`Failed to fetch published posts: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()

    if (!result.success || !result.data) {
      throw new Error(result.message || 'Invalid response from server')
    }

    const rows = result.data.content ?? []
    return Array.isArray(rows) ? rows.map(mapPost) : []
  },

  getPublicPostById: async (id: number): Promise<Post> => {
    const response = await apiClient.get<ApiResponse<Post>>(API_CONFIG.POSTS.PUBLIC_BY_ID(id), { skipAuth: true })

    if (!response.ok) {
      throw new Error('Failed to fetch post')
    }

    const result: ApiResponse<Post> = await response.json()
    return mapPost(result.data)
  },

  recordPostView: requestRecordPostView,

  recordPostViewOnce(id: number): Promise<number> {
    const existing = viewRecordInflight.get(id)
    if (existing) return existing

    const request = requestRecordPostView(id).finally(() => {
      viewRecordInflight.delete(id)
    })

    viewRecordInflight.set(id, request)
    return request
  },

  // alias for clarity with ArticleDetailPage
  getById: async (id: number): Promise<Post> => {
    return postService.getPublicPostById(id)
  },

  getLatestPosts: async (limit: number = 5): Promise<Post[]> => {
    const response = await apiClient.get<ApiResponse<Post[]>>(
      `${API_CONFIG.POSTS.LATEST}?limit=${limit}`,
      { skipAuth: true }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch latest posts')
    }

    const result: ApiResponse<Post[]> = await response.json()
    return Array.isArray(result.data) ? result.data.map(mapPost) : []
  },

  /** Inline base64 for TinyMCE when no post upload API exists on backend2.0 */
  uploadImage: async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read image file'))
      reader.readAsDataURL(file)
    })
  },
}
