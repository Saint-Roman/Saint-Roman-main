-- Saint Roman Admin — Phase 7 (Module: Internal Barcode Labels)
-- Run this in the Supabase SQL Editor after phase6_media.sql.
-- Enforces that every barcode value is unique once assigned. Partial index (barcode is not
-- null) so existing rows with no barcode yet don't block each other before the backfill script
-- (server/scripts/backfill-barcodes.js) runs.

create unique index if not exists products_barcode_unique_idx
  on products (barcode)
  where barcode is not null;