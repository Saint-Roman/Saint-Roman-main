import { formatCurrency } from '@/lib/currency'

export interface PrintableOrderItem {
    product_name: string
    variant_label: string | null
    quantity: number
    unit_price: number
    line_total: number
}

export interface PrintableOrder {
    order_number: string
    customer_name: string
    customer_email: string | null
    customer_phone: string | null
    shipping_address: { address?: string; city?: string; district?: string; pincode?: string; country?: string } | null
    subtotal: number
    shipping_fee: number
    discount_amount: number
    total: number
    payment_method: string | null
    courier: string | null
    tracking_number: string | null
    created_at: string
    order_items: PrintableOrderItem[]
}

function escapeHtml(value: string) {
    return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

function formatAddress(addr: PrintableOrder['shipping_address']) {
    if (!addr) return 'No address on file'
    return [addr.address, addr.city, addr.district, addr.pincode, addr.country].filter((v): v is string => Boolean(v)).map(escapeHtml).join(', ')
}

// Same "open a dedicated print window, write a self-contained document, window.print()" pattern
// as admin/src/lib/barcodePrint.ts — no PDF-generation library in this project, so the browser's
// own print-to-PDF is the actual PDF path here (works for one order or, from the ops console's
// "Generate labels" bulk action, several concatenated into one window so the browser produces one
// PDF/print job covering all of them — an honest "batch" without pretending to build a real zip).
function openPrintWindow(title: string, bodyHtml: string) {
    const win = window.open('', '_blank', 'width=800,height=900')
    if (!win) {
        window.alert('Pop-up blocked — allow pop-ups for this site to print.')
        return
    }

    win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; margin: 24px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: #666; margin: 20px 0 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 6px 4px; border-bottom: 1px solid #e5e5e5; }
  th { color: #666; font-weight: 600; }
  .meta { font-size: 13px; color: #444; margin-bottom: 2px; }
  .totals td { border-bottom: none; padding-top: 2px; }
  .totals .label { color: #666; }
  .totals .grand td { font-weight: 700; border-top: 1px solid #ccc; padding-top: 8px; }
  .label-box { border: 2px solid #111; border-radius: 8px; padding: 16px; margin-bottom: 24px; page-break-after: always; }
  .label-box:last-child { page-break-after: auto; }
  .no-print { margin-bottom: 16px; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <button class="no-print" onclick="window.print()">Print</button>
  ${bodyHtml}
</body>
</html>`)
    win.document.close()
}

export function printOrderInvoice(order: PrintableOrder) {
    const itemRows = order.order_items
        .map(
            (item) => `
      <tr>
        <td>${escapeHtml(item.product_name)}${item.variant_label ? ` (${escapeHtml(item.variant_label)})` : ''}</td>
        <td>${item.quantity}</td>
        <td>${formatCurrency(item.unit_price)}</td>
        <td>${formatCurrency(item.line_total)}</td>
      </tr>`
        )
        .join('')

    const body = `
    <h1>Invoice — ${escapeHtml(order.order_number)}</h1>
    <div class="meta">${escapeHtml(order.customer_name)}${order.customer_phone ? ' &middot; ' + escapeHtml(order.customer_phone) : ''}${order.customer_email ? ' &middot; ' + escapeHtml(order.customer_email) : ''}</div>
    <div class="meta">${escapeHtml(new Date(order.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }))}</div>

    <h2>Shipping address</h2>
    <div class="meta">${formatAddress(order.shipping_address)}</div>

    <h2>Items</h2>
    <table>
      <thead><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Total</th></tr></thead>
      <tbody>${itemRows}</tbody>
      <tfoot class="totals">
        <tr><td colspan="3" class="label">Subtotal</td><td>${formatCurrency(order.subtotal)}</td></tr>
        <tr><td colspan="3" class="label">Shipping</td><td>${order.shipping_fee > 0 ? formatCurrency(order.shipping_fee) : 'Free'}</td></tr>
        ${order.discount_amount > 0 ? `<tr><td colspan="3" class="label">Discount</td><td>-${formatCurrency(order.discount_amount)}</td></tr>` : ''}
        <tr class="grand"><td colspan="3">Total</td><td>${formatCurrency(order.total)}</td></tr>
      </tfoot>
    </table>
    <p class="meta" style="margin-top:16px;">Payment method: ${escapeHtml(order.payment_method ?? 'Not recorded')}</p>
  `

    openPrintWindow(`Invoice ${order.order_number}`, body)
}

function shippingLabelHtml(order: PrintableOrder) {
    return `
    <div class="label-box">
      <div style="font-size:11px;color:#666;">SHIP TO</div>
      <h1>${escapeHtml(order.customer_name)}</h1>
      <div class="meta">${formatAddress(order.shipping_address)}</div>
      <div class="meta">${order.customer_phone ? escapeHtml(order.customer_phone) : ''}</div>
      <div style="margin-top:16px;font-size:13px;">
        <div><strong>Order:</strong> ${escapeHtml(order.order_number)}</div>
        <div><strong>Courier:</strong> ${escapeHtml(order.courier ?? 'Not assigned')}</div>
        <div><strong>AWB / Tracking:</strong> ${escapeHtml(order.tracking_number ?? 'Not assigned')}</div>
        <div><strong>Items:</strong> ${order.order_items.reduce((n, i) => n + i.quantity, 0)}</div>
        <div><strong>COD amount:</strong> ${order.payment_method === 'cod' ? formatCurrency(order.total) : 'Prepaid'}</div>
      </div>
    </div>
  `
}

export function printShippingLabel(order: PrintableOrder) {
    openPrintWindow(`Shipping label ${order.order_number}`, shippingLabelHtml(order))
}

// Used by the ops console's bulk "Generate labels" action — one print window with every selected
// order's label, page-break-after so each prints on its own sheet; "Save as PDF" from the
// browser's print dialog is the batching mechanism (see openPrintWindow's comment above).
export function printShippingLabels(orders: PrintableOrder[]) {
    if (orders.length === 0) return
    const body = orders.map(shippingLabelHtml).join('')
    openPrintWindow(`Shipping labels (${orders.length})`, body)
}
