-- Ellora Admin — Phase 5 schema (Audit Logs, Module 24)
-- Instrumented at the highest-value mutation points only: admin logins, product price changes,
-- product/category deletions, order status changes, and refunds. Not a blanket "log every API
-- call" (that's the spec's "API Logs" line — low admin value at single-admin scale, high volume
-- for no real benefit) — this is the "Changes" / "Deleted Products" / "Price Changes" /
-- "Refund Logs" / "Login History" lines from the spec, the ones an admin would actually read.

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx on audit_logs (entity_type, entity_id);
create index if not exists audit_logs_created_at_idx on audit_logs (created_at desc);

alter table audit_logs enable row level security;

drop policy if exists "Authenticated users can read audit_logs" on audit_logs;
create policy "Authenticated users can read audit_logs"
  on audit_logs for select
  using (auth.role() = 'authenticated');

-- Inserts happen via the service-role key from the server only — no direct client insert policy.
