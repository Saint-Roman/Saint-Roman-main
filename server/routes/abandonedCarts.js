import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { findAbandonedCarts, cartValue, sendReminder, isReminderConfigured } from '../lib/abandonedCarts.js';

const router = Router();

router.use(requireAuth);

// List of carts idle for 24h+ with no reminder sent yet for the current abandonment episode —
// see server/lib/abandonedCarts.js for exactly what "abandoned" means here.
router.get('/', async (req, res) => {
  try {
    const carts = await findAbandonedCarts();
    res.json({
      configured: isReminderConfigured(),
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
