import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
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
import { postService, Post } from '@/modules/posts/services/postService'
import { toast } from '@/shared/utils/toast'
import { Pencil, Trash2, Eye, EyeOff, Plus, BookOpen, MoreVertical } from 'lucide-react'

export function ManagePosts() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; post: Post | null }>({
    isOpen: false,
    post: null,
  })

  useEffect(() => {
    loadPosts()

    const handleFocus = () => {
      loadPosts()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  const loadPosts = async () => {
    try {
      setLoading(true)
      const data = await postService.getAllPosts()
      const sortedByIdAsc = [...data].sort((a, b) => a.id - b.id)
      setPosts(sortedByIdAsc)
    } catch (error) {
      console.error('Error loading posts:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load posts'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenEditor = (post?: Post) => {
    // Navigate in same tab
    const url = post 
      ? `/content/posts/${post.id}/edit`
      : '/content/posts/new'
    router.push(url)
  }

  const handleTogglePublish = async (post: Post) => {
    try {
      if (post.isPublished) {
        await postService.unpublishPost(post.id)
        toast.success("Post unpublished successfully")
      } else {
        await postService.publishPost(post.id)
        toast.success("Post published successfully")
      }
      
      loadPosts()
    } catch (error) {
      console.error('Error toggling publish status:', error)
      toast.error("Failed to update publish status")
    }
  }

  const handleDelete = async (post: Post) => {
    setDeleteDialog({ isOpen: true, post })
  }

  const confirmDelete = async () => {
    if (!deleteDialog.post) return

    try {
      await postService.deletePost(deleteDialog.post.id)
      toast.success("Post deleted successfully")
      loadPosts()
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error("Failed to delete post")
    } finally {
      setDeleteDialog({ isOpen: false, post: null })
    }
  }

  const handlePreview = (post: Post) => {
    const url = `/insights/${post.id}`
    router.push(url)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="bg-card border rounded-lg p-6">
      <div className="mb-6 flex items-center justify-end border-b border-border/50 pb-4">
        <Button onClick={() => handleOpenEditor()} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />
          Create Post
        </Button>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="p-12 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No posts found. Create your first post!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium">ID</th>
                <th className="text-left py-3 px-4 font-medium">Title</th>
                <th className="text-left py-3 px-4 font-medium">Categories</th>
                <th className="text-left py-3 px-4 font-medium">Updated At</th>
                <th className="text-left py-3 px-4 font-medium">Status</th>
                <th className="text-right py-3 px-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b hover:bg-muted/20">
                  <td className="py-3 px-4">{post.id}</td>
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-medium truncate">{post.title}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {post.categories && post.categories.length > 0 ? (
                        post.categories.map((cat) => (
                          <Badge key={cat.id} variant="outline">{cat.name}</Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No categories</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {formatDate(post.updatedAt)}
                  </td>
                  <td className="py-3 px-4">
                    <Badge 
                      variant={post.isPublished ? "default" : "secondary"}
                      className="cursor-pointer hover-primary-effect"
                      onClick={() => handleTogglePublish(post)}
                    >
                      {post.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handlePreview(post)}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOpenEditor(post)}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(post)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={deleteDialog.isOpen} onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, post: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete post "<strong>{deleteDialog.post?.title}</strong>"? 
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
