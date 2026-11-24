-- Saint Roman Admin — Phase 9 (orders.payment_method / orders.payment_status)
-- Run this in the Supabase SQL Editor after phase8_product_specifications.sql.
--
-- server/routes/public.js's real checkout (POST /api/public/orders) has always inserted
-- payment_method: 'cod' and payment_status: 'unpaid' on every order, but no migration ever
-- actually added these columns to `orders` (server/supabase/phase3_orders.sql predates real
-- checkout and doesn't have them) — checkout fails with "Could not find the 'payment_method'
-- column of 'orders' in the schema cache" until this runs. Defaults match the only values
-- currently ever written (cash-on-delivery is the only payment method wired up so far; see
-- PROJECT_MEMORY.md "Razorpay Secure Checkout" under NEXT ACTION for the real gateway that will
-- eventually write other values here).
alter table orders add column if not exists payment_method text not null default 'cod';
alter table orders add column if not exists payment_status text not null default 'unpaid';
