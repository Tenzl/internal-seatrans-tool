import { useState, useEffect } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Textarea } from '@/shared/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog'
import { categoryService, Category, CategoryRequest } from '@/modules/categories/services/categoryService'
import { Pencil, Trash2, Plus, Tag } from 'lucide-react'

export function ManageCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; category: Category | null }>({
    isOpen: false,
    category: null,
  })
  const [formData, setFormData] = useState<CategoryRequest>({
    name: '',
    slug: '',
    description: '',
  })

  useEffect(() => {
    loadCategories()
  }, [])

  // Auto-generate slug from name
  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')      // Replace spaces with hyphens
      .replace(/-+/g, '-')       // Remove consecutive hyphens
  }

  // Capitalize first letter of each word
  const capitalizeWords = (text: string): string => {
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const loadCategories = async () => {
    try {
      setLoading(true)
      setErrorMessage(null)
      const data = await categoryService.getAdminCategories()
      setCategories(data)
      
      // Show info message if no categories loaded from backend
      if (data.length === 0) {
        console.log('No categories loaded. Backend endpoints may not be implemented yet.')
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      // Don't show error to user, just use empty list
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingId) {
        await categoryService.updateCategory(editingId, formData)
        setSuccessMessage('Category updated successfully')
      } else {
        await categoryService.createCategory(formData)
        setSuccessMessage('Category created successfully')
      }
      
      resetForm()
      loadCategories()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error: any) {
      console.error('Error saving category:', error)
      setErrorMessage(error.message || 'Failed to save category')
      setTimeout(() => setErrorMessage(null), 3000)
    }
  }

  const handleEdit = (category: Category) => {
    setIsEditing(true)
    setEditingId(category.id)
    setFormData({
      name: category.name,
      slug: generateSlug(category.name),
      description: category.description || '',
    })
  }

  const handleDelete = (category: Category) => {
    setDeleteDialog({ isOpen: true, category })
  }

  const confirmDelete = async () => {
    if (!deleteDialog.category) return

    try {
      await categoryService.deleteCategory(deleteDialog.category.id)
      setSuccessMessage('Category deleted successfully')
      loadCategories()
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (error: any) {
      console.error('Error deleting category:', error)
      // Check if error is due to foreign key constraint
      if (error.message && (error.message.includes('foreign key constraint') || error.message.includes('Cannot delete or update a parent row'))) {
        setErrorMessage(`Cannot delete "${deleteDialog.category.name}" - this category is being used by one or more posts. Please remove it from posts first.`)
      } else {
        setErrorMessage(error.message || 'Failed to delete category')
      }
      setTimeout(() => setErrorMessage(null), 5000)
    } finally {
      setDeleteDialog({ isOpen: false, category: null })
    }
  }

  const resetForm = () => {
    setIsEditing(false)
    setEditingId(null)
    setFormData({ name: '', slug: '', description: '' })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="bg-card border rounded-lg p-6">
      {/* Create/Edit Form */}
      <div className="mb-6 p-4 border rounded-lg bg-muted/20">
        <h3 className="font-medium mb-4">
          {isEditing ? 'Edit Category' : 'Create New Category'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Category Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => {
                const newName = capitalizeWords(e.target.value)
                setFormData({ 
                  ...formData, 
                  name: newName,
                  slug: generateSlug(newName)
                })
              }}
              required
              maxLength={100}
              placeholder="e.g., Industry News, Company Updates"
              className="mt-1"
            />
            {formData.slug && (
              <p className="text-xs text-muted-foreground mt-1">
                Slug: <span className="font-mono">{formData.slug}</span>
              </p>
            )}
          </div>
          
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              maxLength={500}
              placeholder="Optional description for this category"
              className="mt-1"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="cursor-pointer">
              {isEditing ? 'Update Category' : 'Create Category'}
            </Button>
            {isEditing && (
              <Button type="button" variant="outline" onClick={resetForm} className="cursor-pointer">
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Categories List */}
      {loading ? (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="p-12 text-center">
          <Tag className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No categories found. Create your first category!</p>
        </div>
      ) : (
        <div>
          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mb-4 p-4 bg-success/10 border-2 border-success text-success rounded-lg flex items-center justify-between">
              <span className="font-medium">{successMessage}</span>
              <button onClick={() => setSuccessMessage(null)} className="cursor-pointer">
                <Plus className="h-4 w-4 rotate-45" />
              </button>
            </div>
          )}
          
          {errorMessage && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-500 text-red-800 rounded-lg flex items-center justify-between">
              <span className="font-medium">{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="cursor-pointer">
                <Plus className="h-4 w-4 rotate-45" />
              </button>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">ID</th>
                  <th className="text-left py-3 px-4 font-medium">Name</th>
                <th className="text-left py-3 px-4 font-medium">Description</th>
                <th className="text-left py-3 px-4 font-medium">Created At</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b hover:bg-muted/20">
                  <td className="py-3 px-4">{category.id}</td>
                  <td className="py-3 px-4 font-medium">{category.name}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground max-w-md">
                    {category.description || '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {formatDate(category.createdAt)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        className="text-primary hover:text-primary/90 hover:bg-primary/10 transition-all hover:scale-110 cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 transition-all hover:scale-110 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, category: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete category "<strong>{deleteDialog.category?.name}</strong>"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
