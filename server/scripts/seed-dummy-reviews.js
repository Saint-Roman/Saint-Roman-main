import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';

// Load server/.env by absolute path so this still works when run from outside server/
// (bare `dotenv/config` resolves relative to process.cwd(), not this file's location).
dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

const { supabaseAdmin } = await import('../config/supabase.js');

// One-time dummy-data seed so the new rating/review feature has something to show on products
// that don't have any real reviews yet. Only touches products with zero existing reviews, so
// it's safe to re-run — it will never duplicate reviews on a product that already has some
// (real or previously seeded).
// Run: node server/scripts/seed-dummy-reviews.js

const REVIEW_POOL = [
  { author_name: 'Priya Sharma', rating: 5, title: 'Amazing fit and comfort', body: 'Honestly one of the best purchases I\'ve made this year. The fabric feels premium and it fits true to size.' },
  { author_name: 'Ananya Iyer', rating: 5, title: 'Exceeded expectations', body: 'Was a bit skeptical ordering online but this fits perfectly and the quality is really good for the price.' },
  { author_name: 'Rhea Kapoor', rating: 4, title: 'Great quality', body: 'Really happy with this. Fabric is soft and comfortable for all-day wear. Only wish there were more colour options.' },
  { author_name: 'Sneha Reddy', rating: 4, title: 'Good value for money', body: 'Fits well and looks exactly like the pictures. Delivery was quick too.' },
  { author_name: 'Meera Nair', rating: 5, title: 'Perfect!', body: 'This is now my go-to. Comfortable, true to size, and the material holds up well after a few washes.' },
  { author_name: 'Kavya Menon', rating: 3, title: 'Decent, runs a little small', body: 'Product quality is fine but I\'d recommend sizing up. Otherwise comfortable enough for daily wear.' },
  { author_name: 'Ishita Verma', rating: 5, title: 'Loved it', body: 'Super comfortable and the stitching quality is great. Will definitely be ordering more colours.' },
  { author_name: 'Divya Pillai', rating: 4, title: 'Nice product', body: 'Good fit and fabric quality. Packaging was also neat. Would recommend.' },
  { author_name: 'Nikita Joshi', rating: 5, title: 'Worth every rupee', body: 'Fabric is breathable and the fit is exactly as described. No complaints at all.' },
  { author_name: 'Pooja Desai', rating: 4, title: 'Comfortable daily wear', body: 'Been wearing this for a few weeks now and it still holds shape well. Happy with the purchase.' },
  { author_name: 'Aarohi Singh', rating: 3, title: 'Okay for the price', body: 'It\'s decent but not exceptional. Fit is fine, fabric could be a touch softer.' },
  { author_name: 'Tanvi Rao', rating: 5, title: 'Highly recommend', body: 'This exceeded my expectations in every way — comfort, fit, and quality. Buying another one soon.' },
];

function pickRandomReviews(count) {
  const shuffled = [...REVIEW_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const { data: products, error: productsError } = await supabaseAdmin
  .from('products')
  .select('id, name');

if (productsError) {
  console.error('Failed to fetch products:', productsError.message);
  process.exit(1);
}

if (!products || products.length === 0) {
  console.log('No products found. Nothing to seed.');
  process.exit(0);
}

const { data: existingReviews, error: reviewsError } = await supabaseAdmin
  .from('product_reviews')
  .select('product_id');

if (reviewsError) {
  console.error('Failed to fetch existing reviews:', reviewsError.message);
  process.exit(1);
}

const productsWithReviews = new Set((existingReviews || []).map((r) => r.product_id));
const targets = products.filter((p) => !productsWithReviews.has(p.id));

if (targets.length === 0) {
  console.log('Every product already has at least one review. Nothing to seed.');
  process.exit(0);
}

console.log(`Seeding dummy reviews for ${targets.length} product(s) with no existing reviews...`);

for (const product of targets) {
  const reviewCount = 3 + Math.floor(Math.random() * 4); // 3–6 reviews per product
  const rows = pickRandomReviews(reviewCount).map((r) => ({
    product_id: product.id,
    author_name: r.author_name,
    rating: r.rating,
    title: r.title,
    body: r.body,
    is_published: true,
  }));

  const { error: insertError } = await supabaseAdmin.from('product_reviews').insert(rows);

  if (insertError) {
    console.error(`  ✗ ${product.name} (${product.id}): ${insertError.message}`);
    continue;
  }
  console.log(`  ✓ ${product.name} → ${rows.length} review(s)`);
}

console.log('Seed complete.');
