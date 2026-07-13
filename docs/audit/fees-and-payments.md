# Fees & Payments
**Completion:** 75%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
Collect and track money: (1) offline/manual **course fees** with component breakdown, discounts, installments and receipts; (2) **seat reservations** (a lead pays a token/partial amount to book a batch seat, with demo period, refunds, and conversion to enrolled student); (3) **Razorpay online payments** for self-serve learning-plan unlock. This is the platform's revenue-capture surface — directly tied to cash flow.

## Primary Users & Roles
- **STAFF / TENANT_ADMIN** — assign fees, record payments (`view_fees`/`manage_billing`), manage seat reservations (`manage_leads`/`view_leads`/`edit_leads`).
- **STUDENT** — view own fee details, download own receipt (`/fees/me/receipt`), pay for learning-plan unlock via Razorpay.
- **Public (webhook)** — Razorpay server-side webhook (signature-verified, no auth).

## Key Files (traced)
- Models: `server/src/models/Fee.ts`, `Payment.ts`, `SeatReservation.ts`.
- Service: `server/src/services/razorpayService.ts` (real SDK — orders, HMAC verify, webhook verify).
- Controllers: `server/src/controllers/feeController.ts`, `paymentController.ts`, `seatReservationController.ts`.
- Routes: `server/src/routes/feeRoutes.ts` (13), `paymentRoutes.ts` (3 + webhook), `seatReservationRoutes.ts` (18).
- Client: `client/src/pages/Fees/`, `StudentFeeDetails/`, `SeatReservations/`; `client/src/api/feeApi.ts`, `paymentApi.ts`.

## Dependencies & Connected Modules
- **Lead/CRM** (SeatReservation links `leadId`; activities logged to lead).
- **Enrollment** (convert-to-student → enrollment; Payment unlocks learning plans).
- **Email** (`emailService` for receipts, confirmations, reminders, pre-joining/joining-day).
- **WhatsApp Cloud API** (payment reminders via Graph API v18.0, creds from tenant LeadSourceConfig).
- **Settings** (Razorpay keys + unlock price + receipt branding per tenant).

## Entry / Exit Points
- Entry: `GET/PUT /fees/*`, `POST /fees/:studentId/payments`, `POST /payments/order`, `POST /payments/verify`, `POST /payments/webhook`, `POST /seat-reservations`, `POST /seat-reservations/:id/payment`.
- Exit: Razorpay order (paise); verified payment → unlock; receipt HTML/email; confirmation/reminder emails + WhatsApp; refund records; enrolled student.

## Database Tables & Relationships
- **Fee** (studentId→User, batchId→Batch): totalAmount, registrationFee, studyMaterials, otherCharges, discount, paidAmount, dueAmount, `installments[]`, `payments[]` (method cash|card|upi|bank_transfer|other, receivedBy→staff), status pending|partial|paid|overdue (pre-save auto-calc).
- **Payment** (studentId→User, enrollmentId→Enrollment): Razorpay only — purpose `learning_plan_unlock`, orderId (unique), paymentId, signature, amount (paise), status created|paid|failed, unlockedPlans.
- **SeatReservation** (leadId→Lead, studentId→User, courseId, batchId): originalPrice/discount/finalPrice/paidAmount/balanceAmount, `payments[]` (7 methods incl razorpay/phonepe/paytm), `refunds[]`, `installmentPlan[]`, demo lifecycle (demoEnabled, demoStatus none|active|satisfied|refunded), status pending|partial_paid|paid|confirmed|enrolled|cancelled|expired; 5 indexes; pre-save reconciles payments vs refunds.

## Events / Notifications / Emails / WhatsApp
- Emails: receipt, confirmation, payment reminder, pre-joining docs, joining-day portal access (all via `emailService`).
- WhatsApp: manual payment reminder (Graph API v18.0).
- UPI QR generated via free `api.qrserver.com` from `upi://pay?pa={UPI_ID}`.
- **No scheduled/cron reminders** — all sends are manual button-triggered.

## AI Features
None.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| Razorpay | Online fee/unlock payments | ~2% per txn, no monthly fee | Real integration: order create + HMAC-SHA256 signature verify + webhook. Revenue-linked cost. |
| WhatsApp Cloud API | Payment reminders | ~₹0.13–0.35/utility msg | Manual only |
| SMTP (Hostinger) | Receipts / reminders | ~₹0 (bundled) | Paced |
| qrserver.com | UPI QR image | ₹0 | Free public API |
| UPI (manual) | Fallback collection | ₹0 | `UPI_ID` setting; manual reconcile |

## Validation Rules & Edge Cases
- Pre-save hooks auto-compute dueAmount/status and reconcile net payment vs refunds — good source-of-truth.
- Razorpay verify is cryptographic (timing-safe HMAC) and idempotent (checks status='paid' before unlocking) — prevents double-unlock.
- Weaknesses: no schema-level amount validators beyond controller checks; temp password emailed in cleartext on convert-to-student (seatReservationController); no rate-limiting on `/payments/verify`.

## Completion Breakdown
| Dimension | % | Reasoning |
| Backend | 92 | Full fee CRUD, Razorpay orders/verify/webhook, seat-reservation lifecycle w/ demo+refunds, email+WhatsApp. Missing: recurring/auto-billing, overdue auto-escalation. |
| Frontend/UI | 65 | Fees list + analytics + receipt download + Razorpay modal; SeatReservations page. Missing: polished installment UI, demo-period dashboard, reservation-form polish. |
| API | 95 | 34 endpoints + signature-verified webhook. Missing: payment export, reconciliation report. |
| Database | 90 | 3 normalized models, indexed, pre-save reconciliation. Missing: payment audit archive. |
| Automation | 40 | Event-driven emails/WhatsApp on record. Missing: scheduled reminders, overdue escalation, auto demo→paid. |
| AI | 0 | None. |
| Testing | 0 | No tests found. |
| **Overall** | **75** | Core money workflow is production-grade; automation + testing are the gaps. |

## Gaps (mark "Not Implemented")
- **Automation:** scheduled payment reminders — Not Implemented (manual only). Overdue fee escalation — Not Implemented. Auto demo→paid conversion — Not Implemented. Recurring/auto-billing — Not Implemented.
- **Notifications:** SMS — Not Implemented. Fee-reminder cron — Not Implemented.
- **Reports:** payment reconciliation report, collection forecast, batch payment export — Not Implemented.
- **Security:** cleartext temp password in convert email; no rate-limit on verify; SMTP creds read straight from `process.env` in seatReservationController (not via settings vault).
- **Testing/Audit:** no tests; no immutable audit trail beyond embedded arrays.
- **UX:** partial-refund UI is record-only (not interactive); loading/empty states unverified.

## Technical Debt / Performance / Security / Scalability
- Two parallel payment surfaces (Fee.payments[] manual vs Payment/Razorpay vs SeatReservation.payments[]) — no unified ledger; "total money in" needs 3 queries.
- Receipt numbers assigned on-demand, not batch-sequenced (gap/duplication risk).
- Cleartext password emailing is a real security issue.

## Suggestions & AI Opportunities
- Unify a single **PaymentLedger** across fees/reservations/Razorpay for one-query revenue reporting.
- Add cron: overdue escalation + scheduled reminders + demo-expiry conversion.
- AI opportunity: predict at-risk (likely-to-default) students from payment history; draft personalized reminder copy.

## Estimated Dev Effort
~8–12 dev-days: unified ledger + reconciliation report (3–4d), reminder/escalation crons (2d), refund UI + receipt sequencing (2d), security fixes (1d), tests (2–3d).
