-- Ellora Admin — Phase 12 (Testimonials)
-- Run this in the Supabase SQL Editor after phase11_orders_ops.sql.
-- Makes the homepage "Voices of our happy customers" section, its background image, and the
-- standalone testimonials.html page admin-manageable — same shape as the banners module
-- (phase5_cms_content.sql): a plain table with sort_order/is_active, managed through
-- server/routes/testimonials.js + admin/src/pages/TestimonialsPage.tsx.

create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text not null,
  author_name text not null,
  author_role text,
  author_image_url text,
  rating numeric not null default 5,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table testimonials enable row level security;

drop policy if exists "Authenticated users can manage testimonials" on testimonials;
create policy "Authenticated users can manage testimonials"
  on testimonials for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Background image for the homepage's .our-testimonials section — falls back to the existing
-- static css/custom.css background-image (testimonial-bg-image.jpg) when this is left empty.
alter table settings
  add column if not exists testimonial_bg_image_url text;

-- Seed with the content that was hardcoded across index.html and testimonials.html — same
-- quote on all 6 (that was already true in the static markup), same author-N.jpg placeholders.
-- Guarded so re-running this migration never duplicates rows.
insert into testimonials (quote, author_name, author_role, author_image_url, rating, sort_order, is_active)
select v.quote, v.author_name, v.author_role, v.author_image_url, v.rating, v.sort_order, v.is_active
from (values
  ('Absolutely love the quality & fit! The fabric feels premium and the style is exactly what I was looking for.', 'Harper Anderson', 'Art Director', 'images/author-1.jpg', 4.9, 0, true),
  ('Absolutely love the quality & fit! The fabric feels premium and the style is exactly what I was looking for.', 'Sophia Carter', 'Fashion Stylist', 'images/author-2.jpg', 4.9, 1, true),
  ('Absolutely love the quality & fit! The fabric feels premium and the style is exactly what I was looking for.', 'Arlene McCoy', 'Visual Designer', 'images/author-3.jpg', 4.9, 2, true),
  ('Absolutely love the quality & fit! The fabric feels premium and the style is exactly what I was looking for.', 'Cameron Williamson', 'Brand Stylist', 'images/author-4.jpg', 4.9, 3, true),
  ('Absolutely love the quality & fit! The fabric feels premium and the style is exactly what I was looking for.', 'Wade Warren', 'Fashion Editor', 'images/author-5.jpg', 4.9, 4, true),
  ('Absolutely love the quality & fit! The fabric feels premium and the style is exactly what I was looking for.', 'Guy Hawkins', 'Creative Director', 'images/author-6.jpg', 4.9, 5, true)
) as v(quote, author_name, author_role, author_image_url, rating, sort_order, is_active)
where not exists (select 1 from testimonials);
