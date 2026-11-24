import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Banner {
  id: string
  title: string
  subtitle: string | null
  link_url: string | null
  image_url: string | null
  sort_order: number
  is_active: boolean
  placement: string
  badge_text: string | null
}

const PLACEMENT_OPTIONS = [
  { value: 'products_hero', label: 'Products Hero' },
  { value: 'homepage_offer', label: 'Best Offers' },
  { value: 'homepage_promo', label: 'Promo Banners' },
  { value: 'homepage_hero', label: 'Hero Slider' },
  { value: 'homepage_collection', label: 'Collections' },
]

export function BannersPage() {
  const { data, loading, error, refetch } = useApiResource<{ banners: Banner[] }>('/banners')

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [placement, setPlacement] = useState('products_hero')
  const [badgeText, setBadgeText] = useState('')
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setSubtitle('')
    setLinkUrl('')
    setImageUrl('')
    setSortOrder('0')
    setPlacement('products_hero')
    setBadgeText('')
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  function handleEdit(banner: Banner) {
    setEditingId(banner.id)
    setTitle(banner.title)
    setSubtitle(banner.subtitle ?? '')
    setLinkUrl(banner.link_url ?? '')
    setImageUrl(banner.image_url ?? '')
    setSortOrder(String(banner.sort_order))
    setPlacement(banner.placement || 'products_hero')
    setBadgeText(banner.badge_text ?? '')
    setOpen(true)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        title,
        subtitle,
        link_url: linkUrl,
        image_url: imageUrl || null,
        sort_order: Number(sortOrder) || 0,
        placement,
        badge_text: badgeText || null,
      }
      if (editingId) {
        await apiFetch(`/banners/${editingId}`, { method: 'PUT', body: JSON.stringify(body) })
        toast.success('Banner updated')
      } else {
        await apiFetch('/banners', { method: 'POST', body: JSON.stringify(body) })
        toast.success('Banner created')
      }
      setOpen(false)
      resetForm()
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save banner')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(banner: Banner) {
    try {
      await apiFetch(`/banners/${banner.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !banner.is_active }),
      })
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update banner')
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return
    try {
      await apiFetch(`/banners/${id}`, { method: 'DELETE' })
      toast.success('Banner deleted')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete banner')
    }
  }

  function placementLabel(value: string) {
    return PLACEMENT_OPTIONS.find((o) => o.value === value)?.label ?? value
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Banners</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button>New banner</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit banner' : 'New banner'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="b-title">Title</Label>
                <Input id="b-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="b-subtitle">Subtitle</Label>
                <Input id="b-subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="b-placement">Show on</Label>
                <Select
                  value={placement}
                  onValueChange={(v) => setPlacement(v ?? 'products_hero')}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {(value: string) => PLACEMENT_OPTIONS.find((o) => o.value === value)?.label ?? value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="min-w-[200px]">
                    {PLACEMENT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="b-badge">Badge text</Label>
                <Input
                  id="b-badge"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="50% Off"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="b-link">Link URL</Label>
                <Input
                  id="b-link"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="/category/womens-fashion"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Banner image</Label>
                <ImageUpload value={imageUrl} onChange={setImageUrl} folder="saint-roman/banners" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="b-sort">Sort order</Label>
                <Input id="b-sort" type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
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
      {error && <p className="text-sm text-destructive">Couldn't load banners.</p>}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Show on</TableHead>
              <TableHead>Badge</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-32" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.banners.map((banner) => (
              <TableRow key={banner.id}>
                <TableCell>
                  {banner.image_url ? (
                    <img src={banner.image_url} alt="" className="h-10 w-10 rounded border object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded border bg-muted" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{banner.title}</TableCell>
                <TableCell>
                  <Badge variant="outline">{placementLabel(banner.placement)}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{banner.badge_text ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={banner.is_active ? 'default' : 'secondary'}>
                    {banner.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(banner)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleToggleActive(banner)}>
                    {banner.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(banner.id, banner.title)}>
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