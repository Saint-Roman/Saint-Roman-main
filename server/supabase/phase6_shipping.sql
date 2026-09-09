-- Ellora Admin — Phase 6 schema (Shipping, Module 13 — first pass)
-- No live courier API (Shiprocket/Delhivery-style rate-shopping, label generation, or webhook
-- tracking). What IS real: admin-defined shipping rate rules, and a Shipments view derived from
-- real orders — courier + tracking number are edited here and persist on the order itself
-- (orders.courier / orders.tracking_number already exist as plain fields).

create table if not exists shipping_rates (
  id uuid primary key default gen_random_uuid(),
  zone_name text not null,
  min_order numeric not null default 0,        -- rule applies when order subtotal >= this
  rate numeric not null default 0,             -- flat shipping fee for this rule
  free_above numeric,                          -- optional: free shipping when subtotal >= this
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table shipping_rates enable row level security;

drop policy if exists "Authenticated users can manage shipping rates" on shipping_rates;
create policy "Authenticated users can manage shipping rates"
  on shipping_rates for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
