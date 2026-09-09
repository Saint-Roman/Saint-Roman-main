-- Ellora Admin — Phase 1 schema (Auth & Settings)
-- Run this in the Supabase SQL Editor after creating the project.

do $$ begin
  create type admin_role as enum (
    'admin', 'manager', 'warehouse', 'marketing', 'finance', 'support', 'vendor'
  );
exception when duplicate_object then null;
end $$;

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role admin_role not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id int primary key default 1,
  site_title text,
  currency text default 'INR',
  tax_percent numeric default 0,
  payment_gateways jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

insert into settings (id, site_title, currency)
values (1, 'Ellora', 'INR')
on conflict (id) do nothing;

-- Row Level Security: only authenticated admin users can read/write.
-- First release has a single admin role; the role check still future-proofs multi-role RBAC.
alter table profiles enable row level security;
alter table settings enable row level security;

drop policy if exists "Admins can read own profile" on profiles;
create policy "Admins can read own profile"
  on profiles for select
  using (auth.uid() = id);

drop policy if exists "Authenticated users can read settings" on settings;
create policy "Authenticated users can read settings"
  on settings for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update settings" on settings;
create policy "Authenticated users can update settings"
  on settings for update
  using (auth.role() = 'authenticated');

-- Auto-create a profile row for admin signups, or link/create a customers row for storefront
-- signups — branches on user_metadata.account_type, which html/js/auth.js's register() sets to
-- 'customer' for every storefront signup (nothing else in this app sets it, so anything else —
-- including no account_type at all, e.g. an admin invited via Supabase's own dashboard — falls
-- through to the original admin-profile behavior).
--
-- References public.customers.auth_user_id/first_name/last_name, added in
-- phase17_customer_account_linking.sql (this function is redefined here in phase 1's schema.sql
-- purely to keep it next to the admin-profile half it started as; Postgres doesn't validate a
-- plpgsql body's table/column references until the function actually runs, so the forward
-- reference to a phase-4/phase-17 table is fine as long as the full migration has completed
-- before any real signup happens).
--
-- If a customers row with this email already exists with no auth_user_id yet (the normal case
-- for the admin-entered customers this table originally only ever held), links it instead of
-- inserting a duplicate — inserting would violate customers_email_idx and abort the signup
-- outright, which is exactly the historical "customers_email_idx" bug this app hit once before
-- (see PROJECT_MEMORY.md) in a different code path.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  if new.raw_user_meta_data->>'account_type' = 'customer' then
    update public.customers
    set auth_user_id = new.id,
        first_name = coalesce(new.raw_user_meta_data->>'first_name', first_name),
        last_name = coalesce(new.raw_user_meta_data->>'last_name', last_name),
        updated_at = now()
    where email = new.email and auth_user_id is null;

    if not found then
      insert into public.customers (auth_user_id, first_name, last_name, name, email)
      values (
        new.id,
        new.raw_user_meta_data->>'first_name',
        new.raw_user_meta_data->>'last_name',
        coalesce(
          nullif(trim(concat(new.raw_user_meta_data->>'first_name', ' ', new.raw_user_meta_data->>'last_name')), ''),
          new.email
        ),
        new.email
      );
    end if;
  else
    insert into public.profiles (id, full_name, role)
    values (new.id, new.raw_user_meta_data->>'full_name', 'admin');
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
