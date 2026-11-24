-- Saint Roman Admin — Phase 11 (Orders ops console: fulfilment timestamps)
-- Run this in the Supabase SQL Editor after phase10_checkout_schema_gaps.sql.
--
-- The Orders ops console redesign (admin/src/pages/OrdersPage.tsx, server/routes/orders.js) needs
-- real per-stage timestamps for SLA tracking ("packed but not shipped >24h") that `orders` didn't
-- have before — only a single `updated_at` that gets overwritten on every field edit, not just
-- status transitions, so it can't reliably answer "how long has this been packed".
--
-- tracking_number, courier, notes (phase3_orders.sql) and payment_status
-- (phase9_order_payment_method.sql) already exist and are reused as-is — not renamed to
-- tracking_number/courier_name — so this doesn't touch anything server/routes/shipping.js or the
-- storefront checkout already reads/writes against those exact column names.
alter table orders add column if not exists shipped_at timestamptz;
alter table orders add column if not exists delivered_at timestamptz;

-- Used by the new filters (payment status dropdown, courier dropdown) on the ops console.
create index if not exists orders_payment_status_idx on orders (payment_status);
create index if not exists orders_courier_idx on orders (courier);
