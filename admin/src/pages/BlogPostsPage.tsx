import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApiResource } from '@/hooks/useSupabase'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { ImageUpload } from '@/components/shared/ImageUpload'

interface Post {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string | null
  featured_image_url: string | null
  status: 'draft' | 'published'
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function BlogPostsPage() {
  const { data, loading, error, refetch } = useApiResource<{ posts: Post[] }>('/cms/posts')

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [featuredImage, setFeaturedImage] = useState('')
  const [status, setStatus] = useState<'draft' | 'published'>('draft')
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setExcerpt('')
    setContent('')
    setFeaturedImage('')
    setStatus('draft')
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  function handleEdit(post: Post) {
    setEditingId(post.id)
    setTitle(post.title)
    setExcerpt(post.excerpt ?? '')
    setContent(post.content ?? '')
    setFeaturedImage(post.featured_image_url ?? '')
    setStatus(post.status)
    setOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = { title, slug: slugify(title), excerpt, content, featured_image_url: featuredImage || null, status }
      if (editingId) {
        await apiFetch(`/cms/posts/${editingId}`, { method: 'PUT', body: JSON.stringify(body) })
        toast.success('Post updated')
      } else {
        await apiFetch('/cms/posts', { method: 'POST', body: JSON.stringify(body) })
        toast.success('Post created')
      }
      setOpen(false)
      resetForm()
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save post')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return
    try {
      await apiFetch(`/cms/posts/${id}`, { method: 'DELETE' })
      toast.success('Post deleted')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete post')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Blog Posts</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button>New post</Button>} />
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit post' : 'New post'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="b-title">Title</Label>
                <Input id="b-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Featured Image</Label>
                <ImageUpload value={featuredImage} onChange={setFeaturedImage} folder="saint-roman/blog" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="b-excerpt">Excerpt</Label>
                <Textarea id="b-excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="b-content">Content</Label>
                <Textarea
                  id="b-content"
                  className="min-h-32"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(value) => setStatus((value as 'draft' | 'published') ?? 'draft')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <p className="text-sm text-destructive">
          Couldn't load posts — connect Supabase and run the Phase 3 CMS schema to enable this.
        </p>
      )}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell>
                  {post.featured_image_url ? (
                    <img src={post.featured_image_url} alt="" className="h-10 w-10 rounded border object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded border bg-muted" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{post.title}</TableCell>
                <TableCell className="text-muted-foreground">{post.slug}</TableCell>
                <TableCell>
                  <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>{post.status}</Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(post)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(post.id, post.title)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data.posts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No posts yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
