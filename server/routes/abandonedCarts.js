import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { findAbandonedCarts, cartValue, sendReminder, isReminderConfigured, ABANDON_HOURS } from '../lib/abandonedCarts.js';

const router = Router();

router.use(requireAuth);

// Idle-time filter for the admin list view (1h / 12h / 24h) — viewing only, doesn't change when
// the automatic WhatsApp reminder actually fires (still fixed at ABANDON_HOURS, see
// server/lib/abandonedCarts.js). Anything else in the query param falls back to ABANDON_HOURS.
const ALLOWED_HOURS = [1, 12, 24];

// List of carts idle for the requested window with no reminder sent yet for the current
// abandonment episode — see server/lib/abandonedCarts.js for exactly what "abandoned" means here.
router.get('/', async (req, res) => {
  const hours = ALLOWED_HOURS.includes(Number(req.query.hours)) ? Number(req.query.hours) : ABANDON_HOURS;

  try {
    const carts = await findAbandonedCarts(hours);
    res.json({
      configured: isReminderConfigured(),
      hours,
      carts: carts.map((cart) => ({
        id: cart.id,
        updated_at: cart.updated_at,
        notified_at: cart.notified_at,
        value: cartValue(cart),
        customer: cart.customer,
        items: cart.cart_items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          variant_id: item.variant?.id,
          size: item.variant?.size,
          color: item.variant?.color,
          price: item.variant?.price,
          product_name: item.variant?.product?.name,
          image_url: item.variant?.product?.image_url,
        })),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to load abandoned carts' });
  }
});

router.post('/:id/send-reminder', async (req, res) => {
  const { data: cart, error } = await supabaseAdmin
    .from('carts')
    .select(
      `id, updated_at, notified_at,
       customer:customers(id, first_name, last_name, name, email, phone),
       cart_items(id, quantity, variant:product_variants(id, size, color, price, product:products(id, name, image_url)))`
    )
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });
  if (!cart) return res.status(404).json({ error: 'Cart not found' });

  try {
    await sendReminder(cart);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to send reminder' });
  }
});

export default router;
