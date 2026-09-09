-- Ellora Admin — Phase 5 schema (CMS remainder, Module 17 — Announcement Bar, Banners, Footer)
-- Homepage Builder, Landing Pages, Popup Management, and Mega Menu from the spec are NOT built —
-- those need either a real page-builder UI (big undertaking) or a display mechanism this static
-- template doesn't have. This covers only what's realistically wireable: sitewide text (topbar
-- announcement, footer copyright) via `settings`, and a generic banners table for homepage promos.

alter table settings
  add column if not exists announcement_text text,
  add column if not exists footer_copyright_text text;

create table if not exists banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  link_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table banners enable row level security;

drop policy if exists "Authenticated users can manage banners" on banners;
create policy "Authenticated users can manage banners"
  on banners for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
