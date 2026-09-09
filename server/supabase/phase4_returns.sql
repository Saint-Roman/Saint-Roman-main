-- Ellora Admin — Phase 4 schema (Returns & Refunds, Module 14 — first pass)
-- Run this in the Supabase SQL Editor after phase4_customers.sql.

do $$ begin
  create type return_status as enum (
    'requested', 'approved', 'rejected', 'picked_up', 'inspecting', 'refunded', 'exchanged'
  );
exception when duplicate_object then null;
end $$;

create table if not exists returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  order_item_id uuid not null references order_items (id) on delete cascade,
  quantity int not null check (quantity > 0),
  reason text,
  status return_status not null default 'requested',
  refund_amount numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists returns_order_id_idx on returns (order_id);
create index if not exists returns_status_idx on returns (status);

alter table returns enable row level security;

drop policy if exists "Authenticated users can manage returns" on returns;
create policy "Authenticated users can manage returns"
  on returns for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
