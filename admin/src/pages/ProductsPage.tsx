import { useMemo, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X, Plus, Pencil, Barcode as BarcodeIcon } from 'lucide-react'
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
import { BarcodeSvg } from '@/components/shared/BarcodeSvg'
import { printBarcodeLabels } from '@/lib/barcodePrint'

interface Category {
  id: string
  name: string
}

interface Tag {
  id: string
  name: string
  slug: string
}

interface Variant {
  size: string
  color: string
  price: number
  stock_quantity: number
}

interface Spec {
  label: string
  value: string
}

// One uploaded photo. `color` groups it under a variant's colour (matches Variant.color as free
// text — same convention the colour swatches already use); null means it applies regardless of
// colour. `position` + `sort_order` place it: one 'main' (sort_order 0) plus up to three 'side'
// shots (sort_order 1-3) per colour group.
interface ProductImage {
  id?: string
  color: string | null
  url: string
  alt_text?: string | null
  position: 'main' | 'side'
  sort_order: number
}

interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  sku: string | null
  barcode: string | null
  brand: string | null
  hsn_code: string | null
  gst_percent: number | null
  cost_price: number | null
  base_price: number
  status: 'draft' | 'active' | 'archived'
  category: Category | null
  product_variants: Variant[]
  product_images: ProductImage[]
  tags: string[]
  specifications: Record<string, string> | null
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

interface Review {
  id: string
  author_name: string
  rating: number
  title: string | null
  body: string | null
  is_published: boolean
  created_at: string
}

const emptyVariant: Variant = { size: '', color: '', price: 0, stock_quantity: 0 }

export function ProductsPage() {
  const { data, loading, error, refetch } = useApiResource<{ products: Product[] }>('/products')
  const { data: categoriesData } = useApiResource<{ categories: Category[] }>('/categories')
  const { data: tagsData, refetch: refetchTags } = useApiResource<{ tags: Tag[] }>('/tags')

  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<ProductImage[]>([])
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [brand, setBrand] = useState('')
  const [hsnCode, setHsnCode] = useState('')
  const [gstPercent, setGstPercent] = useState('')
  const [costPrice, setCostPrice] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [status, setStatus] = useState<Product['status']>('draft')
  const [categoryId, setCategoryId] = useState<string>('')
  const [variants, setVariants] = useState<Variant[]>([{ ...emptyVariant }])
  const [specs, setSpecs] = useState<Spec[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const [saving, setSaving] = useState(false)

  // Reviews are stored independently of the product form (their own table/endpoint) — listed and
  // added directly against the product being edited, not deferred to the product's own Save.
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null)
  const [newReviewAuthor, setNewReviewAuthor] = useState('')
  const [newReviewRating, setNewReviewRating] = useState('5')
  const [newReviewTitle, setNewReviewTitle] = useState('')
  const [newReviewBody, setNewReviewBody] = useState('')
  const [addingReview, setAddingReview] = useState(false)

  // Table controls
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stockFilter, setStockFilter] = useState('all')
  const [sortKey, setSortKey] = useState<'price' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const LOW_STOCK_THRESHOLD = 10

  function stockOf(product: Product) {
    return product.product_variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)
  }

  function stockLevel(product: Product): 'out' | 'low' | 'in' {
    const stock = stockOf(product)
    if (stock === 0) return 'out'
    if (stock < LOW_STOCK_THRESHOLD) return 'low'
    return 'in'
  }

  function resetForm() {
    setEditingId(null)
    setName('')
    setDescription('')
    setImages([])
    setSku('')
    setBarcode('')
    setBrand('')
    setHsnCode('')
    setGstPercent('')
    setCostPrice('')
    setBasePrice('')
    setStatus('draft')
    setCategoryId('')
    setVariants([{ ...emptyVariant }])
    setSpecs([])
    setSelectedTags([])
    setNewTagName('')
    setReviews([])
    setEditingReviewId(null)
    setNewReviewAuthor('')
    setNewReviewRating('5')
    setNewReviewTitle('')
    setNewReviewBody('')
  }

  function updateVariant(index: number, patch: Partial<Variant>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)))
  }

  // ── Image helpers ────────────────────────────────────────────────────
  // Colour groups come from the Variants section (same free-text colour), not a separate list —
  // one main + up to 3 side photos per colour that actually exists on this product. A product
  // with no colour variation gets a single ungrouped set (color: null).
  const colorGroups = useMemo(() => {
    const colors = Array.from(new Set(variants.map((v) => v.color.trim()).filter(Boolean)))
    return colors.length > 0 ? colors : [null]
  }, [variants])

  function getImageSlot(color: string | null, position: 'main' | 'side', sortOrder: number) {
    return images.find((img) => (img.color ?? null) === color && img.position === position && img.sort_order === sortOrder)?.url || ''
  }

  function setImageSlot(color: string | null, position: 'main' | 'side', sortOrder: number, url: string) {
    setImages((prev) => {
      const rest = prev.filter((img) => !((img.color ?? null) === color && img.position === position && img.sort_order === sortOrder))
      return url ? [...rest, { color, position, sort_order: sortOrder, url }] : rest
    })
  }

  function updateSpec(index: number, patch: Partial<Spec>) {
    setSpecs((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  function removeSpec(index: number) {
    setSpecs((prev) => prev.filter((_, i) => i !== index))
  }

  const visibleProducts = useMemo(() => {
    let list = data?.products ?? []

    const query = searchQuery.trim().toLowerCase()
    if (query) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.sku ?? '').toLowerCase().includes(query) ||
          (p.brand ?? '').toLowerCase().includes(query),
      )
    }
    if (categoryFilter !== 'all') {
      list = list.filter((p) => p.category?.id === categoryFilter)
    }
    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter)
    }
    if (stockFilter !== 'all') {
      list = list.filter((p) => stockLevel(p) === stockFilter)
    }
    if (sortKey === 'price') {
      list = [...list].sort((a, b) => (sortDir === 'asc' ? a.base_price - b.base_price : b.base_price - a.base_price))
    }
    return list
  }, [data, searchQuery, categoryFilter, statusFilter, stockFilter, sortKey, sortDir])

  function toggleSort() {
    if (sortKey !== 'price') {
      setSortKey('price')
      setSortDir('asc')
    } else {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === visibleProducts.length ? new Set() : new Set(visibleProducts.map((p) => p.id)),
    )
  }

  async function bulkSetStatus(newStatus: Product['status']) {
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => apiFetch(`/products/${id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) })),
      )
      toast.success(`${selectedIds.size} product${selectedIds.size === 1 ? '' : 's'} set to ${newStatus}`)
      setSelectedIds(new Set())
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk update failed')
    }
  }

  async function bulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} selected product${selectedIds.size === 1 ? '' : 's'}? This can't be undone.`)) return
    try {
      await Promise.all(Array.from(selectedIds).map((id) => apiFetch(`/products/${id}`, { method: 'DELETE' })))
      toast.success(`${selectedIds.size} product${selectedIds.size === 1 ? '' : 's'} deleted`)
      setSelectedIds(new Set())
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk delete failed')
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) resetForm()
  }

  function handleEdit(product: Product) {
    setEditingId(product.id)
    setName(product.name)
    setDescription(product.description ?? '')
    setImages(
      (product.product_images || []).map((img) => ({
        color: img.color ?? null,
        position: img.position === 'main' ? 'main' : 'side',
        sort_order: img.sort_order,
        url: img.url,
      })),
    )
    setSku(product.sku ?? '')
    setBarcode(product.barcode ?? '')
    setBrand(product.brand ?? '')
    setHsnCode(product.hsn_code ?? '')
    setGstPercent(product.gst_percent != null ? String(product.gst_percent) : '')
    setCostPrice(product.cost_price != null ? String(product.cost_price) : '')
    setBasePrice(String(product.base_price))
    setStatus(product.status)
    setCategoryId(product.category?.id ?? '')
    setVariants(
      product.product_variants.length > 0
        ? product.product_variants.map(({ size, color, price, stock_quantity }) => ({
          size,
          color,
          price,
          stock_quantity,
        }))
        : [{ ...emptyVariant }],
    )
    setSelectedTags(product.tags || [])
    setSpecs(Object.entries(product.specifications || {}).map(([label, value]) => ({ label, value: String(value) })))
    setOpen(true)
    loadReviews(product.id)
  }

  // ── Review helpers ───────────────────────────────────────────────────
  async function loadReviews(productId: string) {
    setReviewsLoading(true)
    try {
      const res = await apiFetch(`/reviews?product_id=${productId}`)
      setReviews(res.reviews || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load reviews')
    } finally {
      setReviewsLoading(false)
    }
  }

  function resetReviewForm() {
    setEditingReviewId(null)
    setNewReviewAuthor('')
    setNewReviewRating('5')
    setNewReviewTitle('')
    setNewReviewBody('')
  }

  function handleEditReview(review: Review) {
    setEditingReviewId(review.id)
    setNewReviewAuthor(review.author_name)
    setNewReviewRating(String(review.rating))
    setNewReviewTitle(review.title ?? '')
    setNewReviewBody(review.body ?? '')
  }

  async function handleSaveReview() {
    if (!editingId || !newReviewAuthor.trim()) return
    setAddingReview(true)
    try {
      const payload = {
        author_name: newReviewAuthor.trim(),
        rating: Number(newReviewRating),
        title: newReviewTitle.trim() || null,
        body: newReviewBody.trim() || null,
      }
      if (editingReviewId) {
        await apiFetch(`/reviews/${editingReviewId}`, { method: 'PUT', body: JSON.stringify(payload) })
        toast.success('Review updated')
      } else {
        await apiFetch('/reviews', {
          method: 'POST',
          body: JSON.stringify({ product_id: editingId, ...payload }),
        })
        toast.success('Review added')
      }
      resetReviewForm()
      loadReviews(editingId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save review')
    } finally {
      setAddingReview(false)
    }
  }

  async function handleToggleReviewPublished(review: Review) {
    if (!editingId) return
    try {
      await apiFetch(`/reviews/${review.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_published: !review.is_published }),
      })
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, is_published: !r.is_published } : r)),
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update review')
    }
  }

  async function handleDeleteReview(id: string) {
    if (!editingId) return
    if (!window.confirm('Delete this review? This cannot be undone.')) return
    try {
      await apiFetch(`/reviews/${id}`, { method: 'DELETE' })
      setReviews((prev) => prev.filter((r) => r.id !== id))
      if (editingReviewId === id) resetReviewForm()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete review')
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      // Drop any image left over from a colour that was since renamed/removed in Variants, and
      // strip local-only `id` fields — the backend fully replaces a product's images on every
      // save, so stale ids would just be dead weight, never a collision.
      const validColors = new Set(colorGroups)
      const submittedImages = images
        .filter((img) => validColors.has(img.color ?? null))
        .map(({ color, url, position, sort_order, alt_text }) => ({ color, url, position, sort_order, alt_text: alt_text ?? null }))

      // products.image_url stays as a plain thumbnail column for places that don't need the full
      // gallery (admin table, homepage/related-product cards, cart) — always the first colour
      // group's main photo, falling back to any main photo, then any photo at all.
      const primaryImageUrl =
        submittedImages.find((img) => (img.color ?? null) === colorGroups[0] && img.position === 'main')?.url ||
        submittedImages.find((img) => img.position === 'main')?.url ||
        submittedImages[0]?.url ||
        null

      const body = {
        name,
        slug: slugify(name),
        description,
        image_url: primaryImageUrl,
        images: submittedImages,
        sku: sku || null,
        brand: brand || null,
        hsn_code: hsnCode || null,
        gst_percent: gstPercent === '' ? 0 : Number(gstPercent),
        cost_price: costPrice === '' ? null : Number(costPrice),
        base_price: Number(basePrice) || 0,
        status,
        category_id: categoryId || null,
        tags: selectedTags,
        variants: variants.filter((v) => v.size || v.color),
        specifications: Object.fromEntries(
          specs.filter((s) => s.label.trim()).map((s) => [s.label.trim(), s.value]),
        ),
      }

      if (editingId) {
        await apiFetch(`/products/${editingId}`, { method: 'PUT', body: JSON.stringify(body) })
        toast.success('Product updated')
      } else {
        await apiFetch('/products', { method: 'POST', body: JSON.stringify(body) })
        toast.success('Product created')
      }
      setOpen(false)
      resetForm()
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This can't be undone.`)) return
    try {
      await apiFetch(`/products/${id}`, { method: 'DELETE' })
      toast.success('Product deleted')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete product')
    }
  }

  // ── Tag helpers ──────────────────────────────────────────────────────
  function addTag(slug: string) {
    if (!selectedTags.includes(slug)) {
      setSelectedTags((prev) => [...prev, slug])
    }
  }

  function removeTag(slug: string) {
    setSelectedTags((prev) => prev.filter((t) => t !== slug))
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return
    setAddingTag(true)
    try {
      const res = await apiFetch('/tags', { method: 'POST', body: JSON.stringify({ name: newTagName.trim() }) })
      const created = res.tag
      toast.success(`Tag "${created.name}" created`)
      setNewTagName('')
      refetchTags()
      addTag(created.slug)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create tag')
    } finally {
      setAddingTag(false)
    }
  }

  function getTagName(slug: string) {
    const tag = tagsData?.tags.find((t) => t.slug === slug)
    return tag ? tag.name : slug
  }

  const availableTags = (tagsData?.tags || []).filter((t) => !selectedTags.includes(t.slug))

  const statusVariant: Record<Product['status'], 'default' | 'secondary' | 'outline'> = {
    active: 'default',
    draft: 'secondary',
    archived: 'outline',
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button>New product</Button>} />
          <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit product' : 'New product'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-name">Name</Label>
                <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-sku">SKU</Label>
                  <Input id="p-sku" value={sku} onChange={(e) => setSku(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-price">Base price</Label>
                  <Input
                    id="p-price"
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-cost">Cost price (for Profit Report, not shown publicly)</Label>
                  <Input
                    id="p-cost"
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-brand">Brand</Label>
                  <Input id="p-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Barcode</Label>
                  {editingId ? (
                    barcode ? (
                      <div className="flex flex-col gap-2 rounded-md border p-2">
                        <BarcodeSvg value={barcode} height={40} fontSize={11} />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            printBarcodeLabels([
                              { id: editingId, name, sku, barcode, base_price: Number(basePrice) || 0 },
                            ])
                          }
                        >
                          Print label
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Generating…</p>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">Auto-generated after you save</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-hsn">HSN code</Label>
                  <Input id="p-hsn" value={hsnCode} onChange={(e) => setHsnCode(e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="p-gst">GST %</Label>
                  <Input
                    id="p-gst"
                    type="number"
                    value={gstPercent}
                    onChange={(e) => setGstPercent(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Category</Label>
                  <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? '')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category">
                        {(value: string) => categoriesData?.categories.find((c) => c.id === value)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categoriesData?.categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(value) => setStatus((value as Product['status']) ?? 'draft')}>
                    <SelectTrigger>
                      <SelectValue>
                        {(value: Product['status']) =>
                          ({ draft: 'Draft', active: 'Active', archived: 'Archived' })[value]
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="p-description">Description</Label>
                <Textarea
                  id="p-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* ── Additional Information (storefront spec table) ── */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>Additional Information</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSpecs((prev) => [...prev, { label: '', value: '' }])}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add specification
                  </Button>
                </div>
                {specs.length === 0 && (
                  <p className="text-sm text-muted-foreground">No specifications added.</p>
                )}
                {specs.map((spec, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Label (e.g. Material)"
                      value={spec.label}
                      onChange={(e) => updateSpec(index, { label: e.target.value })}
                    />
                    <Input
                      placeholder="Value (e.g. Cotton)"
                      value={spec.value}
                      onChange={(e) => updateSpec(index, { value: e.target.value })}
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeSpec(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* ── Tags section ── */}
              <div className="flex flex-col gap-2">
                <Label>Tags (collections)</Label>

                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTags.map((slug) => (
                      <Badge key={slug} variant="secondary" className="gap-1 pl-2 pr-1 py-1">
                        {getTagName(slug)}
                        <button
                          type="button"
                          onClick={() => removeTag(slug)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value) addTag(value)
                    }}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a tag to add" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTags.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          {tagsData?.tags.length === 0 ? 'No tags yet — create one below' : 'All tags selected'}
                        </div>
                      ) : (
                        availableTags.map((t) => (
                          <SelectItem key={t.id} value={t.slug}>
                            {t.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="New tag name..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleCreateTag()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCreateTag}
                    disabled={addingTag || !newTagName.trim()}
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add tag
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>Variants</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setVariants((prev) => [...prev, { ...emptyVariant }])}
                  >
                    Add variant
                  </Button>
                </div>
                {variants.map((variant, index) => (
                  <div key={index} className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Size"
                      value={variant.size}
                      onChange={(e) => updateVariant(index, { size: e.target.value })}
                    />
                    <Input
                      placeholder="Color"
                      value={variant.color}
                      onChange={(e) => updateVariant(index, { color: e.target.value })}
                    />
                    <Input
                      type="number"
                      placeholder="Price"
                      value={variant.price || ''}
                      onChange={(e) => updateVariant(index, { price: Number(e.target.value) })}
                    />
                    <Input
                      type="number"
                      placeholder="Stock"
                      value={variant.stock_quantity || ''}
                      onChange={(e) => updateVariant(index, { stock_quantity: Number(e.target.value) })}
                    />
                  </div>
                ))}
              </div>

              {/* ── Images, one main + up to 3 side photos per colour above ── */}
              <div className="flex flex-col gap-3">
                <Label>Images</Label>
                {colorGroups.map((color) => (
                  <div key={color ?? '_default'} className="flex flex-col gap-2 rounded-md border p-3">
                    <span className="text-sm font-medium capitalize">{color ? `${color} photos` : 'Product photos'}</span>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 1, 2, 3].map((slot) => (
                        <div key={slot} className="flex flex-col gap-1">
                          <ImageUpload
                            variant="tile"
                            value={slot === 0 ? getImageSlot(color, 'main', 0) : getImageSlot(color, 'side', slot)}
                            onChange={(url) =>
                              slot === 0 ? setImageSlot(color, 'main', 0, url) : setImageSlot(color, 'side', slot, url)
                            }
                            folder="ellora/products"
                          />
                          <span className="text-center text-xs text-muted-foreground">
                            {slot === 0 ? 'Main' : `Side ${slot}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Reviews — own table/endpoint, managed live against this product, not part
                   of the product Save below. Only available once the product exists. ── */}
              <div className="flex flex-col gap-2">
                <Label>Reviews</Label>
                {!editingId && (
                  <p className="text-sm text-muted-foreground">Save the product first to add reviews.</p>
                )}
                {editingId && (
                  <>
                    {reviewsLoading && <p className="text-sm text-muted-foreground">Loading reviews…</p>}
                    {!reviewsLoading && reviews.length === 0 && (
                      <p className="text-sm text-muted-foreground">No reviews yet.</p>
                    )}
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className={`flex items-start justify-between gap-2 rounded-md border p-2 ${review.is_published ? '' : 'opacity-60'}`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium">{review.author_name}</span>
                            <span className="text-muted-foreground">{review.rating}★</span>
                            <Badge variant={review.is_published ? 'default' : 'secondary'}>
                              {review.is_published ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                          {review.title && <div className="text-sm font-medium">{review.title}</div>}
                          {review.body && <div className="text-sm text-muted-foreground">{review.body}</div>}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleEditReview(review)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleToggleReviewPublished(review)}>
                            {review.is_published ? 'Disable' : 'Enable'}
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteReview(review.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="flex flex-col gap-2 rounded-md border p-2">
                      {editingReviewId && (
                        <p className="text-xs text-muted-foreground">Editing review — Save changes or Cancel.</p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Reviewer name"
                          value={newReviewAuthor}
                          onChange={(e) => setNewReviewAuthor(e.target.value)}
                        />
                        <Select value={newReviewRating} onValueChange={(value) => setNewReviewRating(value ?? '5')}>
                          <SelectTrigger>
                            <SelectValue>{(value: string) => `${value} star${value === '1' ? '' : 's'}`}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {['5', '4', '3', '2', '1'].map((r) => (
                              <SelectItem key={r} value={r}>
                                {r} star{r === '1' ? '' : 's'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        placeholder="Title (optional)"
                        value={newReviewTitle}
                        onChange={(e) => setNewReviewTitle(e.target.value)}
                      />
                      <Textarea
                        placeholder="Review text (optional)"
                        value={newReviewBody}
                        onChange={(e) => setNewReviewBody(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={addingReview || !newReviewAuthor.trim()}
                          onClick={handleSaveReview}
                        >
                          {editingReviewId ? (
                            'Save changes'
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-1" />
                              Add review
                            </>
                          )}
                        </Button>
                        {editingReviewId && (
                          <Button type="button" variant="ghost" size="sm" onClick={resetReviewForm}>
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}
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
          Couldn't load products — connect Supabase and run the Phase 2 schema to enable this.
        </p>
      )}

      {data && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU, or brand"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value ?? 'all')}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="All categories">
                  {(value: string) =>
                    value === 'all' ? 'All categories' : (categoriesData?.categories.find((c) => c.id === value)?.name ?? 'All categories')
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categoriesData?.categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? 'all')}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All statuses">
                  {(value: string) =>
                    ({ all: 'All statuses', draft: 'Draft', active: 'Active', archived: 'Archived' } as Record<string, string>)[value] ?? 'All statuses'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={(value) => setStockFilter(value ?? 'all')}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All stock levels">
                  {(value: string) =>
                    ({ all: 'All stock levels', in: 'In stock', low: 'Low stock', out: 'Out of stock' } as Record<string, string>)[value] ?? 'All stock levels'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stock levels</SelectItem>
                <SelectItem value="in">In stock</SelectItem>
                <SelectItem value="low">Low stock</SelectItem>
                <SelectItem value="out">Out of stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 rounded-md bg-accent px-3 py-2 text-sm">
              <span className="font-medium">{selectedIds.size} selected</span>
              <Button variant="outline" size="sm" onClick={() => bulkSetStatus('active')}>
                Set active
              </Button>
              <Button variant="outline" size="sm" onClick={() => bulkSetStatus('archived')}>
                Archive
              </Button>
              <Button variant="outline" size="sm" className="text-destructive" onClick={bulkDelete}>
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  printBarcodeLabels(
                    data.products
                      .filter((p) => selectedIds.has(p.id))
                      .map((p) => ({ id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, base_price: p.base_price })),
                  )
                }
              >
                <BarcodeIcon className="mr-1 h-3.5 w-3.5" />
                Print labels
              </Button>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <input
                    type="checkbox"
                    checked={visibleProducts.length > 0 && selectedIds.size === visibleProducts.length}
                    onChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>
                  <button type="button" className="flex items-center gap-1" onClick={toggleSort}>
                    Price
                    {sortKey === 'price' ? (
                      sortDir === 'asc' ? (
                        <ArrowUp className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </button>
                </TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleProducts.map((product) => {
                const level = stockLevel(product)
                const stock = stockOf(product)
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelected(product.id)}
                        aria-label={`Select ${product.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
                          {product.image_url && (
                            <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          <div className="text-xs text-muted-foreground">{product.sku ?? 'No SKU'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{product.category?.name ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(product.tags || []).map((slug) => (
                          <Badge key={slug} variant="outline" className="text-xs">
                            {getTagName(slug)}
                          </Badge>
                        ))}
                        {(!product.tags || product.tags.length === 0) && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{product.base_price}</TableCell>
                    <TableCell>
                      {level === 'out' && <Badge variant="destructive">Out of stock</Badge>}
                      {level === 'low' && (
                        <Badge className="border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400">
                          Low: {stock}
                        </Badge>
                      )}
                      {level === 'in' && (
                        <Badge className="border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400">
                          In stock: {stock}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[product.status]}>{product.status}</Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!product.barcode}
                        title={product.barcode ?? 'No barcode yet'}
                        onClick={() =>
                          printBarcodeLabels([
                            { id: product.id, name: product.name, sku: product.sku, barcode: product.barcode, base_price: product.base_price },
                          ])
                        }
                      >
                        <BarcodeIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(product)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(product.id, product.name)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {visibleProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {data.products.length === 0 ? 'No products yet.' : 'No products match your filters.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  )
}