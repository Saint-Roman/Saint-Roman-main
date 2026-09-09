// Thin wrapper around the Meta WhatsApp Cloud API's send-message endpoint.
// Token + phone-number-id come from server/.env (WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID). The
// token is never sent to the frontend — all WhatsApp calls happen server-side through these
// helpers, same convention as server/lib/gemini.js.

const API_VERSION = 'v21.0';

export function isConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

async function send(payload) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw new Error('WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID are not set in server/.env');
  }

  const url = `https://graph.facebook.com/${API_VERSION}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...payload }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || `WhatsApp send failed (${res.status})`);
  }
  return json;
}

export function sendText(to, body) {
  return send({ to, type: 'text', text: { body } });
}

// buttons: up to 3 { id, title } — WhatsApp's own hard limit, not an app-side choice.
export function sendButtons(to, bodyText, buttons) {
  if (buttons.length > 3) throw new Error('WhatsApp reply buttons support at most 3 options');
  return send({
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title } })),
      },
    },
  });
}

// rows: up to 10 { id, title, description? } — WhatsApp's own hard limit on a single-section list.
export function sendList(to, { headerText, bodyText, buttonLabel, rows }) {
  if (rows.length > 10) throw new Error('WhatsApp list messages support at most 10 rows');
  return send({
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      ...(headerText ? { header: { type: 'text', text: headerText } } : {}),
      body: { text: bodyText },
      action: {
        button: buttonLabel,
        sections: [{ rows: rows.map((r) => ({ id: r.id, title: r.title, description: r.description || undefined })) }],
      },
    },
  });
}

// sendText/sendButtons/sendList above only work within the 24h window after a customer messages
// first (the auto-reply bot's whole world). Anything WE message first — the abandoned-cart
// reminder is the only case in this app — is a business-initiated message, which Meta only
// allows through a pre-approved Message Template (created + approved in Meta Business Manager,
// outside this app's control). components follows Meta's template-components shape, e.g.
// [{ type: 'body', parameters: [{ type: 'text', text: 'Priya' }] }] for a template with a {{1}}
// placeholder in its body — omit entirely for a template with no variables.
export function sendTemplate(to, templateName, languageCode, components) {
  return send({
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode || 'en' },
      ...(components && components.length ? { components } : {}),
    },
  });
}
