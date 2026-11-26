-- Saint Roman Admin — Phase 19 (Product Short Description)
-- Run this in the Supabase SQL Editor after phase18_product_media_reviews.sql.
--
-- The storefront's product page shows text in two places: a short teaser beside the image,
-- and the full write-up in the "Product Description" tab. Both used to come from the same
-- `description` column, so the teaser either repeated the full text verbatim or had to be
-- algorithmically trimmed out of it — either way, the two spots risked saying the same thing
-- twice. A separate column lets the admin write a distinct 2-3 line teaser for the image strip,
-- independent of how long or short the full description is.
alter table products add column if not exists short_description text;
