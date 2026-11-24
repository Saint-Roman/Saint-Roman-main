import { useState, type ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useApiResource } from '@/hooks/useSupabase'
import { formatCurrency } from '@/lib/currency'
import { GripVertical, Eye, EyeOff, Settings2 } from 'lucide-react'

interface RecentOrder {
  id: string
  order_number: string
  customer_name: string
  total: number
  status: string
}

interface LowStockVariant {
  id: string
  productName: string
  variantLabel: string | null
  stockQuantity: number
}

interface Summary {
  totalOrders: number
  totalRevenue: number
  totalCustomers: number
  totalActiveProducts: number
  pendingReturns: number
  ordersByStatus: Record<string, number>
  lowStockVariants: LowStockVariant[]
  recentOrders: RecentOrder[]
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  )
}

// ---- Widget registry: each widget renders from the same dashboard summary ----
interface WidgetDef {
  id: string
  label: string
  render: (data: Summary) => ReactNode
}

const WIDGETS: WidgetDef[] = [
  {
    id: 'stats',
    label: 'Key stats',
    render: (data) => (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Orders" value={String(data.totalOrders)} />
        <StatCard label="Revenue" value={formatCurrency(data.totalRevenue)} />
        <StatCard label="Customers" value={String(data.totalCustomers)} />
        <StatCard label="Active Products" value={String(data.totalActiveProducts)} />
        <StatCard label="Pending Returns" value={String(data.pendingReturns)} />
      </div>
    ),
  },
  {
    id: 'recentOrders',
    label: 'Recent orders',
    render: (data) => (
      <Card>
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>{order.customer_name}</TableCell>
                  <TableCell>{formatCurrency(order.total)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{order.status.replace(/_/g, ' ')}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {data.recentOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No orders yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    ),
  },
  {
    id: 'lowStock',
    label: 'Low stock',
    render: (data) => (
      <Card>
        <CardHeader>
          <CardTitle>Low stock</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Stock</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.lowStockVariants.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell className="font-medium">{variant.productName}</TableCell>
                  <TableCell className="text-muted-foreground">{variant.variantLabel ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={variant.stockQuantity === 0 ? 'destructive' : 'secondary'}>
                      {variant.stockQuantity}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {data.lowStockVariants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    Nothing low on stock.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    ),
  },
  {
    id: 'ordersByStatus',
    label: 'Orders by status',
    render: (data) => (
      <Card>
        <CardHeader>
          <CardTitle>Orders by status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.entries(data.ordersByStatus).map(([status, count]) => (
            <Badge key={status} variant="outline" className="text-sm">
              {status.replace(/_/g, ' ')}: {count}
            </Badge>
          ))}
          {Object.keys(data.ordersByStatus).length === 0 && (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          )}
        </CardContent>
      </Card>
    ),
  },
]

const DEFAULT_ORDER = WIDGETS.map((w) => w.id)
const ORDER_KEY = 'saint-roman.dashboard.order'
const HIDDEN_KEY = 'saint-roman.dashboard.hidden'

function loadOrder(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(ORDER_KEY) || 'null') as string[] | null
    if (!Array.isArray(saved)) return DEFAULT_ORDER
    // Keep only known ids, then append any new widgets added since the layout was saved.
    const known = saved.filter((id) => DEFAULT_ORDER.includes(id))
    const missing = DEFAULT_ORDER.filter((id) => !known.includes(id))
    return [...known, ...missing]
  } catch {
    return DEFAULT_ORDER
  }
}

function loadHidden(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(HIDDEN_KEY) || 'null') as string[] | null
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

export function DashboardPage() {
  const { data, loading, error } = useApiResource<Summary>('/dashboard/summary')

  const [editing, setEditing] = useState(false)
  const [order, setOrder] = useState<string[]>(loadOrder)
  const [hidden, setHidden] = useState<string[]>(loadHidden)
  const [dragId, setDragId] = useState<string | null>(null)

  function persistOrder(next: string[]) {
    setOrder(next)
    localStorage.setItem(ORDER_KEY, JSON.stringify(next))
  }

  function persistHidden(next: string[]) {
    setHidden(next)
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(next))
  }

  function toggleHidden(id: string) {
    persistHidden(hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id])
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return
    const next = [...order]
    const from = next.indexOf(dragId)
    const to = next.indexOf(targetId)
    next.splice(from, 1)
    next.splice(to, 0, dragId)
    persistOrder(next)
    setDragId(null)
  }

  function resetLayout() {
    persistOrder(DEFAULT_ORDER)
    persistHidden([])
  }

  const widgetsById = Object.fromEntries(WIDGETS.map((w) => [w.id, w]))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2">
          {editing && (
            <Button variant="ghost" size="sm" onClick={resetLayout}>
              Reset layout
            </Button>
          )}
          <Button variant={editing ? 'default' : 'outline'} size="sm" onClick={() => setEditing((v) => !v)}>
            <Settings2 className="mr-1 h-4 w-4" />
            {editing ? 'Done' : 'Customize'}
          </Button>
        </div>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">Couldn't load dashboard data.</p>}

      {data && (
        <div className="flex flex-col gap-4">
          {order.map((id) => {
            const widget = widgetsById[id]
            if (!widget) return null
            const isHidden = hidden.includes(id)
            if (isHidden && !editing) return null

            if (!editing) {
              return <div key={id}>{widget.render(data)}</div>
            }

            // Edit mode: draggable wrapper with handle + show/hide control.
            return (
              <div
                key={id}
                draggable
                onDragStart={() => setDragId(id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(id)}
                className={`rounded-lg border-2 border-dashed p-3 transition-opacity ${
                  dragId === id ? 'opacity-50' : 'opacity-100'
                } ${isHidden ? 'bg-muted/40' : ''}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <GripVertical className="h-4 w-4 cursor-grab" />
                    {widget.label}
                    {isHidden && <span className="text-xs">(hidden)</span>}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => toggleHidden(id)}>
                    {isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                </div>
                <div className={isHidden ? 'pointer-events-none opacity-50' : ''}>
                  {widget.render(data)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
