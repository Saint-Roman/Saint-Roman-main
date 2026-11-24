-- Saint Roman Admin — Phase 10 (checkout schema gaps)
-- Run this in the Supabase SQL Editor after phase9_order_payment_method.sql.
--
-- Two more places where server/routes/public.js's real checkout (POST /api/public/orders) has
-- always assumed schema that no migration ever actually created — same root cause as
-- phase9_order_payment_method.sql (checkout was written/tested against a differently-shaped
-- dev DB at some point and the gap was never caught, since most testing happened through the
-- admin's own order-creation dialog rather than the public storefront checkout):
--
-- 1. customers.address — checkout upserts a new customer with `address: shipping_address`
--    (server/routes/public.js ~line 375), but `customers` (server/supabase/phase4_customers.sql)
--    only ever had id/name/email/phone/notes. Same jsonb shape as orders.shipping_address
--    (checkout.html builds { address, city, district, pincode, country }).
--
-- 2. decrement_stock(uuid, int) — checkout calls this RPC after inserting order_items to reduce
--    product_variants.stock_quantity, but it's wrapped in .catch(() => {}) and the function was
--    never defined anywhere, so it has always failed silently: every real storefront order has
--    placed successfully without ever actually decrementing stock. (Admin-created orders via
--    OrdersPage.tsx decrement stock a different way — server/routes/orders.js does the update
--    directly, not through this RPC — so that path was never affected.)

alter table customers add column if not exists address jsonb;

create or replace function decrement_stock(p_variant_id uuid, p_qty int)
returns void
language sql
as $$
  update product_variants
  set stock_quantity = greatest(0, stock_quantity - p_qty),
      updated_at = now()
  where id = p_variant_id;
$$;
