// Admin Customers list — CRUD + live order_count/lifetime_value, used by CustomersPage.tsx and the
// Orders "New order" customer picker (both call GET /api/customers).
//
// This file used to be a near-duplicate of routes/customer.js (singular, mounted at /api/customer)
// — same profile/password/addresses/orders/wishlist routes behind a customer JWT, but dead: nothing
// on the storefront ever called /api/customers/* (confirmed — html/js/auth.js's SaintRomanAuth hits
// /api/customer, singular, exclusively). Meanwhile the admin's Customers page has called
// GET /api/customers since it was first built and always 404'd, because this plural path had no
// bare GET / handler — only /profile, /orders, etc. Replaced with the real admin endpoint instead
// of leaving two files fighting over what "/api/customers" means.

import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { loadCustomersWithStats } from '../lib/customerStats.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const customers = await loadCustomersWithStats();
    res.json({ customers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { name, email, phone, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const { data, error } = await supabaseAdmin
    .from('customers')
    .insert({ name, email: email || null, phone: phone || null, notes: notes || null })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ customer: { ...data, order_count: 0, lifetime_value: 0 } });
});

router.put('/:id', requireAuth, async (req, res) => {
  const { name, email, phone, notes } = req.body;
  const patch = { updated_at: new Date().toISOString() };
  if (name !== undefined) patch.name = name;
  if (email !== undefined) patch.email = email;
  if (phone !== undefined) patch.phone = phone;
  if (notes !== undefined) patch.notes = notes;

  const { data, error } = await supabaseAdmin.from('customers').update(patch).eq('id', req.params.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ customer: data });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin.from('customers').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

export default router;
