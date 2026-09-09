-- Ellora Admin — Phase 6 schema (CRM, Module 8 — first pass)
-- No email/SMS campaign sending (needs an ESP/SMS provider) and no ML-based segmentation.
-- What IS real: rule-based segments (minimum orders + minimum lifetime spend) evaluated live
-- against real customers — order_count / lifetime_value are computed from actual orders, the
-- same way the Customers module already does it. Segment membership is always recomputed, never
-- stored stale.

create table if not exists customer_segments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  min_orders integer not null default 0,
  min_spend numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table customer_segments enable row level security;

drop policy if exists "Authenticated users can manage customer segments" on customer_segments;
create policy "Authenticated users can manage customer segments"
  on customer_segments for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
