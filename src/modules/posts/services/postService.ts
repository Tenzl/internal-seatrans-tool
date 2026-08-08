import { API_CONFIG } from '@/shared/config/api.config'
import type { ApiResponse } from '@/shared/types/api.types'
import { apiClient } from '@/shared/utils/apiClient'

export interface CategoryResponse {
  id: number
  name: string
  description?: string
  createdAt?: string
}

export interface PostListItem {
  id: number
  title: string
  content?: string
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

export interface PostsPage {
  content: PostListItem[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

type PostApiDto = PostListItem & { authorFullName?: string }

const mapPost = (raw: PostApiDto): PostListItem => {
  const words =
    typeof raw?.content === 'string' && raw.content.length > 0
      ? raw.content.split(/\s+/).length
      : 0
  const readingTime =
    raw?.readingTime ?? (words > 0 ? Math.max(1, Math.round(words / 200)) : 1)
  return {
    ...raw,
    // List projection omits HTML body; keep empty string so callers never parse full content.
    content: typeof raw?.content === 'string' ? raw.content : '',
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
    { skipAuth: true }
  )

  if (!response.ok) {
    throw new Error('Failed to record post view')
  }

  const result: ApiResponse<{ viewCount: number }> = await response.json()
  return result.data?.viewCount ?? 0
}

export const ADMIN_POSTS_PAGE_SIZE = 10
export const ADMIN_POSTS_QUERY_ROOT = ['adminPosts'] as const

export const postService = {
  // Admin endpoints — list projection (no full HTML content from backend).
  /** @deprecated Prefer getAdminPostsPage (server page/size/q). */
  getAllPosts: async (signal?: AbortSignal): Promise<PostListItem[]> => {
    const page = await postService.getAdminPostsPage(
      { page: 0, size: 100 },
      signal
    )
    return page.content
  },

  /**
   * Server-paginated admin list (page/size/q). List projection omits HTML body.
   */
  getAdminPostsPage: async (
    params: { page: number; size: number; q?: string },
    signal?: AbortSignal
  ): Promise<PostsPage> => {
    const sp = new URLSearchParams()
    sp.set("page", String(Math.max(0, params.page)))
    sp.set("size", String(Math.max(1, params.size)))
    if (params.q?.trim()) sp.set("q", params.q.trim())

    const response = await apiClient.get<
      ApiResponse<PostsPage & { page?: number }>
    >(`${API_CONFIG.POSTS.ADMIN_BASE}?${sp.toString()}`, { signal })
    if (!response.ok) {
      throw new Error('Failed to fetch posts')
    }
    const result: ApiResponse<PostsPage & { page?: number }> =
      await response.json()
    const data = result.data
    if (!data || !Array.isArray(data.content)) {
      return {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: params.size,
        number: params.page,
      }
    }
    return {
      content: data.content.map((row) => mapPost(row as PostApiDto)),
      totalElements: data.totalElements ?? data.content.length,
      totalPages:
        data.totalPages ??
        (data.content.length === 0
          ? 0
          : Math.ceil(
              (data.totalElements ?? data.content.length) / params.size
            )),
      size: data.size ?? params.size,
      number: data.number ?? data.page ?? params.page,
    }
  },

  getPostById: async (id: number): Promise<PostListItem> => {
    const response = await apiClient.get<ApiResponse<PostApiDto>>(
      API_CONFIG.POSTS.ADMIN_BY_ID(id)
    )
    const result = await response.json()
    return mapPost(result.data)
  },

  createPost: async (postData: PostRequest): Promise<PostListItem> => {
    const response = await apiClient.post<ApiResponse<PostApiDto>>(
      API_CONFIG.POSTS.ADMIN_BASE,
      postData
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to create post')
    }

    const result: ApiResponse<PostApiDto> = await response.json()
    return mapPost(result.data)
  },

  updatePost: async (
    id: number,
    postData: PostRequest
  ): Promise<PostListItem> => {
    const response = await apiClient.put<ApiResponse<PostApiDto>>(
      API_CONFIG.POSTS.ADMIN_BY_ID(id),
      postData
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to update post')
    }

    const result: ApiResponse<PostApiDto> = await response.json()
    return mapPost(result.data)
  },

  deletePost: async (id: number): Promise<void> => {
    const response = await apiClient.delete(API_CONFIG.POSTS.ADMIN_BY_ID(id))

    if (!response.ok) {
      throw new Error('Failed to delete post')
    }
  },

  publishPost: async (id: number): Promise<PostListItem> => {
    const existing = await postService.getPostById(id)
    return postService.updatePost(id, {
      title: existing.title,
      content: existing.content ?? '',
      categoryIds: existing.categories.map((c) => c.id),
      thumbnailUrl: existing.thumbnailUrl,
      thumbnailPublicId: existing.thumbnailPublicId,
      isPublished: true,
    })
  },

  unpublishPost: async (id: number): Promise<PostListItem> => {
    const existing = await postService.getPostById(id)
    return postService.updatePost(id, {
      title: existing.title,
      content: existing.content ?? '',
      categoryIds: existing.categories.map((c) => c.id),
      thumbnailUrl: existing.thumbnailUrl,
      thumbnailPublicId: existing.thumbnailPublicId,
      isPublished: false,
    })
  },

  getPublishedPosts: async (
    category?: string,
    search?: string,
    signal?: AbortSignal
  ): Promise<PostListItem[]> => {
    const params = new URLSearchParams()
    params.set('page', '0')
    params.set('size', '100')
    if (category) params.append('category', category)
    if (search) params.append('q', search)

    const url = `${API_CONFIG.POSTS.PUBLIC_BASE}?${params.toString()}`
    const response = await apiClient.get<
      ApiResponse<{ content?: PostApiDto[]; items?: PostApiDto[] }>
    >(url, { skipAuth: true, signal })

    if (!response.ok) {
      throw new Error(
        `Failed to fetch published posts: ${response.status} ${response.statusText}`
      )
    }

    const result = await response.json()

    if (!result.success || !result.data) {
      throw new Error(result.message || 'Invalid response from server')
    }

    const rows = result.data.content ?? []
    return Array.isArray(rows) ? rows.map(mapPost) : []
  },

  getPublicPostById: async (id: number): Promise<PostListItem> => {
    const response = await apiClient.get<ApiResponse<PostApiDto>>(
      API_CONFIG.POSTS.PUBLIC_BY_ID(id),
      { skipAuth: true }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch post')
    }

    const result: ApiResponse<PostApiDto> = await response.json()
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
  getById: async (id: number): Promise<PostListItem> => {
    return postService.getPublicPostById(id)
  },

  getLatestPosts: async (limit: number = 5): Promise<PostListItem[]> => {
    const response = await apiClient.get<ApiResponse<PostApiDto[]>>(
      `${API_CONFIG.POSTS.LATEST}?limit=${limit}`,
      { skipAuth: true }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch latest posts')
    }

    const result: ApiResponse<PostApiDto[]> = await response.json()
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
