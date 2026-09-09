-- Ellora Admin — Phase 17 schema (Customer Account Linking)
-- Fixes a schema gap that's existed since storefront customer signup/login was first built:
-- server/routes/customer.js's requireCustomer looks customers up by `auth_user_id`, and reads/
-- writes `first_name`/`last_name`/`display_name`, but no committed migration ever added any of
-- these columns to `customers` (server/supabase/phase4_customers.sql only ever had
-- id/name/email/phone/notes, plus `address` from phase10). They only ever existed as an
-- undocumented manual addition on the one live database this was built and tested against — on
-- any other Supabase project (or if that manual addition is ever lost/overwritten), every
-- storefront signup silently gets no customers row at all, and checkout/account pages fail with
-- "No customer account found for this login" the moment someone actually tries to use them.
-- See schema.sql's handle_new_user() for the other half of this fix (it never actually created a
-- customers row for storefront signups either — it unconditionally created an admin profiles row
-- for every signup, customer or not).

alter table customers
  add column if not exists auth_user_id uuid unique references auth.users (id) on delete cascade,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists display_name text;

create index if not exists customers_auth_user_id_idx on customers (auth_user_id);
