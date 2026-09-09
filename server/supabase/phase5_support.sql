-- Ellora Admin — Phase 5 schema (Customer Support, Module 20 — thin pass)
-- No live chat, WhatsApp, or calls integration (no provider). Just ticket tracking, fed by the
-- storefront's real contact form (html/contact.html) and manageable in the admin panel.

do $$ begin
  create type ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type ticket_priority as enum ('low', 'medium', 'high');
exception when duplicate_object then null;
end $$;

create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers (id) on delete set null,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  subject text not null,
  message text,
  status ticket_status not null default 'open',
  priority ticket_priority not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_status_idx on support_tickets (status);

alter table support_tickets enable row level security;

drop policy if exists "Authenticated users can manage support_tickets" on support_tickets;
create policy "Authenticated users can manage support_tickets"
  on support_tickets for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
