# Amazon SES Integration

Replaces the Gmail / Hostinger / Brevo mix with Amazon SES as the platform
default, keeping the others available as per-tenant overrides.

## What changed in the code

| File | Change |
|---|---|
| `services/sesMailer.ts` | **New.** SES v2 send path, client caching, raw-MIME composition, SES-specific transient-error rules |
| `services/emailService.ts` | Eleven duplicated `if (useBrevoApi)` branches collapsed into one `dispatch()`; provider-aware throttle; shared retry |
| `controllers/sesEventsController.ts` | **New.** SNS bounce/complaint intake, signature-verified |
| `config/settingsRegistry.ts` | `ses` added to `EMAIL_SERVICE`; four `SES_*` keys |
| `routes/index.ts` | `POST /api/v1/public/ses-events` |
| `controllers/seatReservationController.ts` | Dropped its private `process.env` transport; now goes through `EmailService` |
| `jobs/dailySummaryCron.ts` | Dropped its inline Brevo `fetch`; now goes through `EmailService` |

### Why `dispatch()` exists

The provider branch was copy-pasted at eleven call sites. Several had drifted to
calling `transporter.sendMail()` directly, which skipped both the burst throttle
and the transient retry — the same defect that caused 389 of 457 Tech Battle
approval emails to be rejected by Hostinger's rate limiter. Adding SES as a
third branch in eleven places would have widened that surface. There is now one
branch, and every send method inherits throttling, retry and suppression.

## Settings

Platform Settings → Email. All are per-tenant, and all fall back to the
platform value when a tenant leaves them blank.

| Key | Required | Notes |
|---|---|---|
| `EMAIL_SERVICE` | no | `ses` \| `gmail` \| `smtp` \| `brevo`. **Blank = SES.** |
| `SES_REGION` | **yes** | e.g. `ap-south-1`. Must be the region the domain identity is verified in — SES identities are per-region and a mismatch fails every send. |
| `SES_ACCESS_KEY_ID` | yes* | IAM key with `ses:SendEmail`. |
| `SES_SECRET_ACCESS_KEY` | yes* | |
| `SES_CONFIGURATION_SET` | recommended | Required for bounce/complaint events to reach the suppression list. |

\* Blank falls back to the ambient AWS credential chain (env vars / instance
role). The VPS is not EC2, so in practice the keys are needed.

### How a value resolves

`settingsService` resolves in this order, so **the UI beats `.env`**:

```
tenant override (UI, per-tenant scope)
  → platform value (UI, platform scope)
    → process.env
      → DEFAULT_PROVIDER ('ses', code)
```

Two consequences worth knowing:

- Setting **platform-scope `EMAIL_SERVICE`** in the UI *is* the platform
  default. It overrides env and applies without a restart.
- `DEFAULT_PROVIDER` in code only applies when the key is unset at every level
  — i.e. a fresh install that has never touched Email settings.

### Environment overrides

These two are env-only (not in the UI) because they are deployment tuning, not
per-tenant configuration:

| Var | Default | Purpose |
|---|---|---|
| `SES_MIN_SEND_GAP_MS` | `80` | ≈12/sec. **Set to `1100` if the account is ever in sandbox** (1 msg/sec). |
| `SMTP_MIN_SEND_GAP_MS` | `3000` | Unchanged; applies to the gmail/smtp paths only. |
| `DEFAULT_MAIL_PROVIDER` | `ses` | Last-resort default. Prefer setting platform-scope `EMAIL_SERVICE` in the UI — it takes precedence and needs no restart. |

## AWS setup

Steps 1–2 are already done (domain verified, production access granted). Steps
3–5 are what remains.

### 1. Verify the domain (done)
SES → Verified identities → the DKIM CNAMEs published in DNS.

### 2. Production access (done)
Out of sandbox — arbitrary recipients, full rate.

### 3. IAM user for sending

Create a user with this policy and nothing more. `ses:SendRawEmail` is included
because attachments and custom headers go out as raw MIME.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["ses:SendEmail", "ses:SendRawEmail"],
    "Resource": "*"
  }]
}
```

Put the access key into Platform Settings, not `.env` — that is where every
other credential on this platform lives, and it keeps per-tenant override
possible.

### 4. SPF and DMARC

DKIM alone is not enough for good placement at Gmail. Add to DNS:

```
codebegun.com.  TXT  "v=spf1 include:amazonses.com ~all"
_dmarc.codebegun.com.  TXT  "v=DMARC1; p=none; rua=mailto:dmarc@codebegun.com"
```

Start DMARC at `p=none` and watch the reports before tightening to `quarantine`.

If a custom MAIL FROM subdomain is configured in SES (recommended for DMARC
alignment), that subdomain needs its own MX and SPF records.

### 5. Bounce and complaint events

Without this, hard bounces never reach the suppression list, and repeatedly
mailing dead addresses is what gets a sending account throttled or suspended.

1. SNS → create topic `codebegun-ses-events`.
2. SES → Configuration sets → create one (e.g. `codebegun-events`) → add an
   event destination for **Bounce** and **Complaint** → target the SNS topic.
3. SNS → the topic → create an **HTTPS** subscription pointing at:
   `https://platform.codebegun.com/api/v1/public/ses-events`
4. The endpoint auto-confirms the subscription. Watch for
   `[SES-EVENTS] confirming SNS subscription` in the server log.
5. Put the configuration set name into `SES_CONFIGURATION_SET`.

Test with SES's simulator addresses — these do not affect reputation:

| Address | Result |
|---|---|
| `bounce@simulator.amazonses.com` | hard bounce → suppressed |
| `complaint@simulator.amazonses.com` | complaint → suppressed |
| `success@simulator.amazonses.com` | delivered, nothing suppressed |

### Endpoint security

The endpoint is public because SNS requires it, so it verifies every message
before acting:

- The signature is checked against the cert AWS names in `SigningCertURL`.
- That URL must be `https://sns.<region>.amazonaws.com` — otherwise an attacker
  supplies their own cert and signs their own payload.
- A tampered payload fails verification even with an otherwise valid signature.
- `SubscribeURL` is re-checked before it is fetched.

A forged bounce is rejected with 403 and suppresses nobody. This matters: an
unverified endpoint would let anyone permanently stop mail to any student.

Only **permanent** bounces and complaints suppress. Transient bounces (a full
mailbox) do not — that would cut off a student whose inbox was briefly full.

## What SES does not replace

**Inbound mail.** SES is send-only here.
`services/partnerReplyService.ts` polls a real mailbox over IMAP for partner
replies, and SES has no IMAP. The Hostinger/Gmail mailbox must stay for
receiving, and `EMAIL_USER`/`EMAIL_PASSWORD` remain in use for IMAP even for
tenants sending through SES.

## Rollback

All of these are UI actions except the last. None need a restart.

| Scope | Action |
|---|---|
| One tenant | Platform Settings → pick the tenant → Email → `EMAIL_SERVICE` = `brevo` |
| Every tenant | Platform Settings → platform scope → Email → `EMAIL_SERVICE` = `brevo` |
| Code revert | Previous commit. Nothing in the schema changed. |

Brevo and SMTP credentials are untouched by this change, so all of these work
immediately.

## Cutover order

The safe sequence, entirely through the UI:

1. **Before deploying**, set platform-scope `EMAIL_SERVICE` = `brevo`
   explicitly. Nothing changes today, and it pins current behaviour so the
   deploy cannot move anyone.
2. Fill in `SES_REGION`, the IAM key, and `SES_CONFIGURATION_SET`. Inert until
   a tenant is actually on `ses`.
3. Deploy.
4. Set **one** tenant's `EMAIL_SERVICE` = `ses`. Use **Send test email** on that
   tenant, then send a real welcome email and confirm headers/DKIM at the
   recipient.
5. Flip platform scope to `ses`. Any tenant still pinned to `brevo` stays there.

Step 1 is the one that matters: without it, the deploy itself moves every
unconfigured tenant to SES the moment it lands.

## Tests

```
src/tests/sesMailer.test.ts            12 tests — Simple vs Raw, config set, retry rules
src/tests/sesEvents.test.ts            13 tests — signature forgery, suppression rules
src/tests/emailProviderRouting.test.ts 10 tests — provider selection, per-tenant override
```
