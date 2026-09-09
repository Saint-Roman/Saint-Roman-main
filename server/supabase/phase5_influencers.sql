-- Ellora Admin — Phase 5 schema (Influencer Dashboard, Module 11 — thin pass)
-- No follower counts, engagement metrics, or content-submission tracking (no social platform API
-- integration). What IS real: each influencer gets a coupon code (reusing the Coupon Engine, not
-- a separate discount system), and their "sales"/"commission" are computed from real orders that
-- actually used that code — not manually entered numbers.

create table if not exists influencers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  coupon_code text references coupons (code) on delete set null,
  commission_percent numeric not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table influencers enable row level security;

drop policy if exists "Authenticated users can manage influencers" on influencers;
create policy "Authenticated users can manage influencers"
  on influencers for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
