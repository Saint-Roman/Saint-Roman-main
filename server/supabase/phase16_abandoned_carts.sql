-- Ellora Admin — Phase 16 schema (Abandoned Cart Recovery)
-- Server-side mirror of the storefront's localStorage cart (html/js/ellora-cart.js), one row per
-- logged-in customer, synced on every cart mutation via POST /api/customer/cart. The storefront
-- itself still trusts localStorage as its own source of truth for what's actually in the cart —
-- this table exists purely so the admin Abandoned Carts page and the reminder scheduler
-- (server/lib/abandonedCarts.js) have something to read. The row is deleted entirely when the
-- cart empties client-side or the customer checks out (server/routes/public.js POST /orders).

create table if not exists carts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null unique references customers (id) on delete cascade,
  -- Set once a reminder has been sent for the current abandonment episode; cleared back to null
  -- whenever the customer touches their cart again, so a later abandonment gets its own reminder.
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts (id) on delete cascade,
  variant_id uuid not null references product_variants (id) on delete cascade,
  quantity int not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create index if not exists cart_items_cart_id_idx on cart_items (cart_id);
create index if not exists carts_updated_at_idx on carts (updated_at);

alter table carts enable row level security;
alter table cart_items enable row level security;

drop policy if exists "Authenticated users can manage carts" on carts;
create policy "Authenticated users can manage carts"
  on carts for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage cart_items" on cart_items;
create policy "Authenticated users can manage cart_items"
  on cart_items for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
