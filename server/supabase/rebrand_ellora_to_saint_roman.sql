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
-- STEP 3 — Content tables. Uncomment ONLY the lines matching rows that
-- STEP 1 actually reported. Each statement is scoped with `ilike` so it
-- touches nothing else.
--
-- Do NOT run these blind: 'Ellora' may legitimately appear in a customer
-- name, a product a customer ordered, or an order note you want preserved
-- as a historical record.
-- ─────────────────────────────────────────────────────────────────────────

-- update banners      set title    = replace(title,    'Ellora', 'Saint Roman') where title    ilike '%ellora%';
-- update banners      set subtitle = replace(subtitle, 'Ellora', 'Saint Roman') where subtitle ilike '%ellora%';
-- update blog_posts   set title    = replace(title,    'Ellora', 'Saint Roman') where title    ilike '%ellora%';
-- update blog_posts   set content  = replace(content,  'Ellora', 'Saint Roman') where content  ilike '%ellora%';
-- update faqs         set question = replace(question, 'Ellora', 'Saint Roman') where question ilike '%ellora%';
-- update faqs         set answer   = replace(answer,   'Ellora', 'Saint Roman') where answer   ilike '%ellora%';
-- update testimonials set quote    = replace(quote,    'Ellora', 'Saint Roman') where quote    ilike '%ellora%';


-- ─────────────────────────────────────────────────────────────────────────
-- DO NOT CHANGE
--
--   admin@ellora.test   — a real login. Renaming it signs you out and
--                         invalidates the password in PROJECT_MEMORY.md.
--
--   orders.order_number starting 'ELL-'
--                       — 21 existing orders. New orders use the 'SR-'
--                         prefix (server/routes/orders.js). Rewriting the
--                         old ones breaks any order number a customer
--                         already received by email or WhatsApp.
-- ─────────────────────────────────────────────────────────────────────────
