/**
 * AI Client Hunter — WhatsApp Business API Client
 *
 * Lightweight module for Meta Cloud API (WhatsApp Business Platform).
 * Used by the server to send outreach messages and receive inbound
 * replies via WaCRM integration webhooks.
 *
 * Endpoints:
 *   POST /{version}/{phone-number-id}/messages  → send message
 *   GET  /{version}/{phone-number-id}/messages/{id} → get status
 *
 * Gracefully degrades when credentials are not configured.
 */

const WHATSAPP_API_VERSION = 'v22.0';
const WHATSAPP_BASE_URL = 'https://graph.facebook.com';

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
}

export interface WhatsAppMessageStatus {
  messageId: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  error?: string;
}

/**
 * Read WhatsApp credentials from environment.
 */
export function getWhatsAppConfig(): WhatsAppConfig | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) return null;
  return { phoneNumberId, accessToken };
}

/**
 * Check if WhatsApp Business API is configured.
 */
export function isWhatsAppConfigured(): boolean {
  return !!process.env.WHATSAPP_PHONE_NUMBER_ID && !!process.env.WHATSAPP_ACCESS_TOKEN;
}

/**
 * Send a plain text WhatsApp message via the Meta Cloud API.
 * Returns message status including the WhatsApp message ID for tracking.
 */
export async function sendTextMessage(
  to: string,
  text: string,
  previewUrl = false,
): Promise<WhatsAppMessageStatus | null> {
  const config = getWhatsAppConfig();
  if (!config) return null;

  try {
    const url = `${WHATSAPP_BASE_URL}/${WHATSAPP_API_VERSION}/${config.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to.replace(/[^0-9]/g, ''), // strip formatting, keep digits
        type: 'text',
        text: { preview_url: previewUrl, body: text },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp] Failed to send message:', data);
      return {
        messageId: '',
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: data?.error?.message || `HTTP ${response.status}`,
      };
    }

    return {
      messageId: data.messages?.[0]?.id || '',
      status: 'sent',
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error('[WhatsApp] Send error:', err.message);
    return {
      messageId: '',
      status: 'failed',
      timestamp: new Date().toISOString(),
      error: err.message || 'Unknown error',
    };
  }
}

/**
 * Send a template message (pre-approved WhatsApp template).
 * Useful for notifications, confirmations, and follow-ups.
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode = 'en',
  components?: { type: string; parameters: any[] }[],
): Promise<WhatsAppMessageStatus | null> {
  const config = getWhatsAppConfig();
  if (!config) return null;

  try {
    const url = `${WHATSAPP_BASE_URL}/${WHATSAPP_API_VERSION}/${config.phoneNumberId}/messages`;
    const body: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/[^0-9]/g, ''),
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    };

    if (components) {
      body.template.components = components;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[WhatsApp] Failed to send template:', data);
      return {
        messageId: '',
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: data?.error?.message || `HTTP ${response.status}`,
      };
    }

    return {
      messageId: data.messages?.[0]?.id || '',
      status: 'sent',
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error('[WhatsApp] Template send error:', err.message);
    return {
      messageId: '',
      status: 'failed',
      timestamp: new Date().toISOString(),
      error: err.message || 'Unknown error',
    };
  }
}

/**
 * Check the delivery/read status of a sent message.
 * Uses the WhatsApp Business API to query message status.
 */
export async function checkMessageStatus(
  messageId: string,
): Promise<WhatsAppMessageStatus | null> {
  const config = getWhatsAppConfig();
  if (!config) return null;

  try {
    const url = `${WHATSAPP_BASE_URL}/${WHATSAPP_API_VERSION}/${config.phoneNumberId}/messages/${messageId}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return null;
    }

    // Map WhatsApp's status:
    const statusMap: Record<string, WhatsAppMessageStatus['status']> = {
      sent: 'sent',
      delivered: 'delivered',
      read: 'read',
      failed: 'failed',
    };

    const waStatus = data?.statuses?.[0]?.status || 'sent';

    return {
      messageId,
      status: statusMap[waStatus] || 'pending',
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    console.error('[WhatsApp] Status check error:', err.message);
    return null;
  }
}

/**
 * Verify an incoming webhook request from Meta/WaCRM.
 * Meta sends a `hub.challenge` parameter for webhook verification.
 * Returns the challenge string if verification succeeds.
 */
export function verifyWebhook(
  query: Record<string, string | string[] | undefined>,
): string | null {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'hunter_wacrm_verify';

  if (mode === 'subscribe' && token === expectedToken) {
    return typeof challenge === 'string' ? challenge : null;
  }

  return null;
}

/**
 * Parse an incoming webhook payload from WhatsApp Business API.
 * Handles both messages and status updates.
 */
export interface InboundWebhookPayload {
  type: 'message' | 'status_update';
  from: string;          // sender phone number
  fromName?: string;     // sender profile name
  messageId: string;
  text?: string;
  timestamp: string;
  status?: WhatsAppMessageStatus['status'];
}

export function parseWebhookPayload(body: any): InboundWebhookPayload | null {
  try {
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const metadata = value?.metadata;

    if (!value || !metadata) return null;

    // Check for incoming messages
    const messages = value?.messages;
    if (messages && messages.length > 0) {
      const msg = messages[0];
      const contact = value?.contacts?.[0];

      return {
        type: 'message',
        from: msg.from,
        fromName: contact?.profile?.name || contact?.wa_id || 'Unknown',
        messageId: msg.id,
        text: msg.text?.body || msg.text?.body || '',
        timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
      };
    }

    // Check for status updates
    const statuses = value?.statuses;
    if (statuses && statuses.length > 0) {
      const st = statuses[0];
      const statusMap: Record<string, WhatsAppMessageStatus['status']> = {
        sent: 'sent',
        delivered: 'delivered',
        read: 'read',
        failed: 'failed',
      };

      return {
        type: 'status_update',
        from: st.recipient_id || '',
        messageId: st.id || '',
        timestamp: new Date(parseInt(st.timestamp) * 1000).toISOString(),
        status: statusMap[st.status] || 'pending',
      };
    }

    return null;
  } catch (err) {
    console.error('[WhatsApp] Failed to parse webhook payload:', err);
    return null;
  }
}
