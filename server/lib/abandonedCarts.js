import { supabaseAdmin } from '../config/supabase.js';
import * as whatsapp from './whatsapp.js';

export const ABANDON_HOURS = 24;

const TEMPLATE_NAME = process.env.WHATSAPP_ABANDONED_CART_TEMPLATE;
const TEMPLATE_LANG = process.env.WHATSAPP_ABANDONED_CART_TEMPLATE_LANG || 'en';

export function isReminderConfigured() {
  return whatsapp.isConfigured() && Boolean(TEMPLATE_NAME);
}

// A cart counts as abandoned once it's been idle for minIdleHours with no order placed since —
// checkout deletes the row entirely (server/routes/public.js POST /orders) — and no reminder sent
// yet for this abandonment episode. notified_at is reset to null on every cart touch, so a
// customer who comes back and abandons again later gets a fresh reminder rather than being
// silenced forever.
//
// minIdleHours defaults to ABANDON_HOURS (the actual WhatsApp-reminder threshold, used by
// runScheduledReminders below) but the admin list view (server/routes/abandonedCarts.js) passes a
// shorter window (1h/12h) to show earlier-stage abandonment too — that's a viewing filter only,
// it doesn't change when the automatic reminder fires.
export async function findAbandonedCarts(minIdleHours = ABANDON_HOURS) {
  const cutoff = new Date(Date.now() - minIdleHours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('carts')
    .select(
      `id, updated_at, notified_at,
       customer:customers(id, first_name, last_name, name, email, phone),
       cart_items(id, quantity, variant:product_variants(id, size, color, price, product:products(id, name, image_url)))`
    )
    .lt('updated_at', cutoff)
    .is('notified_at', null)
    .order('updated_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export function cartValue(cart) {
  return cart.cart_items.reduce((sum, item) => sum + (item.variant?.price || 0) * item.quantity, 0);
}

// Sends the single WhatsApp reminder for one abandoned cart and marks it notified. Used by both
// the admin "Send reminder" button (server/routes/abandonedCarts.js) and the scheduler below —
// same function either way, so there's exactly one place this can go wrong.
export async function sendReminder(cart) {
  if (!isReminderConfigured()) {
    throw new Error(
      'WhatsApp abandoned-cart reminders are not configured yet (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ABANDONED_CART_TEMPLATE).'
    );
  }
  const phone = cart.customer?.phone;
  if (!phone) throw new Error('This customer has no phone number on file');

  const firstName = cart.customer.first_name || cart.customer.name || 'there';

  // Assumes the common "Hi {{1}}, you left something in your cart" shape — one body variable.
  // Adjust this to match whatever variables the template actually has once it's approved; Meta
  // rejects the send outright if the parameter count doesn't match the template.
  await whatsapp.sendTemplate(phone, TEMPLATE_NAME, TEMPLATE_LANG, [
    { type: 'body', parameters: [{ type: 'text', text: firstName }] },
  ]);

  const { error } = await supabaseAdmin
    .from('carts')
    .update({ notified_at: new Date().toISOString() })
    .eq('id', cart.id);
  if (error) throw new Error(error.message);
}

// Called on a timer from server/index.js. Only fires while the server process is actually
// running — Render's free tier spins a web service down after ~15 min idle, so this won't fire
// reliably there; an always-on paid plan, or an external cron hitting a dedicated endpoint, is
// the real fix if that matters. Best-effort: one cart failing (no phone on file, a transient
// WhatsApp API error) doesn't stop the rest from being checked.
export async function runScheduledReminders() {
  if (!isReminderConfigured()) return { sent: 0, skipped: 0, configured: false };

  const carts = await findAbandonedCarts();
  let sent = 0;
  let skipped = 0;
  for (const cart of carts) {
    try {
      await sendReminder(cart);
      sent += 1;
    } catch (err) {
      skipped += 1;
      console.error(`Abandoned-cart reminder failed for cart ${cart.id}:`, err.message);
    }
  }
  return { sent, skipped, configured: true };
}
