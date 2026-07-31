import type { CategoryRequest } from '@/modules/categories/services/categoryService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface CategoryFormProps {
  formData: CategoryRequest
  isEditing: boolean
  onNameChange: (name: string) => void
  onDescriptionChange: (description: string) => void
  onSubmit: () => void
  onCancel: () => void
}

export function CategoryForm({
  formData,
  isEditing,
  onNameChange,
  onDescriptionChange,
  onSubmit,
  onCancel,
}: CategoryFormProps) {
  return (
    <div className='rounded-lg border bg-muted/20 p-4'>
      <h3 className='mb-4 font-medium'>
        {isEditing ? 'Edit Category' : 'Create New Category'}
      </h3>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
        className='space-y-4'
      >
        <div>
          <Label htmlFor='name'>Category Name *</Label>
          <Input
            id='name'
            value={formData.name}
            onChange={(event) => onNameChange(event.target.value)}
            required
            maxLength={100}
            placeholder='e.g., Industry News, Company Updates'
            className='mt-1'
          />
          {formData.slug && (
            <p className='mt-1 text-xs text-muted-foreground'>
              Slug: <span className='font-mono'>{formData.slug}</span>
            </p>
          )}
        </div>

        <div>
          <Label htmlFor='description'>Description</Label>
          <Textarea
            id='description'
            value={formData.description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder='Optional description for this category'
            className='mt-1'
          />
        </div>

        <div className='flex gap-2'>
          <Button type='submit' className='cursor-pointer'>
            {isEditing ? 'Update Category' : 'Create Category'}
          </Button>
          {isEditing && (
            <Button
              type='button'
              variant='outline'
              onClick={onCancel}
              className='cursor-pointer'
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
