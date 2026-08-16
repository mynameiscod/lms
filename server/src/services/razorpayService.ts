import crypto from 'crypto';
import Razorpay from 'razorpay';
import * as settings from './settingsService';

/**
 * razorpayService — thin wrapper over the Razorpay SDK that reads credentials
 * and the plan price from admin-managed settings (per-tenant capable), so keys
 * never have to live in code/.env. Used by the learning-plan unlock paywall.
 */

const DEFAULT_PRICE_INR = 4999;

export interface RzpConfig {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}

/** Resolve Razorpay credentials for a tenant (falls back to platform/.env). */
export function getConfig(tenantId?: string): RzpConfig | null {
  const keyId = settings.getStr('RAZORPAY_KEY_ID', '', tenantId);
  const keySecret = settings.getStr('RAZORPAY_KEY_SECRET', '', tenantId);
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret, webhookSecret: settings.getStr('RAZORPAY_WEBHOOK_SECRET', '', tenantId) || undefined };
}

export function isConfigured(tenantId?: string): boolean {
  return getConfig(tenantId) !== null;
}

/** Unlock price in whole rupees for a tenant. */
export function getPriceInr(tenantId?: string): number {
  const v = settings.getNum('LEARNING_PLAN_PRICE_INR', DEFAULT_PRICE_INR, tenantId);
  return v > 0 ? Math.round(v) : DEFAULT_PRICE_INR;
}

function client(cfg: RzpConfig): Razorpay {
  return new Razorpay({ key_id: cfg.keyId, key_secret: cfg.keySecret });
}

export interface CreatedOrder {
  id: string;
  amount: number;   // paise
  currency: string;
  keyId: string;
}

/**
 * Create a Razorpay order for `amountInr` rupees. `receipt` is a short caller
 * reference (≤40 chars per Razorpay). Throws if Razorpay isn't configured.
 */
export async function createOrder(
  tenantId: string,
  amountInr: number,
  receipt: string,
  notes: Record<string, string> = {}
): Promise<CreatedOrder> {
  const cfg = getConfig(tenantId);
  if (!cfg) throw new Error('Razorpay is not configured. Add the keys in Platform Settings → Other Integrations.');
  const amount = Math.round(amountInr * 100); // paise
  const order = await client(cfg).orders.create({
    amount,
    currency: 'INR',
    receipt: receipt.slice(0, 40),
    notes,
  });
  return { id: order.id, amount: Number(order.amount), currency: order.currency, keyId: cfg.keyId };
}

/**
 * What Razorpay says was actually captured, straight from their API.
 *
 * The checkout signature proves a payment belongs to an order; it says nothing about how
 * much was captured. Razorpay supports partial capture, so "authentic" and "paid in full"
 * are different claims, and only this call can settle the second one. The webhook carries
 * the same figures inside a signed body — this exists for the verify and return paths,
 * where the browser hands us an id and nothing else worth trusting.
 */
export async function fetchPayment(tenantId: string, paymentId: string): Promise<{
  id: string; amount: number; currency: string; status: string; orderId: string;
} | null> {
  const cfg = getConfig(tenantId);
  if (!cfg) return null;
  try {
    const p: any = await client(cfg).payments.fetch(paymentId);
    return {
      id: String(p.id),
      amount: Number(p.amount),
      currency: String(p.currency),
      status: String(p.status),
      orderId: String(p.order_id || ''),
    };
  } catch {
    // A lookup failure must not be read as "the amount was fine" — the caller treats null
    // as unverifiable and refuses to settle.
    return null;
  }
}

/** Refund a captured payment (full or partial). amountInr in rupees; omit for full. */
export async function refundPayment(tenantId: string, paymentId: string, amountInr?: number): Promise<{ id: string; amount: number; status: string }> {
  const cfg = getConfig(tenantId);
  if (!cfg) throw new Error('Razorpay is not configured.');
  const opts: any = {};
  if (amountInr && amountInr > 0) opts.amount = Math.round(amountInr * 100); // paise
  const rf: any = await (client(cfg).payments as any).refund(paymentId, opts);
  return { id: rf.id, amount: Number(rf.amount), status: rf.status };
}

/**
 * Verify the checkout handler signature: HMAC_SHA256(orderId | paymentId) with
 * the key secret must equal the signature Razorpay returned in the browser.
 */
export function verifyPaymentSignature(
  tenantId: string,
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const cfg = getConfig(tenantId);
  if (!cfg) return false;
  const expected = crypto
    .createHmac('sha256', cfg.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return timingSafeEqual(expected, signature);
}

/** Verify a Razorpay webhook payload against the configured webhook secret. */
export function verifyWebhookSignature(tenantId: string | undefined, rawBody: Buffer | string, signature: string): boolean {
  const cfg = getConfig(tenantId);
  const secret = cfg?.webhookSecret;
  if (!secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return timingSafeEqual(expected, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
