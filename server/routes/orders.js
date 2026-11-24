import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../lib/audit.js';

const router = Router();

const STATUSES = [
  'pending', 'processing', 'packed', 'ready_to_ship', 'shipped',
  'delivered', 'cancelled', 'returned', 'refund_initiated', 'refund_completed',
];

// Valid next-states per current status — the admin's status dropdown only ever offers these, and
// PUT/PATCH reject anything outside this map. Mirrored in admin/src/pages/OrdersPage.tsx
// (NEXT_STATUSES) so the client can build the same dropdown options without a round trip; keep
// both in sync by hand if this changes, there's no shared package between the two codebases.
const NEXT_STATUSES = {
  pending: ['packed', 'cancelled'],
  processing: ['packed', 'cancelled'],
  packed: ['ready_to_ship', 'shipped', 'cancelled'],
  ready_to_ship: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  returned: ['refund_initiated'],
  refund_initiated: ['refund_completed'],
  refund_completed: [],
};

// Fixed rupee threshold rather than a live "top 10% by total" percentile — a percentile shifts
// under every admin's feet as new orders come in (what counted as "high value" this morning might
// not by this afternoon), which makes it useless as a stable signal for ops staff. A fixed number
// is what most real seller-ops tools actually use for this kind of flag. Tune here if the store's
// typical order value changes.
const HIGH_VALUE_THRESHOLD = 3000;

const ORDER_SELECT = `
  id, order_number, status, customer_name, customer_email, customer_phone, shipping_address,
  subtotal, shipping_fee, discount_amount, coupon_code, total, payment_method, payment_status,
  tracking_number, courier, shipped_at, delivered_at, notes, created_at, updated_at,
  order_items(id, product_name, variant_label, quantity, unit_price, line_total,
    product_variants(products(image_url)))
`;

function generateOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `SR-${stamp}-${rand}`;
}

// Flattens the double-hop order_items -> product_variants -> products join into a plain
// image_url per line item, and adds the two computed flags the ops console needs. Applied to
// every order the list/detail endpoints return, so the client never has to compute this itself.
function decorateOrder(row) {
  const now = Date.now();
  const hoursSinceCreated = (now - new Date(row.created_at).getTime()) / 3_600_000;
  const hoursSinceUpdated = (now - new Date(row.updated_at).getTime()) / 3_600_000;

  // "Still pending >24h" or "packed but never shipped, and hasn't moved in >24h" — updated_at is
  // the best available proxy for "time since it became packed" since there's no packed_at column
  // (only shipped_at/delivered_at, phase11_orders_ops.sql — those two stages have a real one-way
  // transition worth timestamping; earlier stages don't need their own column for this).
  const sla_breached =
    (row.status === 'pending' && hoursSinceCreated > 24) ||
    (row.status === 'packed' && !row.shipped_at && hoursSinceUpdated > 24);

  const order_items = (row.order_items || []).map((item) => ({
    id: item.id,
    product_name: item.product_name,
    variant_label: item.variant_label,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.line_total,
    image_url: item.product_variants?.products?.image_url ?? null,
  }));

  return {
    ...row,
    order_items,
    sla_breached,
    high_value: Number(row.total) >= HIGH_VALUE_THRESHOLD,
  };
}

// Applies every filter except `status` (used separately so tab counts can respect search/date/etc
// filters without being constrained by the active tab itself) and pagination.
function applyFilters(query, params) {
  const { date_from, date_to, payment_status, min_total, max_total, city, pincode, courier, search } = params;

  if (date_from) query = query.gte('created_at', date_from);
  if (date_to) query = query.lte('created_at', date_to);
  if (payment_status) query = query.eq('payment_status', payment_status);
  if (min_total) query = query.gte('total', Number(min_total));
  if (max_total) query = query.lte('total', Number(max_total));
  // shipping_address is jsonb ({ address, city, district, pincode, country } — see
  // html/checkout.html); PostgREST supports the ->> text-extraction operator directly in a
  // filter's column name.
  if (city) query = query.eq('shipping_address->>city', city);
  if (pincode) query = query.eq('shipping_address->>pincode', pincode);
  if (courier) query = query.eq('courier', courier);
  if (search) {
    const term = `%${search}%`;
    query = query.or(
      `order_number.ilike.${term},customer_name.ilike.${term},customer_phone.ilike.${term},tracking_number.ilike.${term}`
    );
  }
  return query;
}

// Declared before /:id so literal sub-paths (couriers, bulk) don't get swallowed by the :id param
// route below — same convention as the /barcode/:code route in server/routes/products.js.
router.get('/couriers', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin.from('orders').select('courier').not('courier', 'is', null);
  if (error) return res.status(500).json({ error: error.message });

  const couriers = Array.from(new Set(data.map((r) => r.courier).filter(Boolean))).sort();
  res.json({ couriers });
});

// Bulk status update — validates every order's current status against NEXT_STATUSES individually
// (a mixed selection can be at different stages) rather than rejecting the whole batch over one
// invalid transition, so the client can optimistically apply the ones that succeeded and toast
// the ones that didn't.
router.patch('/bulk', requireAuth, async (req, res) => {
  const { ids, status } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids must be a non-empty array' });
  }
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
  }

  const { data: currentRows, error: fetchError } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, status')
    .in('id', ids);
  if (fetchError) return res.status(500).json({ error: fetchError.message });

  const timestampPatch = {};
  if (status === 'shipped') timestampPatch.shipped_at = new Date().toISOString();
  if (status === 'delivered') timestampPatch.delivered_at = new Date().toISOString();

  const updated = [];
  const failed = [];

  for (const row of currentRows) {
    const allowed = NEXT_STATUSES[row.status] || [];
    if (!allowed.includes(status)) {
      failed.push({ id: row.id, order_number: row.order_number, reason: `Cannot move from "${row.status}" to "${status}"` });
      continue;
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status, updated_at: new Date().toISOString(), ...timestampPatch })
      .eq('id', row.id);

    if (updateError) {
      failed.push({ id: row.id, order_number: row.order_number, reason: updateError.message });
      continue;
    }

    updated.push(row.id);
    logAudit({
      actorEmail: req.user.email,
      action: 'status_change',
      entityType: 'order',
      entityId: row.id,
      details: { order_number: row.order_number, old_status: row.status, new_status: status, bulk: true },
    });
  }

  const notFound = ids.filter((id) => !currentRows.some((r) => r.id === id));
  for (const id of notFound) failed.push({ id, order_number: null, reason: 'Order not found' });

  res.json({ updated, failed });
});

router.get('/', requireAuth, async (req, res) => {
  const {
    status, date_from, date_to, payment_status, min_total, max_total,
    city, pincode, courier, search, limit, offset,
  } = req.query;

  const filterParams = { date_from, date_to, payment_status, min_total, max_total, city, pincode, courier, search };
  const pageLimit = Math.min(Number(limit) || 25, 200);
  const pageOffset = Math.max(Number(offset) || 0, 0);

  // Tab counts, computed off the SAME filters (minus status) as the page query, so counts reflect
  // "how many pending orders match the current search/date/etc filters" — matches how Flipkart/
  // Myntra seller-hub tab counts behave, not a global unfiltered count.
  const countsQuery = applyFilters(supabaseAdmin.from('orders').select('status'), filterParams);
  const { data: countsRows, error: countsError } = await countsQuery;
  if (countsError) return res.status(500).json({ error: countsError.message });

  const counts = { all: countsRows.length };
  for (const row of countsRows) counts[row.status] = (counts[row.status] || 0) + 1;

  let query = applyFilters(
    supabaseAdmin.from('orders').select(ORDER_SELECT, { count: 'exact' }),
    filterParams
  );
  if (status) query = query.eq('status', status);
  query = query.order('created_at', { ascending: false }).range(pageOffset, pageOffset + pageLimit - 1);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({
    orders: data.map(decorateOrder),
    total: count ?? data.length,
    limit: pageLimit,
    offset: pageOffset,
    counts,
  });
});

router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(ORDER_SELECT)
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: error.message });

  // Status timeline for the drawer — reuses audit_logs (server/lib/audit.js) rather than a new
  // table, since PUT/PATCH already write a status_change row here on every real transition
  // (Module 24, phase5_audit_logs.sql).
  const { data: timeline } = await supabaseAdmin
    .from('audit_logs')
    .select('id, actor_email, details, created_at')
    .eq('entity_type', 'order')
    .eq('entity_id', req.params.id)
    .eq('action', 'status_change')
    .order('created_at', { ascending: true });

  res.json({ order: decorateOrder(data), timeline: timeline || [] });
});

// Creates an order and its line items, and decrements stock for each variant sold.
// Admin-entered (phone/manual) orders — the public storefront checkout is server/routes/public.js
// POST /orders, a separate guest-facing endpoint.
router.post('/', requireAuth, async (req, res) => {
  const { customer_id, customer_name, customer_email, customer_phone, shipping_address, shipping_fee, notes, items } = req.body;

  if (!customer_name || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'customer_name and at least one item are required' });
  }

  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const total = subtotal + Number(shipping_fee || 0);

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      order_number: generateOrderNumber(),
      customer_id: customer_id || null,
      customer_name,
      customer_email: customer_email || null,
      customer_phone: customer_phone || null,
      shipping_address: shipping_address || null,
      subtotal,
      shipping_fee: shipping_fee || 0,
      total,
      notes: notes || null,
    })
    .select()
    .single();

  if (orderError) return res.status(400).json({ error: orderError.message });

  const rows = items.map((item) => ({
    order_id: order.id,
    variant_id: item.variant_id || null,
    product_name: item.product_name,
    variant_label: item.variant_label || null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.unit_price * item.quantity,
  }));

  const { error: itemsError } = await supabaseAdmin.from('order_items').insert(rows);
  if (itemsError) return res.status(400).json({ error: itemsError.message });

  // Best-effort stock decrement per line item — not wrapped in a DB transaction (no RPC for this
  // path), so a mid-loop failure can leave stock partially decremented for this order.
  for (const item of items) {
    if (!item.variant_id) continue;
    const { data: variant } = await supabaseAdmin
      .from('product_variants')
      .select('stock_quantity')
      .eq('id', item.variant_id)
      .single();
    if (!variant) continue;
    await supabaseAdmin
      .from('product_variants')
      .update({ stock_quantity: Math.max(0, variant.stock_quantity - item.quantity) })
      .eq('id', item.variant_id);
  }

  res.status(201).json({ order });
});

router.put('/:id', requireAuth, async (req, res) => {
  const { status, tracking_number, courier, notes, payment_status } = req.body;

  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${STATUSES.join(', ')}` });
  }

  const { data: before } = await supabaseAdmin.from('orders').select('status, order_number').eq('id', req.params.id).single();

  if (status !== undefined && before && status !== before.status) {
    const allowed = NEXT_STATUSES[before.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Cannot move from "${before.status}" to "${status}"` });
    }
  }

  const patch = { updated_at: new Date().toISOString() };
  if (status !== undefined) patch.status = status;
  if (tracking_number !== undefined) patch.tracking_number = tracking_number;
  if (courier !== undefined) patch.courier = courier;
  if (notes !== undefined) patch.notes = notes;
  if (payment_status !== undefined) patch.payment_status = payment_status;
  // Set automatically on the real transition rather than trusted from the client — these back
  // the SLA calculation in decorateOrder(), so they need to reflect when the status actually
  // changed, not whenever someone happens to PUT a timestamp.
  if (status === 'shipped') patch.shipped_at = new Date().toISOString();
  if (status === 'delivered') patch.delivered_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update(patch)
    .eq('id', req.params.id)
    .select(ORDER_SELECT)
    .single();

  if (error) return res.status(400).json({ error: error.message });

  if (status !== undefined && before && before.status !== status) {
    logAudit({
      actorEmail: req.user.email,
      action: 'status_change',
      entityType: 'order',
      entityId: req.params.id,
      details: { order_number: before.order_number, old_status: before.status, new_status: status },
    });
  }

  res.json({ order: decorateOrder(data) });
});

export default router;
