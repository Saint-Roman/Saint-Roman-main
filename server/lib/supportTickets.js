// Shared support_tickets insert logic — used by both the storefront contact form
// (server/routes/public.js) and the WhatsApp bot's ticket-handoff steps (server/lib/whatsappFlow.js),
// so there's exactly one place that knows how a ticket gets created.

import { supabaseAdmin } from '../config/supabase.js';

// Same stamp+random shape as generateOrderNumber() in server/routes/orders.js, prefixed TCK-
// instead of SR- so a ticket number reads at a glance like an order number does.
function generateTicketNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TCK-${stamp}-${rand}`;
}

export async function createTicket({
  customer_id = null,
  customer_name,
  customer_email = null,
  customer_phone = null,
  subject,
  message,
  priority = 'medium',
  source = 'contact_form',
  wa_conversation_id = null,
}) {
  const { data, error } = await supabaseAdmin
    .from('support_tickets')
    .insert({
      ticket_number: generateTicketNumber(),
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      subject,
      message,
      priority,
      source,
      wa_conversation_id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Builds a ticket from a wa_conversations row — resolves the customer's real name/email if the
// conversation is linked to one, otherwise falls back to identifying them by WhatsApp number.
// `handOff: true` (only used for the "Speak to Customer Care" step) flips the conversation to
// handed_off so the bot stops auto-replying once a human is expected to take over from the
// existing Support Tickets admin queue — other issue-report branches leave the bot active since
// filing an issue doesn't necessarily mean the customer is done with self-service.
export async function createTicketFromConversation({ conversation, subject, message, priority = 'medium', handOff = false }) {
  let customerName = null;
  let customerEmail = null;

  if (conversation.customer_id) {
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('name, email')
      .eq('id', conversation.customer_id)
      .maybeSingle();
    if (customer) {
      customerName = customer.name;
      customerEmail = customer.email;
    }
  }

  const ticket = await createTicket({
    customer_id: conversation.customer_id,
    customer_name: customerName || `WhatsApp (${conversation.phone})`,
    customer_email: customerEmail,
    customer_phone: conversation.phone,
    subject,
    message,
    priority,
    source: 'whatsapp',
    wa_conversation_id: conversation.id,
  });

  if (handOff) {
    await supabaseAdmin.from('wa_conversations').update({ status: 'handed_off' }).eq('id', conversation.id);
  }

  return ticket;
}
