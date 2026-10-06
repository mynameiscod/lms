# WhatsApp Chat inside the platform — Step 1 design

**Status:** Step 1 BUILT 2026-10-06 (Placement candidate drawer + Lead page WhatsApp tab).
**Date:** 2026-10-06
**Goal:** staff can read and answer a candidate's or lead's WhatsApp messages from the candidate/lead page,
using the institute's existing WhatsApp number — no separate tool, no phone in hand.

## Why

Placement-program invites and stage messages go out on WhatsApp, and people reply ("Interested", "When is the
interview?", a photo of their resume). Today those replies are either swallowed by the qualification bot or
flattened into a one-line note on the Lead's activity timeline. Nobody can answer them from the platform, and
replies on the Placement Program side are not visible at all.

## What already exists (reuse, don't rebuild)

| Piece | Where | State |
|---|---|---|
| Incoming messages | `POST /whatsapp/webhook` → `whatsappWebhookController.processWhatsAppMessage` | Receives replies; tenant resolved from `phone_number_id` |
| Delivery ticks | `WhatsAppMessageLog` + `applyDeliveryStatuses` | sent / delivered / read / failed per `wamid` — template sends only |
| Template sending | `whatsAppTemplateService.sendTemplateTo` | Logs every send; uses tenant credentials |
| Free-text sending | `sendManualMessage` | Uses the **env** phone number, not tenant credentials, and logs nothing |
| Qualification bot | `handleConversation` + `WhatsAppConversationState` | Answers every inbound message while a lead is mid-qualification |

### Gaps found while reading the code

1. **Only the first message per webhook call is processed** (`value.messages[0]`). Meta batches; the rest are lost.
2. **Only text and button replies are kept.** Images, documents (resumes), audio and locations are dropped.
3. **The webhook does not verify Meta's signature** (`X-Hub-Signature-256`). Anyone who knows the URL can post a
   fake "reply". Harmless while replies only become notes; **not acceptable once they appear as a chat** that staff
   act on. The Meta Lead Ads webhook already verifies — reuse that code.
4. Placement candidates are not matched to inbound messages at all — only Leads are.

## The rule everything is designed around — Meta's 24-hour window

- After a person messages us, we may reply with **free text for 24 hours** (the "customer service window").
- Outside the window we may only send an **approved template**.
- So the chat box has two states: **"Reply freely — 14h left"** and **"Window closed — send a template"**
  (opens the template picker from the WhatsApp Templates page, `{name}` filled in).
- The window is computed from the last *inbound* message time; never trusted from the client.

## Step 1 scope

### 1. One message store — `whatsappmessages` (new collection)

One document per message, both directions:

| Field | Notes |
|---|---|
| `tenantId`, `phone` (normalised `91XXXXXXXXXX`) | thread key = (tenantId, phone) |
| `direction` | `in` / `out` |
| `kind` | `text`, `template`, `image`, `document`, `audio`, `video`, `location`, `button` |
| `body` | text, template body as rendered, or caption |
| `media` | `{ metaMediaId, mime, fileName, storedKey }` — file copied to Bunny storage on arrival (Meta media URLs expire) |
| `wamid`, `status`, `error` | delivery ticks for outbound; reuse the existing status webhook |
| `sentBy` | staff user for outbound; empty for system/bot |
| `source` | `chat`, `broadcast`, `system`, `bot` |
| `createdAt` | index (tenantId, phone, createdAt) |

`WhatsAppMessageLog` stays as the delivery log for templates; outbound chat messages write to both so the
existing Delivery log page keeps working.

A small `whatsappthreads` collection (one per tenant+phone) keeps `lastInboundAt`, `lastMessageAt`, `unreadCount`,
`botPaused`, `assignedTo` — so lists and the window check don't scan messages.

### 2. Webhook changes

- Verify `X-Hub-Signature-256` with the app secret; reject anything unsigned.
- Loop over **all** messages in a payload, not just the first.
- Store every inbound message (all kinds) **before** the bot runs; download media to Bunny.
- Dedupe on `wamid` (Meta retries).
- **Bot handover:** if the thread has `botPaused` (set automatically when a staff member sends a chat reply,
  or by a toggle), the qualification bot does not answer. Otherwise behaviour is unchanged.

### 3. Who the thread belongs to

Matched by the last 10 digits of the phone, inside the tenant. One thread shows on **every** record with that
number: Placement candidate, Lead, Student. No copying — each page just asks for the thread by phone.

### 4. Chat panel — on the Placement candidate page first

- A **💬 Chat** tab next to the timeline: bubbles in/out, time, ✓ / ✓✓ / blue ✓✓ ticks, failed reason (already
  translated by `explainWaError`), images and PDFs shown inline / downloadable.
- Reply box when the window is open; template picker when closed.
- "Bot answering / Bot paused" toggle.
- New messages appear by polling every 10 s while the tab is open (sockets are Step 3).
- Unread badge on the candidate row in the pipeline list.
- Lead page gets the same component afterwards (same API, ~no extra server work).

### 5. Sending

`POST /whatsapp-chat/:phone/messages` — free text (window must be open, checked server-side) or a template id
with values. Uses **tenant credentials** (`getWhatsAppCredentialCandidates`), not the env number. Records the
message, the delivery-log row, and a `placementevents` / lead activity entry ("Arun replied on WhatsApp").

### 6. Access

New permission **`chat_whatsapp`** — "Read & reply to WhatsApp conversations" — in the Roles catalogue; tenant
admins get it by default. Reading a thread also requires access to the record it is opened from (placement or
leads), so a telecaller cannot open placement chats unless granted.

## Not in Step 1

- Shared inbox page across all conversations, assignment, quick replies (Step 2).
- Real-time sockets, desktop/WhatsApp notifications to the assigned staff member, response-time reports (Step 3).
- Sending files from staff to the candidate (Step 3).
- Chat on Student pages (comes free once the component exists; enable in Step 2).

## Decisions (2026-10-06)

| # | Question | Decision |
|---|---|---|
| 1 | Pause the qualification bot automatically when staff reply? | **Yes** — resume with the toggle in the chat |
| 2 | Who gets `chat_whatsapp` by default? | **Tenant admins only**; others granted from Roles |
| 3 | Keep chat history how long? | **2 years** — messages (TTL index) and stored media |
| 4 | Start with Placement Program, then Leads? | **Yes** — both shipped in Step 1 |

## As built — notes

- Every send path writes into the conversation: chat replies, `sendTemplateTo` (broadcasts, tests), purpose
  templates and plain texts from `assessmentOtpService` (confirmations, reminders, stage messages) and the
  qualification bot. **OTP codes are deliberately not recorded** — staff should not see login codes.
- Signature check ships in **log** mode (Platform Settings → `WHATSAPP_WEBHOOK_SIGNATURE`). Switch to `enforce`
  once the server log shows no "signature mismatch" for real replies. `WHATSAPP_APP_SECRET` falls back to
  `META_APP_SECRET`.
- Media is copied to Bunny storage on arrival (≤ 16 MB); without Bunny configured the bubble says the file was
  not saved.
- Bunny media files are not yet deleted after 2 years (only the message rows expire) — a cleanup job is a follow-up.

## Risks

- **Signature check is a breaking change** if the Meta app secret in settings is wrong — verify against a real
  delivery before enforcing (log-only for one day, then enforce).
- Marketing templates sent from the chat cost money per message (≈ ₹0.8 each in India — check current Meta
  pricing); free-text replies inside a user-opened window are service conversations (free / very low).
- One number, many staff: two people may answer the same person. Step 1 shows "Arun replied 2 min ago" above the
  box; real assignment is Step 2.

## Effort

Server (store, webhook loop + signature + media, send API, permission, tests) ≈ 1.5 days.
Chat panel on the Placement candidate page ≈ 1 day. Lead page reuse ≈ 0.5 day.
