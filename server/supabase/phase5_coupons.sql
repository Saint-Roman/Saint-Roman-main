-- Ellora Admin — Phase 5 schema (Coupon Engine, Module 10 — first pass)
-- Run after phase4_returns.sql. Only unblocked now because a real checkout exists to apply
-- coupons against (server/routes/public.js POST /orders). First pass covers percentage/flat/
-- free-shipping discounts only — BOGO, Buy X Get Y, and referral/employee/influencer-specific
-- coupon types from the spec are not built (no real inventory-bundle or referral tracking yet).

do $$ begin
  create type coupon_type as enum ('percentage', 'flat', 'free_shipping');
exception when duplicate_object then null;
end $$;

create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type coupon_type not null default 'percentage',
  value numeric not null default 0,
  min_order_value numeric not null default 0,
  max_discount numeric,
  usage_limit int,
  usage_count int not null default 0,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table orders
  add column if not exists coupon_code text,
  add column if not exists discount_amount numeric not null default 0;

alter table coupons enable row level security;

drop policy if exists "Authenticated users can manage coupons" on coupons;
create policy "Authenticated users can manage coupons"
  on coupons for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
