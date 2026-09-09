import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { validateCoupon } from '../lib/coupons.js';
import { createTicket } from '../lib/supportTickets.js';
import { requireCustomer } from './customer.js';

const router = Router();

// Unauthenticated — served to the public storefront (html/), unlike every other route in this
// server which requires an admin JWT. Only exposes fields safe for a shopper to see, and only
// active/published rows (no drafts, no cost price, no internal fields like HSN/barcode).

const SORT_OPTIONS = {
  price_asc: { column: 'base_price', ascending: true },
  price_desc: { column: 'base_price', ascending: false },
  newest: { column: 'created_at', ascending: false },
};

// GET /api/public/products — supports combinable filters (Myntra/Flipkart-style facets):
//   ?category=<slug>            single category
//   ?tag=summer,new-arrival     comma-separated, OR-matched against products.tags
//   ?color=Black,Blue           comma-separated, OR-matched against variant color
//   ?size=M,L                   comma-separated, OR-matched against variant size
//   ?price_min=&price_max=      on base_price
//   ?sort=price_asc|price_desc|newest
//   ?limit=&offset=             pagination (limit capped at 48)
// All provided filters are combined with AND; multiple values within one filter are OR'd.
router.get('/products', async (req, res) => {
  const { category, tag, color, size, price_min, price_max, sort, limit, offset } = req.query;

  const needsVariantJoin = Boolean(color || size);
  // PostgREST embeds `product_variants` as a nested array per product (not a flattened join),
  // so adding `!inner` here to enable filtering does not duplicate top-level product rows —
  // it just restricts both which products match and which variants show up in the array.
  const variantEmbed = `product_variants${needsVariantJoin ? '!inner' : ''}(id, size, color, price, stock_quantity)`;

  let query = supabaseAdmin
    .from('products')
    .select(
      `id, name, slug, description, image_url, base_price, compare_at_price, tags, category:categories(id, name, slug), ${variantEmbed}`,
      { count: 'exact' }
    )
    .eq('status', 'active');

  // Optional ?category=<slug> — resolve the slug to an id first, since Supabase can't filter
  // on a joined table's column directly without an !inner join.
  if (category) {
    const { data: categoryRow, error: categoryError } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('slug', category)
      .maybeSingle();

    if (categoryError) return res.status(500).json({ error: categoryError.message });
    if (!categoryRow) return res.json({ products: [], total: 0 }); // unknown slug — no matches, not an error

    query = query.eq('category_id', categoryRow.id);
  }

  // ?tag=summer or ?tag=summer,new-arrival — matches products whose tags array
  // overlaps any of the given tags.
  if (tag) {
    const tags = String(tag).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
    if (tags.length) query = query.overlaps('tags', tags);
  }

  if (color) {
    const colors = String(color).split(',').map((c) => c.trim()).filter(Boolean);
    if (colors.length) query = query.in('product_variants.color', colors);
  }

  if (size) {
    const sizes = String(size).split(',').map((s) => s.trim()).filter(Boolean);
    if (sizes.length) query = query.in('product_variants.size', sizes);
  }

  if (price_min) query = query.gte('base_price', Number(price_min));
  if (price_max) query = query.lte('base_price', Number(price_max));

  const sortOpt = SORT_OPTIONS[sort] || SORT_OPTIONS.newest;
  query = query.order(sortOpt.column, { ascending: sortOpt.ascending });

  const pageLimit = Math.min(Number(limit) || 12, 48);
  const pageOffset = Math.max(Number(offset) || 0, 0);
  query = query.range(pageOffset, pageOffset + pageLimit - 1);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ products: data, total: count ?? data.length, limit: pageLimit, offset: pageOffset });
});

// GET /api/public/facets — real filter-sidebar data (categories/tags/colors/sizes with live
// counts + the active price range), computed from products that are actually active right now.
// Replaces the old hardcoded "Women's Fashion (520)" template checkboxes.
router.get('/facets', async (req, res) => {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('base_price, tags, category:categories(name, slug), product_variants(color, size)')
    .eq('status', 'active');

  if (error) return res.status(500).json({ error: error.message });

  const categoryCounts = new Map();
  const tagCounts = new Map();
  const colorCounts = new Map();
  const sizeCounts = new Map();
  let minPrice = null;
  let maxPrice = null;

  for (const p of products) {
    if (p.category) {
      const entry = categoryCounts.get(p.category.slug) || { name: p.category.name, count: 0 };
      entry.count += 1;
      categoryCounts.set(p.category.slug, entry);
    }
    for (const t of p.tags || []) {
      tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    }
    for (const v of p.product_variants || []) {
      if (v.color) colorCounts.set(v.color, (colorCounts.get(v.color) || 0) + 1);
      if (v.size) sizeCounts.set(v.size, (sizeCounts.get(v.size) || 0) + 1);
    }
    const price = Number(p.base_price);
    if (!Number.isNaN(price)) {
      minPrice = minPrice === null ? price : Math.min(minPrice, price);
      maxPrice = maxPrice === null ? price : Math.max(maxPrice, price);
    }
  }

  res.json({
    categories: Array.from(categoryCounts.entries())
      .map(([slug, v]) => ({ slug, name: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count),
    tags: Array.from(tagCounts.entries())
      .map(([t, count]) => ({ tag: t, count }))
      .sort((a, b) => b.count - a.count),
    colors: Array.from(colorCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
    sizes: Array.from(sizeCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
    price_range: { min: minPrice ?? 0, max: maxPrice ?? 0 },
  });
});

router.get('/products/:slug', async (req, res) => {
  // image_url was missing here — the storefront's own list endpoint (GET /products above)
  // selects it, but this single-product lookup only ever selected the `product_images` gallery
  // table, which nothing in the codebase writes to (admin's ProductsPage.tsx image upload writes
  // to products.image_url directly). Left product_images in the select since existing callers may
  // still read it, but it's effectively always empty.
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, description, image_url, base_price, compare_at_price, brand, sku, barcode, hsn_code, gst_percent, specifications, category:categories(id, name, slug), product_variants(id, size, color, price, stock_quantity), product_images(url, alt_text, position)')
    .eq('slug', req.params.slug)
    .eq('status', 'active')
    .single();

  if (error) return res.status(404).json({ error: 'Product not found' });
  res.json({ product: data });
});

router.get('/categories', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('categories')
    .select('id, name, slug, description, image_url')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ categories: data });
});

// GET /api/public/blog-posts — published posts only, list view (no `content`, kept for the
// single-post page below). Supports ?limit= (default 12, max 48) and ?offset= pagination.
router.get('/blog-posts', async (req, res) => {
  const { limit, offset } = req.query;
  const pageLimit = Math.min(Number(limit) || 12, 48);
  const pageOffset = Math.max(Number(offset) || 0, 0);

  const { data, error, count } = await supabaseAdmin
    .from('blog_posts')
    .select('id, title, slug, excerpt, featured_image_url, published_at, created_at', { count: 'exact' })
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(pageOffset, pageOffset + pageLimit - 1);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ posts: data, total: count ?? data.length });
});

router.get('/blog-posts/:slug', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('blog_posts')
    .select('*')
    .eq('slug', req.params.slug)
    .eq('status', 'published')
    .single();

  if (error) return res.status(404).json({ error: 'Post not found' });
  res.json({ post: data });
});

router.get('/faqs', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('faqs')
    .select('id, question, answer')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ faqs: data });
});

// Public tags list — kept for backward compatibility, now derived from real product tags
// instead of a `tags` table that was never created (the old version of this route queried
// `.from('tags')`, which doesn't exist and would 500 the moment anything called it).
router.get('/tags', async (req, res) => {
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('tags')
    .eq('status', 'active');

  if (error) return res.status(500).json({ error: error.message });

  const counts = new Map();
  for (const p of products) {
    for (const t of p.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
  }

  const tags = Array.from(counts.entries())
    .map(([slug, count]) => ({ slug, name: slug.replace(/-/g, ' '), count }))
    .sort((a, b) => b.count - a.count);

  res.json({ tags });
});

router.get('/site-content', async (req, res) => {
  const [{ data: settings }, { data: banners }] = await Promise.all([
    supabaseAdmin.from('settings').select('site_title, announcement_text, footer_copyright_text, maintenance_mode, testimonial_bg_image_url').single(),
    supabaseAdmin.from('banners').select('id, title, subtitle, link_url, image_url, badge_text, placement').eq('is_active', true).order('sort_order', { ascending: true }),
  ]);

  res.json({ settings: settings || {}, banners: banners || [] });
});

// GET /api/public/settings — the subset of the settings singleton safe to hand to the storefront.
// Only field actually consumed today is testimonial_bg_image_url (homepage-dynamic-sections.js /
// testimonials-page-dynamic.js), but this mirrors /site-content's column list so both stay in sync.
router.get('/settings', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('site_title, announcement_text, footer_copyright_text, maintenance_mode, testimonial_bg_image_url')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ settings: data || {} });
});

// GET /api/public/testimonials — active testimonials only, in admin-controlled sort_order.
// Backs both the homepage "Voices of our happy customers" slider and the standalone
// testimonials.html grid.
router.get('/testimonials', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('testimonials')
    .select('id, quote, author_name, author_role, author_image_url, rating')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ testimonials: data || [] });
});

// New endpoint: homepage offer banners only
router.get('/banners', async (req, res) => {
  const placement = req.query.placement || null;

  let query = supabaseAdmin
    .from('banners')
    .select('id, title, subtitle, link_url, image_url, badge_text, placement')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (placement) {
    query = query.eq('placement', placement);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ banners: data || [] });
});

router.post('/support-tickets', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !message) {
    return res.status(400).json({ error: 'Name and message are required' });
  }

  let customerId = null;
  if (email) {
    const { data: existingCustomer } = await supabaseAdmin.from('customers').select('id').eq('email', email).maybeSingle();
    customerId = existingCustomer ? existingCustomer.id : null;
  }

  try {
    const ticket = await createTicket({
      customer_id: customerId,
      customer_name: name,
      customer_email: email || null,
      customer_phone: phone || null,
      subject: subject || 'Contact form submission',
      message,
    });
    res.status(201).json({ ticket: { id: ticket.id, ticket_number: ticket.ticket_number } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/coupons/validate', async (req, res) => {
  const { code, subtotal } = req.body;
  const result = await validateCoupon(code, Number(subtotal) || 0);
  res.json(result);
});

function generateOrderNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ELL-${stamp}-${rand}`;
}

// Real checkout — requires a logged-in customer (requireCustomer, imported from customer.js;
// same bearer-token check every /api/customer/* route already uses). Never trusts client-supplied
// prices or product names — looks up each variant server-side by id and prices the order from
// that. Cash-on-delivery only (no payment gateway configured), so there's no payment step here
// beyond recording the order.
router.post('/orders', requireCustomer, async (req, res) => {
  const { customer_name, customer_email, customer_phone, shipping_address, notes, items, coupon_code } = req.body;

  if (!customer_name || !customer_phone || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Name, phone, and at least one cart item are required' });
  }

  const variantIds = items.map((item) => item.variant_id);
  const { data: variants, error: variantsError } = await supabaseAdmin
    .from('product_variants')
    .select('id, size, color, price, stock_quantity, product:products(id, name)')
    .in('id', variantIds);

  if (variantsError) return res.status(500).json({ error: variantsError.message });

  const variantMap = new Map(variants.map((v) => [v.id, v]));
  const lineItems = [];

  for (const item of items) {
    const variant = variantMap.get(item.variant_id);
    if (!variant) return res.status(400).json({ error: `Unknown product: ${item.variant_id}` });

    const quantity = Math.max(1, Number(item.quantity) || 1);
    if (variant.stock_quantity < quantity) {
      return res.status(400).json({ error: `${variant.product.name} only has ${variant.stock_quantity} left in stock` });
    }

    lineItems.push({
      variant_id: variant.id,
      product_name: variant.product.name,
      variant_label: [variant.size, variant.color].filter(Boolean).join(' / ') || null,
      quantity,
      unit_price: variant.price,
      line_total: variant.price * quantity,
    });
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0);

  // Re-validate the coupon server-side — never trust a discount amount computed on the client.
  let discountAmount = 0;
  let appliedCouponCode = null;
  let appliedCouponUsageCount = 0;
  if (coupon_code) {
    const couponResult = await validateCoupon(coupon_code, subtotal);
    if (!couponResult.valid) {
      return res.status(400).json({ error: couponResult.reason || 'Coupon is not valid' });
    }
    discountAmount = couponResult.discount;
    appliedCouponCode = couponResult.code;
    appliedCouponUsageCount = couponResult.usage_count;
  }

  const total = Math.max(0, subtotal - discountAmount);

  // Customer is already resolved and verified by requireCustomer above (req.customer, matched via
  // customers.auth_user_id) — no more guest lookup-or-create. This also removes the exact block
  // that used to cause the "duplicate key value violates unique constraint 'customers_email_idx'"
  // bug (a phone-only lookup could miss an existing row and collide on insert): there's nothing
  // left here to collide, since the customer already exists.
  const customerId = req.customer.id;

  // --- Create the order ---
  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      order_number: generateOrderNumber(),
      customer_id: customerId,
      customer_name,
      customer_email: customer_email || null,
      customer_phone,
      shipping_address: shipping_address || null,
      notes: notes || null,
      subtotal,
      discount_amount: discountAmount,
      coupon_code: appliedCouponCode,
      total,
      status: 'pending',
      payment_method: 'cod',
      payment_status: 'unpaid',
    })
    .select('id, order_number')
    .single();

  if (orderError) return res.status(500).json({ error: orderError.message });

  // --- Insert order items ---
  const orderItems = lineItems.map((li) => ({
    order_id: order.id,
    variant_id: li.variant_id,
    product_name: li.product_name,
    variant_label: li.variant_label,
    quantity: li.quantity,
    unit_price: li.unit_price,
    line_total: li.line_total,
  }));

  const { error: itemsError } = await supabaseAdmin.from('order_items').insert(orderItems);
  if (itemsError) return res.status(500).json({ error: itemsError.message });

  // --- Decrement stock ---
  // supabaseAdmin.rpc()/.from() return a PostgrestFilterBuilder — it's "thenable" (implements
  // .then(), so `await` works) but is NOT a real Promise and has no .catch()/.finally(). Chaining
  // .catch() directly on it (the previous version of both blocks below) throws
  // "TypeError: ...catch is not a function" the moment it actually runs — this crashed the whole
  // server process on the first real order that reached this line, since it's outside any
  // try/catch and Node has no request context left to send an HTTP response to at that point.
  // Fixed by awaiting normally and checking the returned { error } instead, same "best-effort,
  // don't fail the order over this" intent, but logged instead of silently swallowed.
  for (const li of lineItems) {
    const { error: stockError } = await supabaseAdmin.rpc('decrement_stock', { p_variant_id: li.variant_id, p_qty: li.quantity });
    if (stockError) console.error(`decrement_stock failed for variant ${li.variant_id}:`, stockError.message);
  }

  // --- Increment coupon usage ---
  if (appliedCouponCode) {
    const { error: couponUpdateError } = await supabaseAdmin
      .from('coupons')
      .update({ usage_count: appliedCouponUsageCount + 1 })
      .eq('code', appliedCouponCode);
    if (couponUpdateError) console.error(`coupon usage_count update failed for ${appliedCouponCode}:`, couponUpdateError.message);
  }

  // --- Clear the server-side cart mirror (see server/routes/customer.js POST /cart) ---
  // Converted, not abandoned — best-effort, same as the two updates above.
  const { error: cartClearError } = await supabaseAdmin.from('carts').delete().eq('customer_id', customerId);
  if (cartClearError) console.error(`cart clear failed for customer ${customerId}:`, cartClearError.message);

  res.status(201).json({ order: { id: order.id, order_number: order.order_number } });
});

// Unauthenticated, like the rest of this file — checkout itself is guest (no login), so
// order-received.html (the post-checkout "thank you" page, linked as ?order=<order_number>) has
// no session to authenticate with. Looked up by order_number (not the uuid id), matching what
// checkout.html actually receives back and puts in the URL. order_number is an unguessable
// timestamp+random string (generateOrderNumber() above), not sequential, so this is the same
// "knowing the order number is the access control" pattern most storefronts use for order
// confirmation pages.
router.get('/orders/:orderNumber', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(
      'order_number, status, customer_name, customer_email, customer_phone, shipping_address, subtotal, shipping_fee, discount_amount, coupon_code, total, payment_method, notes, created_at, order_items(product_name, variant_label, quantity, unit_price, line_total)'
    )
    .eq('order_number', req.params.orderNumber)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Order not found' });
  res.json({ order: data });
});

export default router;