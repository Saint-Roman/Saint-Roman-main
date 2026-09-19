-- Ellora Admin — Phase 18 (Per-color product images + product reviews)
-- Run this in the Supabase SQL Editor after phase8_product_specifications.sql.
--
-- 1. product_images.color — groups a product's uploaded photos by the variant colour they
--    belong to (matches product_variants.color as free text, same convention already used by
--    the colour swatches and the colour/size filters). NULL means the image applies regardless
--    of colour (single-colour products, or products with no colour variation at all).
-- 2. product_reviews — no reviews table existed anywhere in the schema; product-single.html and
--    the storefront JS have always shown an honest "No reviews yet" empty state. This adds real
--    storage: reviews can come from a logged-in customer (customer_id set) or be entered by the
--    admin on the product's behalf (customer_id null, author_name typed directly).

alter table product_images
  add column if not exists color text;

create table if not exists product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  customer_id uuid references customers (id) on delete set null,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists product_reviews_product_id_idx on product_reviews (product_id);

alter table product_reviews enable row level security;

drop policy if exists "Authenticated users can manage product_reviews" on product_reviews;
create policy "Authenticated users can manage product_reviews"
  on product_reviews for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
