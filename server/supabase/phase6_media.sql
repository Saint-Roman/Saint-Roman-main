-- Ellora Admin — Phase 6 (Media Library)
-- Every image uploaded through /api/upload/image is cataloged here so the admin can browse all
-- uploaded images in one place. The image FILE lives in Cloudinary (cloud storage); this table
-- stores a record of it — the hosted URL plus metadata. `public_id` is Cloudinary's handle, used
-- to delete the file from Cloudinary when a media asset is removed.

create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  public_id text,
  original_filename text,
  folder text,
  format text,
  bytes integer,
  width integer,
  height integer,
  uploaded_by text,
  created_at timestamptz not null default now()
);

create index if not exists media_assets_created_at_idx on media_assets (created_at desc);

alter table media_assets enable row level security;

drop policy if exists "Authenticated users can manage media assets" on media_assets;
create policy "Authenticated users can manage media assets"
  on media_assets for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
