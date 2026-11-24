-- Saint Roman Admin — Phase 5 schema (Reports & Analytics, Module 16 — prep)
-- Adds cost_price so a real Profit Report is possible. Nothing else needed — every other
-- report type (Sales, Customer, Inventory, Product, Returns) aggregates data that already exists.

alter table products
  add column if not exists cost_price numeric;
