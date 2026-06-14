'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Badge } from '@/shared/components/ui/badge'
import { ImageWithFallback } from '@/shared/components/ImageWithFallback'
import { postService, PostRequest } from '@/modules/posts/services/postService'
import { categoryService, Category } from '@/modules/categories/services/categoryService'
import { toast } from '@/shared/utils/toast'
import { Save, X, ChevronDown, Plus } from 'lucide-react'
import { API_CONFIG } from '@/shared/config/api.config'

const Editor = dynamic<any>(
  () => import('@tinymce/tinymce-react').then((mod) => mod.Editor as any),
  { ssr: false, loading: () => <div className="text-sm text-muted-foreground">Loading editor...</div> }
)

// Helper function to construct proper image URL
const getImageUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const normalizedPath = url.replace(/\\/g, '/')
  const path = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`
  return `${API_CONFIG.ASSET_BASE_URL}${path}`
}

interface PostEditorPageProps {
  postId?: number
}

export function PostEditorPage({ postId }: PostEditorPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<PostRequest>({
    title: '',
    content: '',
    categoryIds: [],
    thumbnailUrl: '',
    thumbnailPublicId: '',
    isPublished: false,
  })
  const [availableCategories, setAvailableCategories] = useState<Category[]>([])
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<any>(null)

  const handleImageUpload = async (blobInfo: any, _progress: any) => {
    try {
      const url = await postService.uploadImage(blobInfo.blob())
      return url
    } catch (error) {
      console.error('Image upload failed:', error)
      throw error
    }
  }

  useEffect(() => {
    loadCategories()
    if (postId) {
      loadPost(postId)
    }
  }, [postId])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const loadCategories = async () => {
    try {
      const cats = await categoryService.getAllCategories()
      setAvailableCategories(cats)
    } catch (error) {
      console.error('Error loading categories:', error)
    }
  }

  const loadPost = async (id: number) => {
    try {
      setLoading(true)
      const post = await postService.getPostById(id)
      setFormData({
        title: post.title,
        content: post.content,
        categoryIds: post.categories?.map(cat => cat.id) || [],
        thumbnailUrl: post.thumbnailUrl || '',
        thumbnailPublicId: post.thumbnailPublicId || '',
        isPublished: post.isPublished,
      })
    } catch (error) {
      console.error('Error loading post:', error)
      toast.error("Failed to load post data")
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = (categoryId: number) => {
    if (!formData.categoryIds?.includes(categoryId)) {
      setFormData({
        ...formData,
        categoryIds: [...(formData.categoryIds || []), categoryId]
      })
    }
    setCategoryDropdownOpen(false)
  }

  const handleRemoveCategory = (categoryId: number) => {
    setFormData({
      ...formData,
      categoryIds: formData.categoryIds?.filter(id => id !== categoryId) || []
    })
  }

  const availableCategoriesFiltered = availableCategories.filter(
    cat => !formData.categoryIds?.includes(cat.id)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (postId) {
        // Update existing post
        await postService.updatePost(postId, formData)
        toast.success("Post updated successfully! Returning to posts...")
      } else {
        // Create new post as draft first to get ID
        const newPost = await postService.createPost({
          ...formData,
          isPublished: false // Force draft on creation
        })
        toast.success("Post created successfully! Returning to posts...")
      }

      setTimeout(() => {
        router.push('/content/posts')
      }, 600)
    } catch (error: any) {
      console.error('Error saving post:', error)
      toast.error(error.message || "Failed to save post")
      setLoading(false)
    }
  }

  if (loading && postId && !formData.title) {
    return <div className="px-8 pb-8 pt-32 text-center">Loading post data...</div>
  }

  return (
    <div className="min-h-screen bg-muted px-8 pb-8 pt-32">
      <div className="max-w-5xl mx-auto bg-card rounded-lg shadow-lg overflow-hidden">
        <div className="bg-primary px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">
            {postId ? 'Edit Post' : 'Create New Post'}
          </h1>
          <Button 
            variant="ghost" 
            className="text-primary-foreground hover:bg-primary/90 cursor-pointer"
            onClick={() => router.push('/content/posts')}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    maxLength={500}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Categories</Label>
                  <div className="mt-1 grid grid-cols-2 gap-4">
                    {/* Left Column: Add Category Dropdown */}
                    <div className="relative" ref={categoryDropdownRef}>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                        className="w-full justify-between cursor-pointer"
                      >
                        <span className="text-sm text-muted-foreground">Select category...</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      
                      {categoryDropdownOpen && (
                        <div className="absolute z-50 mt-2 w-full bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                          {availableCategoriesFiltered.length === 0 ? (
                            <div className="p-3 text-sm text-muted-foreground text-center">
                              {availableCategories.length === 0 
                                ? 'No categories available. Create categories first.'
                                : 'All categories selected'
                              }
                            </div>
                          ) : (
                            <div className="py-1">
                              {availableCategoriesFiltered.map((cat) => (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => handleAddCategory(cat.id)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-muted flex items-center gap-2 cursor-pointer"
                                >
                                  <Plus className="h-4 w-4" />
                                  {cat.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Column: Selected Categories */}
                    <div className="flex flex-wrap gap-2 content-start">
                      {formData.categoryIds?.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No categories selected</p>
                      ) : (
                        formData.categoryIds?.map((categoryId) => {
                          const category = availableCategories.find(c => c.id === categoryId)
                          return category ? (
                            <Badge 
                              key={categoryId} 
                              variant="secondary"
                              className="cursor-pointer hover:bg-red-100"
                              onClick={() => handleRemoveCategory(categoryId)}
                            >
                              {category.name} ×
                            </Badge>
                          ) : null
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
                  <Input
                    id="thumbnailUrl"
                    value={formData.thumbnailUrl}
                    onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                    placeholder="https://..."
                    className="mt-1"
                  />
                  {formData.thumbnailUrl && (
                    <div className="mt-3">
                      <Label className="text-sm text-muted-foreground mb-2 block">Preview:</Label>
                      <div className="relative rounded-lg overflow-hidden border bg-muted aspect-video max-w-md">
                        <ImageWithFallback
                          src={getImageUrl(formData.thumbnailUrl)}
                          alt="Thumbnail preview"
                          width={800}
                          height={450}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Content *</Label>
              <div className="border rounded-md overflow-hidden">
                <Editor
                  tinymceScriptSrc="/tinymce/tinymce.min.js"
                  licenseKey='gpl'
                  onInit={(_evt: any, editor: any) => (editorRef.current = editor)}
                  value={formData.content}
                  onEditorChange={(content: string) => setFormData({ ...formData, content })}
                  init={{
                    height: 600,
                    menubar: true,
                    plugins: [
                      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                      'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount', 'image'
                    ],
                    toolbar: 'undo redo | blocks | ' +
                      'bold italic forecolor backcolor | alignleft aligncenter ' +
                      'alignright alignjustify | bullist numlist outdent indent | ' +
                      'link image media table | removeformat | help',
                    content_style: `
                      body { font-family:Helvetica,Arial,sans-serif; font-size:14px }
                      figure { margin: 1.5rem 0; text-align: center; }
                      figure img { margin: 0; display: inline-block; max-width: 100%; }
                      figcaption { margin-top: 0.75rem; font-size: 0.875rem; color: hsl(var(--muted-foreground)); font-style: italic; }
                    `,
                    branding: false,
                    promotion: false,
                    images_upload_handler: handleImageUpload,
                    image_caption: true,
                    image_title: true,
                    image_description: false
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                  className="h-5 w-5 text-primary rounded focus:ring-ring"
                />
                <Label htmlFor="isPublished" className="cursor-pointer text-base">
                  Publish immediately
                </Label>
              </div>

              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/content/posts')}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="min-w-[120px] cursor-pointer disabled:cursor-not-allowed">
                  {loading ? 'Saving...' : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      {postId ? 'Update Post' : 'Create Post'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
