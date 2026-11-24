-- Saint Roman — one-off data fix after the Ellora -> Saint Roman rename.
--
-- The code rename cannot touch brand text that lives as DATA in Supabase.
-- schema.sql seeds settings with 'Saint Roman', but it uses
-- `on conflict (id) do nothing`, so an existing row still reads 'Ellora'.
--
-- Run STEP 1 first and read the output before running anything else.
-- Run this in the Supabase SQL editor.


-- ─────────────────────────────────────────────────────────────────────────
-- STEP 1 — READ ONLY. Find every text column in the public schema whose
-- value contains 'ellora'. Nothing is modified. Review the result before
-- running STEP 2 or 3.
-- ─────────────────────────────────────────────────────────────────────────
select
  c.table_name,
  c.column_name,
  q.hits
from information_schema.columns c
cross join lateral (
  select (
    xpath(
      '/row/cnt/text()',
      query_to_xml(
        format(
          'select count(*) as cnt from %I.%I where %I ilike %L',
          c.table_schema, c.table_name, c.column_name, '%ellora%'
        ),
        false, true, ''
      )
    )
  )[1]::text::int as hits
) q
where c.table_schema = 'public'
  and c.data_type in ('text', 'character varying')
  and q.hits > 0
order by q.hits desc, c.table_name, c.column_name;


-- ─────────────────────────────────────────────────────────────────────────
-- STEP 2 — The store title shown across the storefront and admin.
-- This is the one row we know carries the old name.
-- ─────────────────────────────────────────────────────────────────────────
update settings
set site_title = 'Saint Roman',
    updated_at = now()
where id = 1
  and site_title ilike '%ellora%';

select id, site_title, currency from settings where id = 1;


-- ─────────────────────────────────────────────────────────────────────────
-- STEP 3 — Scan results, 2026-11-24. Run against the live database.
--
-- VERDICT: nothing else needs changing. The scan returned 11 columns, and
-- not one of them holds customer-facing brand copy. Details below, because
-- the obvious "just replace the string" fix is destructive here.
-- ─────────────────────────────────────────────────────────────────────────

--   media_assets.url         47    DO NOT CHANGE
--   media_assets.public_id   47    DO NOT CHANGE
--   media_assets.folder      47    DO NOT CHANGE
--   product_images.url        8    DO NOT CHANGE
--   products.image_url        7    DO NOT CHANGE
--   banners.image_url         5    DO NOT CHANGE
--   categories.image_url      4    DO NOT CHANGE
--   blog_posts.featured_image_url  2   DO NOT CHANGE
--
-- These are Cloudinary paths. The files physically live in a Cloudinary
-- folder named 'ellora/'. The string in Postgres is a POINTER to that file,
-- not a label on it. Rewriting it here does not move anything in Cloudinary,
-- so every product photo, banner, category tile and blog image would 404.
--
-- The code already handles this the safe way: server/lib/cloudinary.js now
-- uploads to 'saint-roman/', so new assets land in the new folder while old
-- ones keep their existing absolute URLs and keep resolving. A split folder
-- in Cloudinary is invisible to customers.
--
-- To genuinely consolidate, the ONLY correct order is:
--   1. move/rename the assets inside Cloudinary first,
--   2. confirm the new URLs resolve,
--   3. only then update these columns.
-- Not worth it for cosmetics. Leave it.

--   audit_logs.actor_email   52    DO NOT CHANGE
--   media_assets.uploaded_by 48    DO NOT CHANGE
--
-- Both are 'admin@ellora.test', the login deliberately kept. These are
-- historical records — audit_logs exists so you can see who did what.
-- Rewriting them falsifies your own audit trail.


-- ─────────────────────────────────────────────────────────────────────────
-- STEP 4 — The one row that IS display text.
-- profiles.full_name returned 1 hit. It renders in the admin UI.
-- Look before you change it: 'Ellora' could be a real person's name.
-- ─────────────────────────────────────────────────────────────────────────

select id, full_name, email from profiles where full_name ilike '%ellora%';

-- If, and only if, the row above is the admin display name:
-- update profiles set full_name = 'Saint Roman Admin' where full_name ilike '%ellora%';
