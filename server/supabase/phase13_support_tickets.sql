-- Saint Roman Admin — Phase 13 (Support Tickets upgrade)
-- Run this in the Supabase SQL Editor after phase12_testimonials.sql.
-- Brings support_tickets (phase5_support.sql) up to the level of a real seller-ops support
-- desk (Myntra/Flipkart-style): a human-readable ticket number instead of a raw uuid, an
-- internal note field for agent handoff, and a resolved_at timestamp so resolution time can be
-- shown in the admin UI — same shape as shipped_at/delivered_at on orders (phase3_orders.sql).

alter table support_tickets
  add column if not exists ticket_number text,
  add column if not exists internal_note text,
  add column if not exists resolved_at timestamptz;

-- Backfill existing rows in creation order so older tickets get lower numbers.
with numbered as (
  select id, row_number() over (order by created_at) as rn
  from support_tickets
  where ticket_number is null
)
update support_tickets t
set ticket_number = 'TCK-' || to_char(numbered.rn, 'FM000000')
from numbered
where t.id = numbered.id;

alter table support_tickets
  alter column ticket_number set not null;

create unique index if not exists support_tickets_ticket_number_idx on support_tickets (ticket_number);
