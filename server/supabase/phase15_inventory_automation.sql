-- Saint Roman Admin — Phase 15 (Inventory low-stock automation)
-- Run this in the Supabase SQL Editor after phase14_whatsapp.sql.
-- Two small additions on top of the Inventory stock console (section 15 in PROJECT_MEMORY.md):
-- a per-variant low-stock threshold (a single global "10 units" number doesn't fit every SKU —
-- a fast-moving Kurti and a slow accessory shouldn't share one alert line), and a WhatsApp number
-- to actually push an alert to when a variant crosses into low/out-of-stock, reusing the WhatsApp
-- send wrapper already built for the Auto-Reply bot (phase14_whatsapp.sql) rather than a second
-- messaging integration.

alter table product_variants
  add column if not exists low_stock_threshold int;

alter table settings
  add column if not exists low_stock_alert_phone text;
