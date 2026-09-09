-- Ellora Admin — Phase 4 schema (Customer Management, Module 7 — first pass)
-- Run this in the Supabase SQL Editor after phase3_cms.sql.
-- No public storefront signup yet, so customers are admin-entered for now (phone orders, walk-ins, etc.)
-- rather than linked to Supabase Auth users. Wishlist, wallet, reward points, and LTV are not in this
-- pass — they need real purchase history to be meaningful and there's barely any yet.

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customers_email_idx on customers (email) where email is not null;

alter table orders
  add column if not exists customer_id uuid references customers (id) on delete set null;

create index if not exists orders_customer_id_idx on orders (customer_id);

alter table customers enable row level security;

drop policy if exists "Authenticated users can manage customers" on customers;
create policy "Authenticated users can manage customers"
  on customers for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
