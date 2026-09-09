-- Ellora Admin — Phase 6 schema (Marketing Dashboard, Module 9 — first pass)
-- No live Google/Meta/TikTok ad-account API integration (that needs real ad accounts + OAuth).
-- What IS real: campaigns are entered with their spend, and each campaign is tied to a coupon
-- code. Attributed revenue / orders / ROAS are computed server-side from real orders that
-- actually used that code — the exact same attribution approach as the Influencer module,
-- not manually-typed performance numbers.

create table if not exists marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null default 'other',      -- google | meta | tiktok | email | other
  spend numeric not null default 0,
  coupon_code text references coupons (code) on delete set null,
  start_date date,
  end_date date,
  status text not null default 'active',       -- active | paused | ended
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table marketing_campaigns enable row level security;

drop policy if exists "Authenticated users can manage marketing campaigns" on marketing_campaigns;
create policy "Authenticated users can manage marketing campaigns"
  on marketing_campaigns for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
