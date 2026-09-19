import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { logAudit } from '../lib/audit.js';
import { generateUniqueBarcode } from '../lib/barcode.js';

const router = Router();

// Barcode scan-to-lookup — declared before `/:id` so `/barcode/ELR...` doesn't get swallowed.
router.get('/barcode/:code', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*, category:categories(id, name), product_variants(*), product_images(*)')
    .eq('barcode', req.params.code)
    .single();

  if (error) return res.status(404).json({ error: 'No product matches that barcode' });
  res.json({ product: data });
});

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*, category:categories(id, name), product_variants(*), product_images(*)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ products: data });
});

router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*, category:categories(id, name), product_variants(*), product_images(*)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: error.message });
  res.json({ product: data });
});

router.post('/', requireAuth, async (req, res) => {
  const { variants, images, barcode: _ignoredBarcode, ...product } = req.body;

  // Barcode is always server-generated, never client-supplied
  product.barcode = await generateUniqueBarcode();

  // Normalize tags to lowercase array
  if (product.tags && Array.isArray(product.tags)) {
    product.tags = product.tags.map(t => t.trim().toLowerCase()).filter(Boolean);
  }

  const { data: created, error } = await supabaseAdmin.from('products').insert(product).select().single();
  if (error) return res.status(400).json({ error: error.message });

  if (Array.isArray(variants) && variants.length > 0) {
    const rows = variants.map((v) => ({ ...v, product_id: created.id }));
    const { error: variantError } = await supabaseAdmin.from('product_variants').insert(rows);
    if (variantError) return res.status(400).json({ error: variantError.message });
  }

  if (Array.isArray(images) && images.length > 0) {
    const rows = images.map((img) => ({ ...img, product_id: created.id }));
    const { error: imageError } = await supabaseAdmin.from('product_images').insert(rows);
    if (imageError) return res.status(400).json({ error: imageError.message });
  }

  res.status(201).json({ product: created });
});

router.put('/:id', requireAuth, async (req, res) => {
  const { variants, images, barcode: _ignoredBarcode, ...product } = req.body;

  const { data: before } = await supabaseAdmin
    .from('products')
    .select('base_price, name, barcode')
    .eq('id', req.params.id)
    .single();

  // Barcode is immutable once assigned. Only generate if missing.
  if (before && !before.barcode) {
    product.barcode = await generateUniqueBarcode();
  }

  // Normalize tags to lowercase array
  if (product.tags && Array.isArray(product.tags)) {
    product.tags = product.tags.map(t => t.trim().toLowerCase()).filter(Boolean);
  }

  const { data: updated, error } = await supabaseAdmin
    .from('products')
    .update({ ...product, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  if (before && product.base_price !== undefined && Number(before.base_price) !== Number(product.base_price)) {
    logAudit({
      actorEmail: req.user.email,
      action: 'price_change',
      entityType: 'product',
      entityId: req.params.id,
      details: { name: before.name, old_price: before.base_price, new_price: product.base_price },
    });
  }

  if (Array.isArray(variants)) {
    const { data: existingVariants } = await supabaseAdmin
      .from('product_variants')
      .select('id, size, color')
      .eq('product_id', req.params.id);

    const existingByKey = new Map((existingVariants || []).map((v) => [`${v.size}|${v.color}`, v.id]));
    const submittedKeys = new Set(variants.map((v) => `${v.size}|${v.color}`));

    const toUpdate = [];
    const toInsert = [];
    for (const v of variants) {
      const key = `${v.size}|${v.color}`;
      const existingId = existingByKey.get(key);
      if (existingId) {
        toUpdate.push({ ...v, id: existingId, product_id: req.params.id });
      } else {
        toInsert.push({ ...v, product_id: req.params.id });
      }
    }

    const idsToDelete = (existingVariants || [])
      .filter((v) => !submittedKeys.has(`${v.size}|${v.color}`))
      .map((v) => v.id);

    if (idsToDelete.length > 0) {
      await supabaseAdmin.from('product_variants').delete().in('id', idsToDelete);
    }
    if (toUpdate.length > 0) {
      const { error: updateError } = await supabaseAdmin.from('product_variants').upsert(toUpdate);
      if (updateError) return res.status(400).json({ error: updateError.message });
    }
    if (toInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin.from('product_variants').insert(toInsert);
      if (insertError) return res.status(400).json({ error: insertError.message });
    }
  }

  // Images are always submitted as the full set for the product (admin builds them per colour
  // group client-side), so a full replace is simpler and safer than diffing by id — nothing else
  // references product_images.id.
  if (Array.isArray(images)) {
    const { error: deleteError } = await supabaseAdmin.from('product_images').delete().eq('product_id', req.params.id);
    if (deleteError) return res.status(400).json({ error: deleteError.message });

    if (images.length > 0) {
      const rows = images.map((img) => ({ ...img, product_id: req.params.id }));
      const { error: insertImageError } = await supabaseAdmin.from('product_images').insert(rows);
      if (insertImageError) return res.status(400).json({ error: insertImageError.message });
    }
  }

  res.json({ product: updated });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { data: deleted } = await supabaseAdmin.from('products').select('name').eq('id', req.params.id).single();

  const { error } = await supabaseAdmin.from('products').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });

  logAudit({
    actorEmail: req.user.email,
    action: 'delete',
    entityType: 'product',
    entityId: req.params.id,
    details: { name: deleted ? deleted.name : undefined },
  });

  res.status(204).send();
});

export default router;