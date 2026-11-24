-- Saint Roman Admin — Phase 6 (product + banner images)
-- The banners table was text-only (title/subtitle/link) and the products table had no primary
-- image column at all (only a separate product_images gallery table). Add an image_url to both so
-- the admin can set a main photo per product and a hero image per banner. Images are uploaded via
-- Cloudinary (server/routes/upload.js); these columns store the resulting hosted URL.

alter table banners add column if not exists image_url text;
alter table products add column if not exists image_url text;
