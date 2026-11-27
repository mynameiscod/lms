# Website integration — FDE course page (OTP-verified leads)

For the website team. Three calls: **send code → verify code → submit lead**.
A lead is created only if the mobile number was verified by a WhatsApp code, so time-pass entries never reach the CRM.

- **Base URL:** `https://platform.codebegun.com/api/v1/public/codebegun`
- **Format:** JSON, `Content-Type: application/json`. No login or API key. CORS is open for `codebegun.com` and `www.codebegun.com`.
- **Every response:** `{ "success": true|false, "message": "...", "data": { ... } }`. Show `message` to the visitor as-is; it is written for them.

## Flow on the page

1. Visitor fills the form and presses **Request a Callback**.
2. Page calls **Send code**. A WhatsApp message with a 6-digit code goes to the mobile number. Show a code box, a 30-second **Resend** timer and a way to change the number.
3. Visitor types the code. Page calls **Verify code** and receives a `verificationToken`.
4. Page immediately calls **Submit lead** with the form fields plus the `verificationToken`. Show the thank-you message.

Keep `requestId` and `verificationToken` in memory only; do not store them.

---

## 1. Send code (also used for Resend)

`POST /otp/send`

| Field | Required | Notes |
|---|---|---|
| `phone` | yes | 10-digit Indian mobile. `+91`, `91`, `0` prefixes and spaces are accepted. Must start with 6–9. |
| `requestId` | on resend only | The `requestId` returned by the first send. Leave it out on the first call. |

First send:
```json
{ "phone": "9743545311" }
```
Success `200`:
```json
{ "success": true, "message": "Code sent on WhatsApp",
  "data": { "requestId": "9f2c…", "channel": "whatsapp", "expiresInSec": 600, "resendAfterSec": 30 } }
```
Resend (same endpoint, with the id): `{ "phone": "9743545311", "requestId": "9f2c…" }`

| Status | Meaning | What to show |
|---|---|---|
| 400 | Invalid number, or the `requestId` is unknown/expired | The `message`; on an expired request start again without `requestId` |
| 429 | Resent too fast (`data.resendAfterSec` says how long), or too many attempts for this number | The `message`; disable Resend for `resendAfterSec` |
| 502 | WhatsApp could not deliver (number not on WhatsApp, etc.) | The `message` |

Limits: one code per 30 s, 5 sends per request, 5 new requests per number per hour, and a per-number and per-network cap.

## 2. Verify code

`POST /otp/verify`

```json
{ "requestId": "9f2c…", "code": "123456" }
```
Success `200`:
```json
{ "success": true, "message": "Phone verified",
  "data": { "verified": true, "verificationToken": "c41e…", "expiresInSec": 1800 } }
```
Failure `400` — `data.reason` is one of:

| `reason` | Meaning | Action |
|---|---|---|
| `wrong_code` | Code does not match | Let them retry (max 5 tries) |
| `expired` | Older than 10 minutes | Offer Resend |
| `too_many_attempts` | 5 wrong tries | Offer Resend (a new code resets the count) |
| `not_found` | Request unknown/expired | Start again from step 1 |

The `verificationToken` is single-use and valid for 30 minutes.

## 3. Submit lead

`POST /course-lead`

| Field | Required | Notes |
|---|---|---|
| `course` | yes | Always `"fde"` on this page. Unknown values are rejected. This is what tags the lead as the FDE course. |
| `name` | yes | Full name |
| `email` | yes | Valid email |
| `phone` | yes | **Same number that was verified** |
| `degree` | yes | e.g. `B.Tech` |
| `graduationYear` | yes | 4-digit year, 1980 to current year + 6 |
| `designation` | yes | e.g. `SDE2` |
| `verificationToken` | yes | From step 2 |
| `pageUrl` | yes | The full page URL: `window.location.href` |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` | no | Copy whatever is in the page URL so ads can be attributed |
| `website` | — | A hidden decoy input. **Always send it empty.** Bots fill it and are discarded silently. |

```json
{
  "course": "fde",
  "name": "Siva", "email": "siva@example.com", "phone": "9743545311",
  "degree": "B.Tech", "graduationYear": 2012, "designation": "SDE2",
  "verificationToken": "c41e…",
  "pageUrl": "https://codebegun.com/forward-deployed-ai-engineer?utm_source=meta&utm_campaign=fde-oct",
  "utm_source": "meta", "utm_campaign": "fde-oct",
  "website": ""
}
```
Success: `201` `{ "success": true, "message": "Thank you! We will call you within 24 hours.", "isExisting": false }`.
`200` with `"isExisting": true` means the number or email was already in the CRM; it is recorded as a repeat enquiry. Show the same thank-you.

| Status | Meaning | Action |
|---|---|---|
| 400 | A field is missing or invalid; `data.fields` is `{ field: message }` | Show each message next to its field |
| 401 | `data.reason = "not_verified"`: no/expired/used token, or phone differs from the verified one | Send the visitor back to step 1 |
| 429 | Too many requests from this network | The `message` |
| 500 | Server problem; the token is **not** consumed | Offer retry |

If the submit fails with 500, the visitor can press submit again with the same token.

---

## Browser example

```js
const API = 'https://platform.codebegun.com/api/v1/public/codebegun';
const post = (path, body) =>
  fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(async r => ({ ok: r.ok, status: r.status, ...(await r.json()) }));

let requestId = null;

async function sendCode(phone) {                       // also the Resend button
  const r = await post('/otp/send', requestId ? { phone, requestId } : { phone });
  if (r.data?.requestId) requestId = r.data.requestId;
  return r;                                            // show r.message; r.data.resendAfterSec drives the timer
}

async function verify(code) {
  const r = await post('/otp/verify', { requestId, code });
  return r.ok ? r.data.verificationToken : (alert(r.message), null);
}

async function submitLead(form, verificationToken) {
  const q = new URLSearchParams(location.search);
  return post('/course-lead', {
    course: 'fde',
    ...form,                                           // name, email, phone, degree, graduationYear, designation
    verificationToken,
    pageUrl: location.href,
    utm_source: q.get('utm_source') || '', utm_medium: q.get('utm_medium') || '',
    utm_campaign: q.get('utm_campaign') || '', utm_content: q.get('utm_content') || '', utm_term: q.get('utm_term') || '',
    website: '',
  });
}
```

## What the admin sees in the CRM

Each lead is created as **source: Website, priority: Hot**, with:
- **Course interest:** `FDE – Forward Deployed & Applied AI Engineer` (set by the server, never by the page).
- **Landing page:** the page path, plus the full URL as the referrer, and the form id `fde-callback`.
- **UTM** source/medium/campaign/content/term.
- **Profile fields:** degree, graduation year, designation, `phoneVerified = yes`, program = `fde`.
- **Timeline note:** "Hot lead from website. Course: … Page: /forward-deployed-ai-engineer. Degree …, graduated …, … Phone verified by WhatsApp OTP."

A repeat enquiry from the same phone or email adds the FDE course and a re-enquiry entry to the same lead instead of creating a duplicate.

## Testing

- Use a real WhatsApp number in production. Outside production the send response includes `devCode`.
- To test repeatedly without a phone, the platform owner can add numbers to `OTP_TEST_NUMBERS` (Platform Settings). For those numbers the code is returned in the send response as `devCode` instead of being sent. Clear the list afterwards.

## Adding another course page later

Add one line to `server/src/config/websiteCourses.ts` (key and CRM name). The same three calls then work with `"course": "<key>"`; nothing else changes.
