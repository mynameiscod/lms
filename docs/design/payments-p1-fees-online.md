# Payments P1 — Online Fee Collection (Razorpay)

> Status: **DESIGN — not implemented.** Awaiting go-ahead.
> Part of a phased Payment module. P1 = fees online. Later: P2 one-off items, P3 GST
> invoices (per-tenant toggle), P4 subscriptions.

## Goal
Let a student pay their **fee / an installment** online via Razorpay; the payment is
**auto-reconciled into their `Fee` record** (paidAmount, installment status, receipt) — the
same record admins update by manual recording today. Both channels coexist.

## What already exists (reused, not rebuilt)
- `razorpayService`: per-tenant `getConfig(tenantId)`, `createOrder`, `verifyPaymentSignature`,
  `verifyWebhookSignature`. Keys are per-tenant settings (`RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET`).
- `Payment` model + `/payments` (order/verify) + a public webhook — currently hardwired to
  `purpose: 'learning_plan_unlock'`.
- `Fee` model: totalAmount, registrationFee, studyMaterials, otherCharges, discount,
  `installments[{amount,dueDate,status,paidDate}]`, paidAmount, dueAmount, receiptNumber,
  status (pending|partial|paid|overdue). Admin flow: `recordPayment` / `getReceipt` / reminders.

## Keystone change — generalize the payment rail (do first)
Make `Payment` purpose-agnostic so every future phase reuses one rail:
```ts
purpose: 'learning_plan_unlock' | 'fee' | 'fee_installment'   // + certificate|item|subscription later
target:  { refModel: 'Fee' | 'CurriculumEnrollment' | ...; refId: ObjectId }
feeId?, installmentId?           // convenience for reconcile
gstInvoiceId?                    // P3
```
Existing `learning_plan_unlock` rows keep working unchanged (additive fields).

## Admin-configurable payment-amount policy (per your call)
Per-tenant setting (Platform Settings) + optional per-fee override:
```
FEE_PAYMENT_MODE: 'full' | 'installments' | 'partial'
```
- `full` — student pays the whole outstanding due.
- `installments` — student pays the next/selected installment only.
- `partial` — student enters any amount up to the outstanding due.
The student "Pay now" UI adapts to the mode; the server re-validates (never trust the client amount).

## Flow
```
Student → Fee Details → "Pay ₹X" (mode-driven)
  → POST /payments/order  { purpose:'fee', feeId, installmentId?, amount }
      server validates amount vs Fee (mode + outstanding), creates Razorpay order,
      writes Payment{status:'created'}
  → Razorpay Checkout (client, per-tenant keyId)
  → POST /payments/verify  (signature)  AND  webhook (source of truth)
      → reconcileFeePayment(payment): idempotent
          Fee.paidAmount += amount; recompute dueAmount + status;
          if installmentId → mark that installment paid;
          ensure receiptNumber; append to Fee payments ledger;
          Payment{status:'paid', paidAt}
```
- **Webhook is the source of truth** (verify is a UX fast-path). Both call the same idempotent
  `reconcileFeePayment` keyed on `orderId`/`paymentId` so a double event never double-credits.
- Reuse the admin `recordPayment` reconcile logic (extract it into a shared service) so online +
  manual write identical Fee updates + receipts.

## Admin pay-link
`POST /fees/:studentId/pay-link` → returns a tokenized checkout URL for that fee/installment
(reuse in reminder WhatsApp/email). Student opens → same order/checkout/webhook path.

## Data / API summary
- `Payment`: add `purpose` values, `target`, `feeId`, `installmentId`, `gstInvoiceId?` (additive).
- `Fee`: add a `payments[]` ledger entry shape shared by manual + online (or reuse existing).
- Endpoints:
  - `POST /payments/order` — extend to accept `purpose:'fee'`, validate amount server-side.
  - `POST /payments/verify` — extend to reconcile fees.
  - webhook — route by `purpose` → `reconcileFeePayment`.
  - `POST /fees/:studentId/pay-link` — admin.
  - `GET /payments` (admin) — transactions ledger + reconciliation view (status, student, fee, amount).
- Settings: `FEE_PAYMENT_MODE` (per-tenant), reuse existing Razorpay keys.

## UI
- **Student → Fee Details:** "Pay now" (amount per `FEE_PAYMENT_MODE`), Razorpay Checkout, success →
  updated balance + downloadable receipt.
- **Admin → Fees:** a "Payments/Transactions" tab (online + manual, status, reconcile), "Send pay link".

## Backward-compat & safety
- Additive schema; `learning_plan_unlock` untouched.
- Server always recomputes the payable amount from the `Fee` — client amount is never trusted.
- Idempotent reconcile (verify + webhook can't double-credit).
- If Razorpay isn't configured for a tenant, the "Pay now" button is hidden (manual only).

## Open decision (P1)
- **Refunds:** include admin-initiated refund (Razorpay refund API → Fee adjust + `Payment.status:'refunded'`)
  in P1, or defer to P1.5? Recommend **include a minimal admin refund** — reconciliation is incomplete without it.

## Rollout (within P1)
1. Generalize `Payment` + extract shared `reconcileFeePayment` from `recordPayment`.
2. `POST /payments/order` + `verify` + webhook for `purpose:'fee'` (server-validated amount).
3. Student "Pay now" UI (mode-driven) + receipt.
4. Admin transactions/reconciliation tab + pay-link.
5. (If in scope) minimal admin refund.
