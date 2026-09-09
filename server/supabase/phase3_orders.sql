-- Ellora Admin — Phase 3 schema (Order Management, Module 6)
-- Run this in the Supabase SQL Editor after phase3_inventory.sql.
-- First pass: no Customer Management (Module 7) yet, so customer details live directly on the order
-- rather than a customers table. Orders are admin-created for now (no public storefront checkout).

do $$ begin
  create type order_status as enum (
    'pending', 'processing', 'packed', 'ready_to_ship', 'shipped',
    'delivered', 'cancelled', 'returned', 'refund_initiated', 'refund_completed'
  );
exception when duplicate_object then null;
end $$;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  status order_status not null default 'pending',
  customer_name text not null,
  customer_email text,
  customer_phone text,
  shipping_address jsonb,
  subtotal numeric not null default 0,
  shipping_fee numeric not null default 0,
  total numeric not null default 0,
  tracking_number text,
  courier text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_status_idx on orders (status);
create index if not exists orders_created_at_idx on orders (created_at desc);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  variant_id uuid references product_variants (id) on delete set null,
  product_name text not null,
  variant_label text,
  quantity int not null check (quantity > 0),
  unit_price numeric not null,
  line_total numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_id_idx on order_items (order_id);

alter table orders enable row level security;
alter table order_items enable row level security;

drop policy if exists "Authenticated users can manage orders" on orders;
create policy "Authenticated users can manage orders"
  on orders for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage order_items" on order_items;
create policy "Authenticated users can manage order_items"
  on order_items for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
