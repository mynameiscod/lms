import axios from 'axios';

const BASE = '/api/v1/payments';

const authHeader = () => {
  const token    = localStorage.getItem('token');
  const tenantId = localStorage.getItem('tenantId');
  return {
    ...(token    && { Authorization: `Bearer ${token}` }),
    ...(tenantId && { 'X-Tenant-Id': tenantId }),
  };
};

export interface OrderResponse {
  orderId: string;
  amount: number;       // paise
  currency: string;
  keyId: string;
  priceInr: number;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
}

const RZP_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/** Lazily inject the Razorpay checkout script (once). */
export function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const existing = document.querySelector(`script[src="${RZP_SRC}"]`);
    if (existing) { existing.addEventListener('load', () => resolve(true)); existing.addEventListener('error', () => resolve(false)); return; }
    const s = document.createElement('script');
    s.src = RZP_SRC;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export const paymentApi = {
  getConfig: async (): Promise<{ available: boolean; priceInr: number; currency: string }> => {
    const { data } = await axios.get(`${BASE}/config`, { headers: authHeader() });
    return data.data;
  },

  createOrder: async (enrollmentId?: string): Promise<OrderResponse> => {
    const { data } = await axios.post(`${BASE}/order`, { enrollmentId }, { headers: authHeader() });
    return data.data;
  },

  verify: async (payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }): Promise<{ unlocked: number }> => {
    const { data } = await axios.post(`${BASE}/verify`, payload, { headers: authHeader() });
    return data.data;
  },
};

/**
 * Run the full unlock checkout: create an order, open Razorpay, verify on
 * success. Resolves true once the plan is unlocked, false if the user dismissed
 * the modal. Throws on configuration / network / verification errors.
 */
export async function unlockPlanCheckout(enrollmentId?: string): Promise<boolean> {
  const ok = await loadRazorpay();
  if (!ok) throw new Error('Could not load the payment library. Check your connection and try again.');

  const order = await paymentApi.createOrder(enrollmentId);

  return new Promise<boolean>((resolve, reject) => {
    const rzp = new (window as any).Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      order_id: order.orderId,
      prefill: order.prefill,
      theme: { color: '#6650d8' },
      handler: async (resp: any) => {
        try {
          await paymentApi.verify({
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          resolve(true);
        } catch (e) {
          reject(e);
        }
      },
      modal: { ondismiss: () => resolve(false) },
    });
    rzp.on('payment.failed', (resp: any) => reject(new Error(resp?.error?.description || 'Payment failed')));
    rzp.open();
  });
}
