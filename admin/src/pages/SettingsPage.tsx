import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useApiResource } from '@/hooks/useSupabase'
import { apiFetch } from '@/lib/api'
import { toast } from 'sonner'
import { ImageUpload } from '@/components/shared/ImageUpload'

interface Settings {
  site_title?: string
  currency?: string
  tax_percent?: number
  announcement_text?: string
  footer_copyright_text?: string
  maintenance_mode?: boolean
  testimonial_bg_image_url?: string
  low_stock_alert_phone?: string
}

export function SettingsPage() {
  const { data, loading, error } = useApiResource<{ settings: Settings }>('/settings')
  const [form, setForm] = useState<Settings>({})
  const [saving, setSaving] = useState(false)

  const settings = form.site_title !== undefined ? form : data?.settings ?? {}

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await apiFetch('/settings', { method: 'PUT', body: JSON.stringify(settings) })
      toast.success('Settings saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Site Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && (
            <p className="text-sm text-destructive">
              Couldn't load settings yet — connect Supabase and create the `settings` table to enable this.
            </p>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="site_title">Site title</Label>
              <Input
                id="site_title"
                value={settings.site_title ?? ''}
                onChange={(e) => setForm({ ...settings, site_title: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={settings.currency ?? ''}
                onChange={(e) => setForm({ ...settings, currency: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tax_percent">Tax %</Label>
              <Input
                id="tax_percent"
                type="number"
                value={settings.tax_percent ?? ''}
                onChange={(e) => setForm({ ...settings, tax_percent: Number(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="announcement_text">Announcement bar text</Label>
              <Input
                id="announcement_text"
                value={settings.announcement_text ?? ''}
                onChange={(e) => setForm({ ...settings, announcement_text: e.target.value })}
                placeholder="Get a Flat 10% Off — Limited Time Only"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="footer_copyright_text">Footer copyright text</Label>
              <Input
                id="footer_copyright_text"
                value={settings.footer_copyright_text ?? ''}
                onChange={(e) => setForm({ ...settings, footer_copyright_text: e.target.value })}
                placeholder="Copyright © 2026 All Rights Reserved."
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Testimonials section background</Label>
              <ImageUpload
                value={settings.testimonial_bg_image_url ?? ''}
                onChange={(url) => setForm({ ...settings, testimonial_bg_image_url: url })}
                folder="saint-roman/settings"
              />
              <p className="text-xs text-muted-foreground">
                Background for the homepage "Voices of our happy customers" section. Leave empty to use the default.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="low_stock_alert_phone">Low stock alert WhatsApp number</Label>
              <Input
                id="low_stock_alert_phone"
                value={settings.low_stock_alert_phone ?? ''}
                onChange={(e) => setForm({ ...settings, low_stock_alert_phone: e.target.value })}
                placeholder="e.g. 919876543210"
              />
              <p className="text-xs text-muted-foreground">
                Sent a message here whenever a variant crosses into low/out-of-stock. Requires the WhatsApp
                integration to be configured (server/.env) — this field is inert until then.
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 p-3">
              <input
                id="maintenance_mode"
                type="checkbox"
                checked={settings.maintenance_mode ?? false}
                onChange={(e) => setForm({ ...settings, maintenance_mode: e.target.checked })}
              />
              <Label htmlFor="maintenance_mode" className="text-destructive">
                Maintenance mode — takes the storefront offline for shoppers
              </Label>
            </div>
            <Button type="submit" disabled={saving} className="w-fit">
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
