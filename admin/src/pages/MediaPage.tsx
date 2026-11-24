import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { useApiResource } from '@/hooks/useSupabase'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'

interface MediaAsset {
  id: string
  url: string
  original_filename: string | null
  folder: string | null
  format: string | null
  bytes: number | null
  width: number | null
  height: number | null
  uploaded_by: string | null
  created_at: string
}

function formatBytes(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function MediaPage() {
  const { data, loading, error, refetch } = useApiResource<{ media: MediaAsset[] }>('/media')
  const { data: status } = useApiResource<{ configured: boolean }>('/upload/status')
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList) {
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue
        const dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('Could not read file'))
          reader.readAsDataURL(file)
        })
        await apiFetch('/upload/image', {
          method: 'POST',
          body: JSON.stringify({ image: dataUri, folder: 'saint-roman/library', filename: file.name }),
        })
      }
      toast.success('Uploaded to library')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this image? It will be removed from storage too.')) return
    try {
      await apiFetch(`/media/${id}`, { method: 'DELETE' })
      toast.success('Image deleted')
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  function copyUrl(url: string) {
    navigator.clipboard.writeText(url)
    toast.success('URL copied')
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Media Library</h1>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && e.target.files.length > 0 && handleFiles(e.target.files)}
          />
          <Button disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? 'Uploading…' : 'Upload images'}
          </Button>
        </div>
      </div>

      {status && !status.configured && (
        <p className="rounded-md border border-destructive/40 p-3 text-sm text-muted-foreground">
          Cloudinary isn't configured yet — add <code className="rounded bg-muted px-1">CLOUDINARY_*</code> keys to{' '}
          <code className="rounded bg-muted px-1">server/.env</code> and restart the API server to enable uploads.
        </p>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Couldn't load media library.</p>}

      {data && data.media.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No images yet. Every image you upload here — or through a product or banner — appears in this library.
        </p>
      )}

      {data && data.media.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.media.map((asset) => (
            <div key={asset.id} className="flex flex-col overflow-hidden rounded-lg border">
              <div className="aspect-square bg-muted">
                <img src={asset.url} alt={asset.original_filename ?? ''} className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-col gap-1 p-2">
                <p className="truncate text-xs font-medium" title={asset.original_filename ?? undefined}>
                  {asset.original_filename ?? 'image'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ''}
                  {formatBytes(asset.bytes)}
                </p>
                <div className="mt-1 flex gap-1">
                  <Button variant="outline" size="sm" className="h-7 flex-1 text-xs" onClick={() => copyUrl(asset.url)}>
                    Copy URL
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleDelete(asset.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
