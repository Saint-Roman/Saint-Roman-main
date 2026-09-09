-- Ellora Admin — Phase 3 schema (CMS, Module 17 — first pass: Blog Posts + FAQs only)
-- Run this in the Supabase SQL Editor after phase3_orders.sql.
-- Homepage builder, banners, popups, announcement bar, mega menu, and footer are not in this pass —
-- they depend on the public storefront actually reading from the DB, which doesn't exist yet
-- (html/ is still fully static). Blog posts and FAQs are useful as standalone admin content even
-- without that wiring, so they go first.

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  featured_image_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_status_idx on blog_posts (status);

create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table blog_posts enable row level security;
alter table faqs enable row level security;

drop policy if exists "Authenticated users can manage blog_posts" on blog_posts;
create policy "Authenticated users can manage blog_posts"
  on blog_posts for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage faqs" on faqs;
create policy "Authenticated users can manage faqs"
  on faqs for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
