import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Tenant from '../models/Tenant';
import Hackathon, { IHackathon } from '../models/Hackathon';
import HackathonRegistration from '../models/HackathonRegistration';
import * as razorpay from '../services/razorpayService';
import { EmailService } from '../services/emailService';
import {
  validateTeam, findConflicts, registrationWindowError, newRegistrationCode,
  confirmedTeamCount, isDuplicateKey, publicRegistration, ValidationFailure,
} from '../services/hackathonRegistrationService';

/**
 * The public hackathon funnel — browse, register, pay. No authentication, by design.
 *
 * THIS IS AN UNAUTHENTICATED ENDPOINT THAT WRITES ROWS AND OPENS PAYMENT ORDERS, so the
 * discipline is: validate everything against the server's own copy of the rules, create the
 * Razorpay order only once the team is known to be good, and confirm only on evidence that
 * did not come from the browser.
 *
 * NOTHING HERE READS ANOTHER TEAM'S CONTACT DETAILS BACK OUT. A registration lookup returns
 * the team's own row and member NAMES only — a public endpoint that echoed phone numbers
 * would be a scraper's list of every student who entered.
 */

const emailService = new EmailService();

const tenantIdFromSlug = async (slug: string): Promise<string | null> => {
  const t = await Tenant.findOne({ slug: String(slug || '').toLowerCase() }).select('_id').lean() as any;
  return t ? String(t._id) : null;
};

/** What the public may know about an event. */
const publicHackathon = (h: IHackathon | any) => ({
  slug: h.slug,
  title: h.title,
  description: h.description,
  process: h.process,
  venue: h.venue,
  bannerUrl: h.bannerUrl,
  startAt: h.startAt,
  endAt: h.endAt || null,
  prizes: h.prizes,
  feeInr: h.feeInr,
  isFree: !h.feeInr,
  minTeamSize: h.minTeamSize,
  maxTeamSize: h.maxTeamSize,
  registerOpensAt: h.registerOpensAt || null,
  registerClosesAt: h.registerClosesAt || null,
  // The dropdown the form renders, straight from the event — so adding a college is a
  // settings change and never a release on the website side.
  colleges: h.colleges || [],
  allowOtherCollege: h.allowOtherCollege !== false,
});

const fail = (res: Response, code: number, message: string, errors?: ValidationFailure[]) =>
  res.status(code).json({ success: false, message, ...(errors?.length ? { errors } : {}) });

/** GET /public/hackathons/:tenantSlug — everything currently open, soonest first. */
export const listHackathons = async (req: Request, res: Response) => {
  try {
    const tenantId = await tenantIdFromSlug(req.params.tenantSlug);
    if (!tenantId) return fail(res, 404, 'Unknown site.');

    const now = new Date();
    const rows = await Hackathon.find({
      tenantId,
      status: 'published',
      // Hide events that have already finished; one with no end date stays listed until closed.
      $or: [{ endAt: null }, { endAt: { $gte: now } }],
    }).sort({ startAt: 1 }).limit(50).lean();

    res.json({ success: true, hackathons: rows.map(publicHackathon) });
  } catch (e: any) {
    console.error('[hackathon] list:', e);
    res.status(500).json({ success: false, message: 'Could not load hackathons.' });
  }
};

/** GET /public/hackathons/:tenantSlug/:slug — one event, plus whether it can be joined now. */
export const getHackathon = async (req: Request, res: Response) => {
  try {
    const tenantId = await tenantIdFromSlug(req.params.tenantSlug);
    if (!tenantId) return fail(res, 404, 'Unknown site.');

    const h = await Hackathon.findOne({ tenantId, slug: String(req.params.slug || '').toLowerCase() }).lean() as any;
    if (!h || h.status === 'draft') return fail(res, 404, 'Hackathon not found.');

    const closedReason = registrationWindowError(h);
    const confirmed = await confirmedTeamCount(h._id);
    const full = h.maxTeams > 0 && confirmed >= h.maxTeams;

    res.json({
      success: true,
      hackathon: publicHackathon(h),
      registration: {
        open: !closedReason && !full,
        reason: full ? 'All places for this hackathon have been taken.' : closedReason,
        teamsRegistered: confirmed,
        // Only meaningful when there is a cap; null keeps the page from implying one.
        placesLeft: h.maxTeams > 0 ? Math.max(0, h.maxTeams - confirmed) : null,
      },
    });
  } catch (e: any) {
    console.error('[hackathon] get:', e);
    res.status(500).json({ success: false, message: 'Could not load this hackathon.' });
  }
};

/**
 * POST /public/hackathons/:tenantSlug/:slug/register
 *
 * Creates the team, then asks for money — in that order and never the reverse. A Razorpay
 * order opened before validation would leave the gateway holding orders for teams that were
 * never allowed to register, and the student staring at a payment sheet for a form that was
 * going to be rejected anyway.
 *
 * A FREE HACKATHON NEVER TOUCHES THE GATEWAY. It confirms on the spot: an order for ₹0
 * cannot be paid, so a pending registration nobody can settle would strand every team.
 */
export const register = async (req: Request, res: Response) => {
  try {
    const tenantId = await tenantIdFromSlug(req.params.tenantSlug);
    if (!tenantId) return fail(res, 404, 'Unknown site.');

    const h = await Hackathon.findOne({ tenantId, slug: String(req.params.slug || '').toLowerCase() }) as any;
    if (!h || h.status === 'draft') return fail(res, 404, 'Hackathon not found.');

    const closed = registrationWindowError(h);
    if (closed) return fail(res, 409, closed);

    const { team, errors } = validateTeam(req.body || {}, h);
    if (errors.length || !team) return fail(res, 400, 'Please correct the highlighted fields.', errors);

    // Capacity, checked before anyone is charged.
    if (h.maxTeams > 0 && (await confirmedTeamCount(h._id)) >= h.maxTeams) {
      return fail(res, 409, 'All places for this hackathon have been taken.');
    }

    const conflicts = await findConflicts(h._id, team);
    if (conflicts.length) return fail(res, 409, 'This team cannot be registered as it is.', conflicts);

    const isFree = !h.feeInr || h.feeInr <= 0;
    const registrationCode = newRegistrationCode();

    let reg: any;
    try {
      reg = await HackathonRegistration.create({
        tenantId,
        hackathonId: h._id,
        hackathonSlug: h.slug,
        ...team,
        status: isFree ? 'confirmed' : 'pending_payment',
        amountInr: isFree ? 0 : h.feeInr,
        registrationCode,
        confirmedAt: isFree ? new Date() : null,
        ipAddress: req.ip,
        userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
      });
    } catch (e: any) {
      /**
       * The unique indexes fired, which means another team confirmed between our check above
       * and this write. Not an error to apologise for — re-run the check and tell the student
       * exactly which detail is now taken.
       */
      if (isDuplicateKey(e)) {
        const late = await findConflicts(h._id, team);
        return fail(res, 409, 'Someone just registered with one of these details.', late.length ? late
          : [{ field: 'teamName', message: 'Someone in this team was just registered by another entry.' }]);
      }
      throw e;
    }

    if (isFree) {
      await sendConfirmation(h, reg).catch(() => { /* never fail a good registration on a mail problem */ });
      return res.json({ success: true, paymentRequired: false, registration: publicRegistration(reg) });
    }

    // ── Paid: open the order LAST, once the team is stored and valid ──
    if (!razorpay.isConfigured(tenantId)) {
      // The row would otherwise sit pending forever with no way to pay it.
      await HackathonRegistration.updateOne({ _id: reg._id }, { $set: { status: 'cancelled', cancelReason: 'Payments not configured' } });
      return fail(res, 503, 'Online payment is not available right now. Please try again later.');
    }

    try {
      const order = await razorpay.createOrder(tenantId, h.feeInr, reg.registrationCode, {
        purpose: 'hackathon',
        hackathon: h.slug,
        registrationCode: reg.registrationCode,
        team: team.teamName.slice(0, 40),
      });
      reg.payment = { provider: 'razorpay', orderId: order.id, amountPaise: order.amount, status: 'created' };
      await reg.save();

      return res.json({
        success: true,
        paymentRequired: true,
        registration: publicRegistration(reg),
        // Everything the Razorpay checkout widget needs, and nothing secret: the key id is
        // public by design, the secret never leaves the server.
        payment: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: order.keyId,
          name: h.title,
          description: `${h.title} — team ${team.teamName}`,
          prefill: {
            name: team.members[0].name,
            email: team.members[0].email,
            contact: team.members[0].mobile,
          },
        },
      });
    } catch (e: any) {
      await HackathonRegistration.updateOne({ _id: reg._id }, { $set: { status: 'cancelled', cancelReason: 'Could not open payment order' } });
      console.error('[hackathon] createOrder:', e?.message || e);
      return fail(res, 502, 'Could not start the payment. Please try again in a moment.');
    }
  } catch (e: any) {
    console.error('[hackathon] register:', e);
    res.status(500).json({ success: false, message: 'Could not complete your registration.' });
  }
};

/**
 * POST /public/hackathons/payment/verify — the browser coming back from checkout.
 *
 * A CONVENIENCE, NOT THE SOURCE OF TRUTH. The webhook confirms registrations whether or not
 * this is ever called; this exists so the team sees "confirmed" immediately instead of
 * watching a spinner until a webhook lands. It is safe because it proves two separate things
 * before it believes anything: the signature (this payment belongs to this order) and a
 * server-side fetch (this much money was actually captured). The signature alone says nothing
 * about the amount — Razorpay supports partial capture.
 */
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const orderId = String(req.body?.razorpay_order_id || '');
    const paymentId = String(req.body?.razorpay_payment_id || '');
    const signature = String(req.body?.razorpay_signature || '');
    if (!orderId || !paymentId || !signature) return fail(res, 400, 'Incomplete payment details.');

    const reg = await HackathonRegistration.findOne({ 'payment.orderId': orderId });
    if (!reg) return fail(res, 404, 'We could not find that registration.');

    if (!razorpay.verifyPaymentSignature(reg.tenantId, orderId, paymentId, signature)) {
      return fail(res, 400, 'That payment could not be verified.');
    }

    /**
     * The signature proves this payment belongs to this order. It says NOTHING about how
     * much was captured, and Razorpay supports partial capture — so the amount is confirmed
     * by asking Razorpay directly.
     *
     * `fetchPayment` returns null when it could not find out, and null is not "the amount
     * was fine". Rather than confirm a place on an amount we failed to verify, we leave the
     * registration pending and let the webhook — which carries the figures inside a
     * signature-verified body — settle it. The team is told their payment is being confirmed
     * rather than being shown an error for a payment that very likely succeeded.
     */
    const captured = await razorpay.fetchPayment(reg.tenantId, paymentId).catch(() => null);
    if (!captured) {
      return res.status(202).json({
        success: true,
        pending: true,
        message: 'Your payment has been received and is being confirmed. You will get an email shortly.',
        registration: publicRegistration(reg),
      });
    }

    const settled = await settleRegistration(reg, paymentId, signature, captured);
    if (settled.ok === false) return fail(res, 409, settled.message);

    res.json({ success: true, registration: publicRegistration(settled.reg) });
  } catch (e: any) {
    console.error('[hackathon] verifyPayment:', e);
    res.status(500).json({ success: false, message: 'Could not confirm your payment.' });
  }
};

/**
 * Confirm a paid registration, from whichever evidence arrived first.
 *
 * IDEMPOTENT, because both the webhook and the browser call it and there is no ordering
 * between them: an already-confirmed row returns success and is not written again.
 *
 * THE AMOUNT IS CHECKED, NOT ASSUMED. `captured` comes either from a signature-verified
 * webhook body or from Razorpay's own API, and a short payment is refused rather than
 * confirmed — otherwise a partially captured order buys a place at whatever price the payer
 * chose.
 */
export async function settleRegistration(
  reg: any,
  paymentId: string,
  signature: string | undefined,
  captured: { amount: number; currency: string; orderId: string } | null | undefined,
): Promise<{ ok: true; reg: any } | { ok: false; message: string }> {
  if (reg.status === 'confirmed') return { ok: true, reg };
  if (reg.status === 'refund_due') return { ok: false, message: 'This payment is being refunded — the place could not be held.' };

  /**
   * NO FIGURES, NO CONFIRMATION. Both callers now supply them — the webhook from its signed
   * body, the return path from Razorpay's API — so an absent `captured` means something went
   * wrong upstream, and confirming anyway would hand out a place on an unverified amount.
   */
  if (!captured) return { ok: false, message: 'The payment could not be verified yet. Please wait a moment.' };

  const owed = reg.payment?.amountPaise ?? Math.round((reg.amountInr || 0) * 100);
  if (captured.amount < owed || (captured.orderId && captured.orderId !== reg.payment?.orderId)) {
    reg.payment = { ...(reg.payment as any), paymentId, signature, status: 'paid', paidAt: new Date() };
    reg.status = 'refund_due';
    reg.cancelReason = `Captured ${captured.amount} paise against ${owed} owed — short payment, refund required.`;
    await reg.save();
    return { ok: false, message: 'The payment did not cover the registration fee. Our team will contact you.' };
  }

  reg.payment = { ...(reg.payment as any), paymentId, signature, status: 'paid', paidAt: new Date() };
  reg.status = 'confirmed';
  reg.confirmedAt = new Date();

  try {
    await reg.save();
  } catch (e: any) {
    /**
     * The unique indexes only apply to CONFIRMED rows, so this is where a race between two
     * paying teams is finally settled. The money is real and the place is not available, so
     * the row becomes `refund_due` rather than being quietly cancelled — somebody is owed
     * their fee back and that must be visible on the admin screen.
     */
    if (isDuplicateKey(e)) {
      reg.status = 'refund_due';
      reg.confirmedAt = null;
      reg.cancelReason = 'Another team confirmed first with a matching team name or member. Refund required.';
      await reg.save().catch(() => { /* leave it for the admin screen either way */ });
      return { ok: false, message: 'Another team registered with one of these details first. Your payment will be refunded.' };
    }
    throw e;
  }

  const h = await Hackathon.findById(reg.hackathonId).lean() as any;
  if (h) await sendConfirmation(h, reg).catch(() => { /* a mail failure must not undo a paid place */ });
  return { ok: true, reg };
}

/** GET /public/hackathons/registration/:code — a team checking on itself. */
export const getRegistration = async (req: Request, res: Response) => {
  try {
    const reg = await HackathonRegistration.findOne({ registrationCode: String(req.params.code || '').toUpperCase() }).lean() as any;
    if (!reg) return fail(res, 404, 'We could not find that registration.');
    const h = await Hackathon.findById(reg.hackathonId).select('title slug startAt venue').lean() as any;
    res.json({ success: true, registration: publicRegistration(reg), hackathon: h ? { title: h.title, slug: h.slug, startAt: h.startAt, venue: h.venue } : null });
  } catch (e: any) {
    console.error('[hackathon] getRegistration:', e);
    res.status(500).json({ success: false, message: 'Could not load that registration.' });
  }
};

/** The one email that matters: proof to the team lead that the place is theirs. */
async function sendConfirmation(h: any, reg: any): Promise<void> {
  const lead = (reg.members || []).find((m: any) => m.isLead) || (reg.members || [])[0];
  if (!lead?.email) return;

  const when = new Date(h.startAt).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' });
  const roster = (reg.members || [])
    .map((m: any, i: number) => `<li>${escapeHtml(m.name)}${i === 0 ? ' <b>(team lead)</b>' : ''}</li>`).join('');

  const html = `
    <p>Hi ${escapeHtml(lead.name)},</p>
    <p>Your team <b>${escapeHtml(reg.teamName)}</b> is registered for <b>${escapeHtml(h.title)}</b>.</p>
    <p>
      <b>Registration code:</b> ${escapeHtml(reg.registrationCode)}<br/>
      <b>When:</b> ${escapeHtml(when)}<br/>
      ${h.venue ? `<b>Where:</b> ${escapeHtml(h.venue)}<br/>` : ''}
      <b>College:</b> ${escapeHtml(reg.college)}<br/>
      ${reg.amountInr ? `<b>Fee paid:</b> ₹${reg.amountInr}<br/>` : ''}
    </p>
    <p><b>Your team</b></p><ul>${roster}</ul>
    <p>Keep your registration code — you will be asked for it at the venue.</p>`;

  await emailService.sendGenericEmail(lead.email, `You're registered for ${h.title} 🎉`, html);
}

const escapeHtml = (s: string): string =>
  String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
