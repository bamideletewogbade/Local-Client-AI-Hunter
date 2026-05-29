<div align="center">
<img width="1200" alt="AI Client Hunter Banner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# AI Client Hunter — Agentic Lead Discovery & CRM Platform

An AI-powered platform that discovers local businesses, scores their digital maturity, generates proposals, and manages the sales pipeline through a **5-agent orchestration mesh** orchestrated by **Bishop**.

---

## Architecture Overview

The platform uses a **supervisor-agents pattern**:

| Agent | Role |
|-------|------|
| **Scanner** | Discovers leads via search queries + location |
| **Analyzer** | Scores digital maturity, identifies pain points |
| **Auditor** | Generates BI reports and opportunity estimates |
| **Pitcher** | Crafts personalized outreach copy (email, LinkedIn, WhatsApp) |
| **Converter** | (Coming via Bishop + WhatsApp API) Sends automated outreach |

**Bishop** is the central orchestrator that coordinates these agents based on user goals.

---

## Quick Start

```bash
npm install
cp .env.example .env
# Fill in your API keys (see below)
npm run dev
```

---

## Environment Variables

### Required
```
# OpenRouter — primary AI provider for agent orchestration
OPENROUTER_API_KEY=sk-or-v1-...

# Groq — fallback AI provider
GROQ_API_KEY=gsk_...
```

### WhatsApp Business API (optional — for automated outreach)
```
# Meta Cloud API credentials
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_ACCESS_TOKEN=EAAT...

# Webhook verification token (optional, default: hunter_wacrm_verify)
WHATSAPP_WEBHOOK_VERIFY_TOKEN=hunter_wacrm_verify
```

### Firebase (optional — for cloud persistence)
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Google Maps (optional — for map view)
```
VITE_GOOGLE_MAPS_API_KEY=...
```

---

## WhatsApp Integration

The WhatsApp integration connects your CRM to the **Meta Cloud API (WhatsApp Business Platform)** so you can send outreach messages directly from the platform and receive replies that auto-update your pipeline.

### How It Works

```
┌─────────────────┐     POST /messages     ┌───────────────┐
│  AI Client Hunter│ ──────────────────────→ │  Meta Cloud   │
│  (Your Server)   │ ←── webhook callback ── │  WhatsApp API │
└─────────────────┘                         └───────┬───────┘
                                                    │
                                           ┌────────▼────────┐
                                           │  Lead's Phone    │
                                           └─────────────────┘
```

### Setup Steps

#### 1. Create a Meta Business Account
1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a Meta Business account
3. Create a WhatsApp Business App
4. Generate a permanent access token (or use a temporary one for testing)

#### 2. Get Your Phone Number ID
- In your WhatsApp Business App dashboard, go to **API Setup**
- Find your **Phone Number ID** (a numeric ID, typically 10-15 digits)
- Add it to your `.env`: `WHATSAPP_PHONE_NUMBER_ID=1234567890`

#### 3. Generate an Access Token
- In the same **API Setup** section, generate a **Temporary Access Token** (24h for testing)
- For production, generate a **Permanent Access Token** via System User
- Add it to your `.env`: `WHATSAPP_ACCESS_TOKEN=EAAT...`

#### 4. Configure Webhook (optional — for inbound replies)
1. In your app dashboard, go to **Webhooks**
2. Set the callback URL to: `https://your-domain.com/api/whatsapp/webhook`
3. Set the verify token to: `hunter_wacrm_verify` (or your custom value via `WHATSAPP_WEBHOOK_VERIFY_TOKEN`)
4. Subscribe to: `messages` (for inbound messages), `message_deliveries` (for delivery receipts), `message_reads` (for read receipts)

For local development, use [ngrok](https://ngrok.com) to expose your local server:
```bash
ngrok http 3000
# → https://abc123.ngrok.io/api/whatsapp/webhook
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/whatsapp/config` | Check if WhatsApp is configured (returns `{ configured: true/false }`) |
| `POST` | `/api/whatsapp/send` | Send a text or template message to a lead |
| `GET` | `/api/whatsapp/status/:messageId` | Check delivery/read status of a sent message |
| `GET` | `/api/whatsapp/webhook` | Meta webhook challenge verification |
| `POST` | `/api/whatsapp/webhook` | Receive inbound messages + status updates |

#### `POST /api/whatsapp/send`

```json
{
  "to": "+233241234567",
  "text": "Hello! 👋 I noticed your business...",
  "leadId": "lead-crm-123"
}
```

Response:
```json
{
  "success": true,
  "status": {
    "messageId": "wamid.HBgN...",
    "status": "sent",
    "timestamp": "2026-05-29T10:30:00.000Z"
  },
  "message": "Message sent successfully!"
}
```

### Client-Side: Sending from LeadSidePanel

When you open a lead's detail panel and navigate to **Outreach Channels**, the WhatsApp pitch section now has:

- **Send via WhatsApp** button — directly dispatches the pitch via the API (requires WhatsApp configured)
- **Copy** button — copies the pitch text to clipboard (works even without WhatsApp configured)
- **Delivery Status** indicator — shows real-time status:
  - `pending` → `sent ✓` → `delivered ✓✓` → `read ✓✓` → `failed`
- Auto-polls delivery status every 5 seconds after sending

If WhatsApp is **not configured**, the UI shows a notice and the Copy button remains fully functional.

### Agentic WhatsApp Outreach (Bishop)

Bishop can now send WhatsApp messages autonomously using the `sendWhatsAppOutreach` tool.

**Example goals:**
- "Send the WhatsApp pitch for lead crm-1"
- "Generate a pitch for the top 3 no-website leads and send each one"
- "Follow up with all contacted leads via WhatsApp with a gentle reminder"

The tool:
1. Generates the pitch text if needed (via `generatePitch`)
2. Sends the message via the WhatsApp API
3. Auto-logs the outreach in CRM history
4. Returns the delivery status

**Bishop's outreach workflow:**
1. `searchLeads` — find high-opportunity leads
2. `scoreLead` — prioritize by opportunity score
3. `generatePitch` — create personalized WhatsApp copy
4. `sendWhatsAppOutreach` — send via API with delivery tracking

---

## Agentic System

### Bishop Orchestrator

Bishop is the "CEO" agent. Users interact with Bishop through the **Sales Copilot** chat interface (bottom-right corner or nav "Ask Bishop" button).

**Available Bishop commands:**
- `"Find 5 dentists in Accra without websites"`
- `"Score my top leads and tell me who to contact first"`
- `"Generate pitches for my highest-opportunity leads"`
- `"Run a full discovery-to-pitch workflow on chiropractors in Lagos"`
- `"Send WhatsApp pitches to all no-website leads"`
- `"What's the current state of my CRM pipeline?"`

### Agent Tools

| Tool | Description |
|------|-------------|
| `searchLeads` | Search for new leads by query + location (returns up to 5) |
| `scoreLead` | Score a lead across 5 dimensions (0-100 opportunity score) |
| `analyzeLead` | Deep business analysis: pain points, systems needed, AI opportunities |
| `generateProposal` | Custom web design proposal with structure and value estimate |
| `generatePitch` | Personalized outreach copy (email, LinkedIn, WhatsApp) |
| `sendWhatsAppOutreach` | Send WhatsApp message to a lead via API with delivery tracking |
| `getCrmStats` | Dashboard statistics: totals, conversion rate, pipeline revenue |
| `getLeads` | Get all leads, optionally filtered by status or source |
| `getLead` | Full details of a specific lead |
| `updateLead` | Update lead status, notes, or tags |
| `getNoWebsiteLeads` | High-priority leads with no website |

---

## Firestore Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## Development

```bash
# Dev mode with hot reload + Express API server
npm run dev

# Production build
npm run build

# Type check
npx tsc --noEmit
```

The server runs on `http://localhost:3000` with:
- Vite dev middleware for HMR
- Express REST API at `/api/*`
- WebSocket server for real-time pipeline updates + agent logs

---

## Deployment

1. Build: `npm run build`
2. Start: `NODE_ENV=production node server.ts` (using `tsx` or compiled JS)
3. Set all environment variables on your hosting platform

---

## License

MIT — Built for demo and production use.
