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

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'admin');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
