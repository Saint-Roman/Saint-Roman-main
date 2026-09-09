-- Ellora Admin — Phase 2 schema (Category, Product, Variant Management)
-- Run this in the Supabase SQL Editor after schema.sql (Phase 1).

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references categories (id) on delete set null,
  description text,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_parent_id_idx on categories (parent_id);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sku text unique,
  barcode text,
  brand text,
  hsn_code text,
  gst_percent numeric default 0,
  category_id uuid references categories (id) on delete set null,
  description text,
  base_price numeric not null default 0,
  compare_at_price numeric,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_id_idx on products (category_id);
create index if not exists products_status_idx on products (status);

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  sku text unique,
  size text,
  color text,
  pack_size int default 1,
  price numeric not null default 0,
  compare_at_price numeric,
  stock_quantity int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_variants_product_id_idx on product_variants (product_id);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  variant_id uuid references product_variants (id) on delete cascade,
  url text not null,
  alt_text text,
  position text default 'main' check (position in ('main', 'back', 'side', '360', 'lifestyle')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_id_idx on product_images (product_id);

-- RLS: same pattern as Phase 1 — authenticated admin users only (single role for now).
alter table categories enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table product_images enable row level security;

drop policy if exists "Authenticated users can manage categories" on categories;
create policy "Authenticated users can manage categories"
  on categories for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage products" on products;
create policy "Authenticated users can manage products"
  on products for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage product_variants" on product_variants;
create policy "Authenticated users can manage product_variants"
  on product_variants for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage product_images" on product_images;
create policy "Authenticated users can manage product_images"
  on product_images for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
