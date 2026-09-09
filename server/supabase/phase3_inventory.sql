-- Ellora Admin — Phase 3 schema (Inventory Management, Module 5)
-- Run this in the Supabase SQL Editor after phase2_catalog.sql.

alter table product_variants
  add column if not exists reserved_quantity int not null default 0;

create table if not exists inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references product_variants (id) on delete cascade,
  change_quantity int not null,
  reason text not null check (reason in ('purchase_order', 'manual_adjustment', 'cycle_count', 'return', 'damage')),
  note text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists inventory_adjustments_variant_id_idx on inventory_adjustments (variant_id);

alter table inventory_adjustments enable row level security;

drop policy if exists "Authenticated users can manage inventory_adjustments" on inventory_adjustments;
create policy "Authenticated users can manage inventory_adjustments"
  on inventory_adjustments for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
