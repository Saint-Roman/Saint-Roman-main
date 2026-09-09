import { Router } from 'express';
import { supabaseAdmin, supabaseAnon } from '../config/supabase.js';

const router = Router();

// Every route here is a storefront customer acting on their own data — verifies the Supabase
// access token (same mechanism as the admin panel's requireAuth) and resolves it to a `customers`
// row via `customers.auth_user_id`. Deliberately NOT reusing server/middleware/auth.js's
// requireAuth as-is: that middleware also reads `profiles.role`, which doesn't apply to
// customers and would be a wasted/irrelevant lookup here.
export async function requireCustomer(req, res, next) {
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Missing bearer token' });
    }

    const { data, error } = await supabaseAnon.auth.getUser(token);
    if (error || !data?.user) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const { data: customer, error: customerError } = await supabaseAdmin
        .from('customers')
        .select('*')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

    if (customerError) {
        return res.status(500).json({ error: 'Failed to load customer account' });
    }
    if (!customer) {
        return res.status(404).json({ error: 'No customer account found for this login' });
    }

    req.authUser = data.user;
    req.customer = customer;
    next();
}

router.use(requireCustomer);

// ── Profile ── matches account-details.js / account-dashboard.js, which read
// first_name / last_name / display_name / email / phone directly off the response.
router.get('/profile', (req, res) => {
    const { id, first_name, last_name, display_name, email, phone, created_at } = req.customer;
    res.json({ id, first_name, last_name, display_name, email, phone, created_at });
});

router.put('/profile', async (req, res) => {
    const { first_name, last_name, display_name, phone } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (display_name !== undefined) updates.display_name = display_name;
    if (phone !== undefined) updates.phone = phone;
    // Keep the legacy `name` column (used elsewhere, e.g. admin order records) roughly in sync.
    if (first_name !== undefined || last_name !== undefined) {
        updates.name = [first_name ?? req.customer.first_name, last_name ?? req.customer.last_name]
            .filter(Boolean)
            .join(' ')
            .trim() || req.customer.name;
    }

    const { data, error } = await supabaseAdmin
        .from('customers')
        .update(updates)
        .eq('id', req.customer.id)
        .select('id, first_name, last_name, display_name, email, phone, created_at')
        .single();

    if (error) return res.status(500).json({ error: 'Failed to update profile' });
    res.json(data);
});

// account-details.js sends { new_password }, and reads res.success / res.error.
router.put('/password', async (req, res) => {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(req.authUser.id, {
        password: new_password,
    });
    if (error) return res.status(500).json({ error: error.message || 'Failed to update password' });
    res.json({ success: true });
});

// ── Addresses ── account-addresses.js expects exactly ONE billing + ONE shipping address,
// returned as { billing, shipping }, and upserts one of them at a time via PUT with { type, ... }.
router.get('/addresses', async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', req.customer.id);

    if (error) return res.status(500).json({ error: 'Failed to load addresses' });

    const billing = data.find((a) => a.type === 'billing') || null;
    const shipping = data.find((a) => a.type === 'shipping') || null;
    res.json({ billing, shipping });
});

router.put('/addresses', async (req, res) => {
    const { type, full_name, phone, address_line1, address_line2, city, state, postal_code, country } = req.body;

    if (type !== 'billing' && type !== 'shipping') {
        return res.status(400).json({ error: 'type must be "billing" or "shipping"' });
    }
    if (!full_name || !address_line1 || !city || !state || !postal_code) {
        return res.status(400).json({ error: 'Missing required address fields' });
    }

    const { data, error } = await supabaseAdmin
        .from('customer_addresses')
        .upsert(
            {
                customer_id: req.customer.id,
                type,
                full_name,
                phone: phone || null,
                address_line1,
                address_line2: address_line2 || null,
                city,
                state,
                postal_code,
                country: country || 'India',
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'customer_id,type' }
        )
        .select('*')
        .single();

    if (error) return res.status(500).json({ error: 'Failed to save address' });
    res.json(data);
});

// ── Orders (read-only — order creation happens through checkout, not here) ──
// account-orders.js expects { orders: [...] }.
router.get('/orders', async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('orders')
        .select('id, order_number, status, total, created_at, order_items(id, product_name, variant_label, quantity, unit_price, line_total)')
        .eq('customer_id', req.customer.id)
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Failed to load orders' });
    res.json({ orders: data });
});

router.get('/orders/:id', async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', req.params.id)
        .eq('customer_id', req.customer.id) // ownership check
        .maybeSingle();

    if (error) return res.status(500).json({ error: 'Failed to load order' });
    if (!data) return res.status(404).json({ error: 'Order not found' });
    res.json(data);
});

// ── Wishlist ── account-wishlist.js expects { wishlist: [...] } with product fields
// flattened directly onto each item, and item.id used as the DELETE /wishlist/:id product id.
router.get('/wishlist', async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('customer_wishlist')
        .select('created_at, products:product_id(id, name, slug, image_url, base_price, compare_at_price, status)')
        .eq('customer_id', req.customer.id)
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Failed to load wishlist' });

    const wishlist = data
        .filter((row) => row.products) // guard against a product having been deleted
        .map((row) => ({ ...row.products, wishlisted_at: row.created_at }));

    res.json({ wishlist });
});

router.post('/wishlist', async (req, res) => {
    const { product_id } = req.body;
    if (!product_id) return res.status(400).json({ error: 'product_id is required' });

    const { error } = await supabaseAdmin
        .from('customer_wishlist')
        .insert({ customer_id: req.customer.id, product_id });

    // Already wishlisted — treat as success rather than a 500 (unique constraint on customer_id+product_id).
    if (error && error.code !== '23505') {
        return res.status(500).json({ error: 'Failed to add to wishlist' });
    }
    res.status(201).json({ success: true });
});

router.delete('/wishlist/:productId', async (req, res) => {
    const { error, count } = await supabaseAdmin
        .from('customer_wishlist')
        .delete({ count: 'exact' })
        .eq('product_id', req.params.productId)
        .eq('customer_id', req.customer.id);

    if (error) return res.status(500).json({ error: 'Failed to remove from wishlist' });
    if (!count) return res.status(404).json({ error: 'Not in wishlist' });
    res.json({ success: true });
});

// ── Cart sync ── the storefront cart itself still lives entirely in the browser's localStorage
// (html/js/ellora-cart.js) — this just mirrors it server-side on every mutation (best-effort,
// fire-and-forget from the client) so the admin Abandoned Carts page and reminder scheduler
// (server/lib/abandonedCarts.js) have something to read. Full-replace, not a diff/patch, since
// the client always sends its complete current cart.
router.post('/cart', async (req, res) => {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const rows = items
        .filter((i) => i && i.variant_id && Number(i.quantity) > 0)
        .map((i) => ({ variant_id: i.variant_id, quantity: Math.floor(Number(i.quantity)) }));

    if (rows.length === 0) {
        // Empty cart — nothing to abandon.
        const { error } = await supabaseAdmin.from('carts').delete().eq('customer_id', req.customer.id);
        if (error) return res.status(500).json({ error: 'Failed to sync cart' });
        return res.json({ success: true });
    }

    const { data: cart, error: cartError } = await supabaseAdmin
        .from('carts')
        .upsert(
            { customer_id: req.customer.id, notified_at: null, updated_at: new Date().toISOString() },
            { onConflict: 'customer_id' }
        )
        .select('id')
        .single();

    if (cartError) return res.status(500).json({ error: 'Failed to sync cart' });

    const { error: deleteError } = await supabaseAdmin.from('cart_items').delete().eq('cart_id', cart.id);
    if (deleteError) return res.status(500).json({ error: 'Failed to sync cart' });

    const { error: insertError } = await supabaseAdmin
        .from('cart_items')
        .insert(rows.map((r) => ({ cart_id: cart.id, ...r })));
    if (insertError) return res.status(500).json({ error: 'Failed to sync cart' });

    res.json({ success: true });
});

export default router;