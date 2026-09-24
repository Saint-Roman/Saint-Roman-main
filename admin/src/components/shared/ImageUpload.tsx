import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { ImagePlus, Loader2, X } from 'lucide-react'

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  folder?: string
  // 'tile' renders a compact square (click or drop to upload, hover to replace/remove) for
  // dense grids like the product photo slots; 'row' is the default preview + buttons layout.
  variant?: 'row' | 'tile'
}

// Reads the selected file as a base64 data URI, POSTs it to /api/upload/image (which forwards to
// Cloudinary server-side), and returns the hosted URL. Shows a preview + remove button.
export function ImageUpload({ value, onChange, folder, variant = 'row' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    setUploading(true)
    try {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Could not read file'))
        reader.readAsDataURL(file)
      })
      const res = await apiFetch('/upload/image', {
        method: 'POST',
        body: JSON.stringify({ image: dataUri, folder }),
      })
      onChange(res.url)
      toast.success('Image uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) handleFile(file)
      }}
    />
  )

  if (variant === 'tile') {
    return (
      <div
        className={`group relative aspect-square w-full overflow-hidden rounded-md border ${
          value ? '' : 'border-dashed'
        } ${dragOver ? 'border-primary bg-primary/5' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files?.[0]
          if (file && !uploading) handleFile(file)
        }}
      >
        {fileInput}
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          title={value ? 'Replace image' : 'Upload image'}
          className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:bg-muted/50 disabled:cursor-wait"
        >
          {value ? (
            <>
              <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                Replace
              </span>
            </>
          ) : uploading ? null : (
            <>
              <ImagePlus className="h-5 w-5" />
              <span>Upload</span>
            </>
          )}
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="h-5 w-5 animate-spin" />
            </span>
          )}
        </button>
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange('')}
            title="Remove image"
            className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 focus:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <img src={value} alt="" className="h-16 w-16 rounded-md border object-cover" />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
          No image
        </div>
      )}
      <div className="flex flex-col gap-1">
        {fileInput}
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? 'Uploading…' : value ? 'Replace' : 'Upload image'}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
