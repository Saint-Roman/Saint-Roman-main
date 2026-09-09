-- Ellora Admin — Phase 14 (WhatsApp Auto-Reply Flow)
-- Run this in the Supabase SQL Editor after phase13_support_tickets.sql.
-- Backs the WhatsApp bot (server/routes/whatsapp.js + server/lib/whatsappFlow.js): a per-phone-number
-- conversation with a current menu step, plus a full inbound/outbound message log used both for
-- debugging and as the transcript attached to a support ticket when a customer asks for a human
-- (see support_tickets.wa_conversation_id below). Reuses the existing support_tickets table
-- (phase5_support.sql, upgraded phase13_support_tickets.sql) for the human-handoff case rather than
-- building a second, parallel ticket system.

create table if not exists wa_conversations (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  customer_id uuid references customers (id) on delete set null,
  current_step text not null default 'welcome',
  context jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'handed_off', 'closed')),
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One open conversation per phone number — a fresh inbound message always continues the existing
-- row (looked up by phone) rather than forking a duplicate thread.
create unique index if not exists wa_conversations_phone_idx on wa_conversations (phone);

create table if not exists wa_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references wa_conversations (id) on delete cascade,
  direction text not null check (direction in ('in', 'out')),
  message_type text not null default 'text' check (message_type in ('text', 'interactive', 'template')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists wa_messages_conversation_id_idx on wa_messages (conversation_id, created_at);

alter table wa_conversations enable row level security;
alter table wa_messages enable row level security;

-- Same shape as every other admin-facing table's policy — the webhook route itself uses the
-- service-role client (supabaseAdmin), which bypasses RLS entirely, same as every other server route.
drop policy if exists "Authenticated users can manage wa_conversations" on wa_conversations;
create policy "Authenticated users can manage wa_conversations"
  on wa_conversations for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can manage wa_messages" on wa_messages;
create policy "Authenticated users can manage wa_messages"
  on wa_messages for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Lets the admin Support Tickets page distinguish WhatsApp-originated tickets from contact-form
-- ones, and link straight through to the full conversation transcript.
alter table support_tickets
  add column if not exists source text not null default 'contact_form' check (source in ('contact_form', 'whatsapp')),
  add column if not exists wa_conversation_id uuid references wa_conversations (id) on delete set null;
