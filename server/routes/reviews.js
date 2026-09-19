import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Optional ?product_id=... to scope to one product's reviews (used by the product edit dialog).
router.get('/', requireAuth, async (req, res) => {
  let query = supabaseAdmin
    .from('product_reviews')
    .select('*, product:products(id, name)')
    .order('created_at', { ascending: false });

  if (req.query.product_id) {
    query = query.eq('product_id', req.query.product_id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ reviews: data });
});

router.post('/', requireAuth, async (req, res) => {
  const { product_id, author_name, rating, title, body } = req.body;

  if (!product_id || !author_name || !rating) {
    return res.status(400).json({ error: 'product_id, author_name and rating are required' });
  }

  const { data, error } = await supabaseAdmin
    .from('product_reviews')
    .insert({
      product_id,
      author_name,
      rating: Number(rating),
      title: title || null,
      body: body || null,
      is_published: req.body.is_published !== false,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ review: data });
});

router.put('/:id', requireAuth, async (req, res) => {
  const { product_id: _ignoredProductId, ...patch } = req.body;

  const { data, error } = await supabaseAdmin
    .from('product_reviews')
    .update(patch)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ review: data });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabaseAdmin.from('product_reviews').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});

export default router;
