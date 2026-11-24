-- Saint Roman Admin — Phase 5 schema (Settings remainder, Module 23 — Maintenance Mode)
-- Payment Gateway/Email/SMS/WhatsApp API config, CDN, Image Compression, API Keys, and Backup
-- from the spec are NOT built — storing config for providers that don't exist would just be
-- fields with no real effect (same "no speculative UI" reasoning as elsewhere). Maintenance Mode
-- is different: it's checkable/actionable right now against the real storefront.

alter table settings
  add column if not exists maintenance_mode boolean not null default false;
