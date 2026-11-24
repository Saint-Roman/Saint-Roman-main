import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
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

interface Testimonial {
  id: string
  quote: string
  author_name: string
  author_role: string | null
  author_image_url: string | null
  rating: number
  sort_order: number
  is_active: boolean
}

export function TestimonialsPage() {
  const { data, loading, error, refetch } = useApiResource<{ testimonials: Testimonial[] }>('/testimonials')

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [quote, setQuote] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [authorRole, setAuthorRole] = useState('')
  const [authorImageUrl, setAuthorImageUrl] = useState('')
  const [rating, setRating] = useState('5')
  const [sortOrder, setSortOrder] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setEditingId(null)
    setQuote('')
    setAuthorName('')
    setAuthorRole('')
    setAuthorImageUrl('')
    setRating('5')
    setSortOrder('0')
    setIsActive(true)
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  function handleEdit(testimonial: Testimonial) {
    setEditingId(testimonial.id)
    setQuote(testimonial.quote)
    setAuthorName(testimonial.author_name)
    setAuthorRole(testimonial.author_role ?? '')
    setAuthorImageUrl(testimonial.author_image_url ?? '')
    setRating(String(testimonial.rating))
    setSortOrder(String(testimonial.sort_order))
    setIsActive(testimonial.is_active)
    setOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        quote,
        author_name: authorName,
        author_role: authorRole || null,
        author_image_url: authorImageUrl || null,
        rating: Number(rating) || 0,
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
      }
      if (editingId) {
        await apiFetch(`/testimonials/${editingId}`, { method: 'PUT', body: JSON.stringify(body) })
        toast.success('Testimonial updated')
      } else {
        await apiFetch('/testimonials', { method: 'POST', body: JSON.stringify(body) })
        toast.success('Testimonial created')
      }
      setOpen(false)
      resetForm()
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save testimonial')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(testimonial: Testimonial) {
    try {
      await apiFetch(`/testimonials/${testimonial.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !testimonial.is_active }),
      })
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update testimonial')
    }
  }

  async function handleDelete(id: string, authorName: string) {
    if (!window.confirm(`Delete the testimonial from "${authorName}"? This can't be undone.`)) return
    try {
      await apiFetch(`/testimonials/${id}`, { method: 'DELETE' })
      toast.success('Testimonial deleted')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete testimonial')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Testimonials</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button>New testimonial</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit testimonial' : 'New testimonial'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="t-quote">Quote</Label>
                <Textarea
                  id="t-quote"
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  rows={3}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="t-author">Author name</Label>
                <Input id="t-author" value={authorName} onChange={(e) => setAuthorName(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="t-role">Author role</Label>
                <Input
                  id="t-role"
                  value={authorRole}
                  onChange={(e) => setAuthorRole(e.target.value)}
                  placeholder="Art Director"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Author image</Label>
                <ImageUpload value={authorImageUrl} onChange={setAuthorImageUrl} folder="saint-roman/testimonials" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="t-rating">Rating (out of 5)</Label>
                  <Input
                    id="t-rating"
                    type="number"
                    min={0}
                    max={5}
                    step="0.1"
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="t-sort">Sort order</Label>
                  <Input id="t-sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="t-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <Label htmlFor="t-active">Active (shown on the storefront)</Label>
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
      {error && <p className="text-sm text-destructive">Couldn't load testimonials.</p>}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Quote</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Sort</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.testimonials.map((testimonial) => (
              <TableRow key={testimonial.id}>
                <TableCell>
                  {testimonial.author_image_url ? (
                    <img src={testimonial.author_image_url} alt="" className="h-10 w-10 rounded-full border object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full border bg-muted" />
                  )}
                </TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">{testimonial.quote}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{testimonial.author_name}</span>
                    {testimonial.author_role && (
                      <span className="text-xs text-muted-foreground">{testimonial.author_role}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>{testimonial.rating}</TableCell>
                <TableCell className="text-muted-foreground">{testimonial.sort_order}</TableCell>
                <TableCell>
                  <Badge variant={testimonial.is_active ? 'default' : 'secondary'}>
                    {testimonial.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(testimonial)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleToggleActive(testimonial)}>
                    {testimonial.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(testimonial.id, testimonial.author_name)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
