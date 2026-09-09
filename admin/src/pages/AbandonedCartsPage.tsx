import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApiResource } from '@/hooks/useSupabase'
import { apiFetch } from '@/lib/api'
import { formatCurrency } from '@/lib/currency'
import { toast } from 'sonner'

interface CartItem {
  id: string
  quantity: number
  size: string | null
  color: string | null
  price: number | null
  product_name: string | null
  image_url: string | null
}

interface Customer {
  id: string
  first_name: string | null
  last_name: string | null
  name: string | null
  email: string | null
  phone: string | null
}

interface AbandonedCart {
  id: string
  updated_at: string
  notified_at: string | null
  value: number
  customer: Customer | null
  items: CartItem[]
}

interface AbandonedCartsResponse {
  configured: boolean
  hours: number
  carts: AbandonedCart[]
}

const HOUR_FILTERS = [
  { hours: 1, label: '1h' },
  { hours: 12, label: '12h' },
  { hours: 24, label: '24h' },
] as const

function customerName(customer: Customer | null) {
  if (!customer) return 'Unknown customer'
  return (
    customer.name ||
    [customer.first_name, customer.last_name].filter(Boolean).join(' ') ||
    customer.email ||
    'Unknown customer'
  )
}

export function AbandonedCartsPage() {
  const [hours, setHours] = useState<number>(24)
  const { data, loading, error, refetch } = useApiResource<AbandonedCartsResponse>(
    `/abandoned-carts?hours=${hours}`
  )
  const [sendingId, setSendingId] = useState<string | null>(null)

  async function handleSendReminder(cart: AbandonedCart) {
    setSendingId(cart.id)
    try {
      await apiFetch(`/abandoned-carts/${cart.id}/send-reminder`, { method: 'POST' })
      toast.success(`Reminder sent to ${customerName(cart.customer)}`)
      refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reminder')
    } finally {
      setSendingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Abandoned Carts</h1>
          <p className="text-sm text-muted-foreground">
            Customers who added items to their cart and left — idle {hours}h+ with no order placed.
            {hours < 24 && ' The WhatsApp reminder itself still only fires after 24h.'}
          </p>
        </div>
        <div className="flex gap-1 rounded-md border p-1">
          {HOUR_FILTERS.map((filter) => (
            <Button
              key={filter.hours}
              size="sm"
              variant={hours === filter.hours ? 'default' : 'ghost'}
              onClick={() => setHours(filter.hours)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {data && !data.configured && (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          WhatsApp reminders aren't set up yet — add WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and
          WHATSAPP_ABANDONED_CART_TEMPLATE (a Meta-approved message template) to the server's
          environment to enable sending. The automatic 30-minute check already runs — it just has
          nothing to send with yet.
        </p>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <p className="text-sm text-destructive">
          Couldn't load abandoned carts — connect Supabase and run the Phase 16 schema to enable this.
        </p>
      )}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Last activity</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.carts.map((cart) => (
              <TableRow key={cart.id}>
                <TableCell>
                  <div className="font-medium">{customerName(cart.customer)}</div>
                  <div className="text-sm text-muted-foreground">
                    {cart.customer?.phone || cart.customer?.email || '—'}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {cart.items.map((item) => {
                    const variant = [item.size, item.color].filter(Boolean).join(' / ')
                    return (
                      <div key={item.id}>
                        {item.product_name || 'Unknown product'}
                        {variant ? ` (${variant})` : ''} × {item.quantity}
                      </div>
                    )
                  })}
                </TableCell>
                <TableCell>{formatCurrency(cart.value)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(cart.updated_at).toLocaleString('en-IN')}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    disabled={!data.configured || !cart.customer?.phone || sendingId === cart.id}
                    onClick={() => handleSendReminder(cart)}
                  >
                    {sendingId === cart.id ? 'Sending…' : 'Send reminder'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {data.carts.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No abandoned carts right now.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
