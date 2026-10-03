import mongoose from 'mongoose';
import PlacementCandidate, { IPlacementCandidate } from '../models/PlacementCandidate';
import PlacementProgramConfig, { IPlacementProgramConfig } from '../models/PlacementProgramConfig';
import PlacementInterviewer from '../models/PlacementInterviewer';
import PlacementBooking, { IPlacementBooking } from '../models/PlacementBooking';
import PlacementEvent from '../models/PlacementEvent';
import Tenant from '../models/Tenant';
import * as razorpay from './razorpayService';
import { sendByPurpose } from './purposeMessaging';
import { EmailService } from './emailService';
import { generateSlots, buildIcs, istLabel, Slot } from '../data/placementSlotPolicy';
import { PlacementError, newPortalToken } from './placementProgramService';
export { newPortalToken };

/**
 * Placement Program — Phase 2: the candidate's own page (fee, booking), and the admin side of it.
 *
 * The candidate has no account. Their page is reached by an unguessable token; everything they can
 * do there is limited to their own record. The fee is recorded on the candidate (like hackathon
 * registrations) because Payment rows require an LMS user and an ad lead is not one.
 */

export const BOOKED_PURPOSE = 'PLACEMENT_INTERVIEW_BOOKED';
export const REMINDER_PURPOSE = 'PLACEMENT_INTERVIEW_REMINDER';
const PUBLIC_BASE = () => (process.env.CLIENT_URL || process.env.PUBLIC_APP_URL || 'https://platform.codebegun.com').replace(/\/+$/, '');

export const portalUrl = (token: string) => `${PUBLIC_BASE()}/placement-program/me/${token}`;

async function event(tenantId: any, candidateId: any, kind: string, message: string, data?: any, actorId?: string) {
  await PlacementEvent.create({
    tenantId, candidateId, kind, message, data,
    actorId: actorId && mongoose.Types.ObjectId.isValid(actorId) ? actorId : undefined,
  }).catch((e) => console.error('[placement] event not recorded:', e?.message));
}

export async function getConfig(tenantId: string): Promise<IPlacementProgramConfig> {
  const found = await PlacementProgramConfig.findOne({ tenantId });
  return found || PlacementProgramConfig.create({ tenantId });
}

export async function saveConfig(tenantId: string, body: any) {
  const allowed = ['feeInr', 'refundablePct', 'paymentBeforeBooking', 'slotMinutes', 'bufferMinutes', 'bookingWindowDays', 'minNoticeHours'];
  const $set: any = {};
  for (const k of allowed) if (body?.[k] !== undefined) $set[k] = k === 'paymentBeforeBooking' ? !!body[k] : Number(body[k]);
  if ($set.feeInr !== undefined && (!Number.isFinite($set.feeInr) || $set.feeInr < 0 || $set.feeInr > 100000)) throw new PlacementError('Fee must be between ₹0 and ₹1,00,000.');
  if ($set.refundablePct !== undefined && ($set.refundablePct < 0 || $set.refundablePct > 100)) throw new PlacementError('Refundable share must be 0–100%.');
  if (body?.agreement !== undefined) {
    const title = String(body.agreement?.title || '').trim().slice(0, 120);
    const text = String(body.agreement?.body || '').replace(/\r\n/g, '\n').slice(0, 30000);
    const current = (await getConfig(tenantId)).agreement;
    const changed = !current || current.title !== title || current.body !== text;
    // A new version on every change: what each candidate signed stays identifiable.
    $set.agreement = { title, body: text, version: changed ? (current?.version || 0) + 1 : current!.version };
  }
  if (body?.scorecardCriteria !== undefined) {
    const list = [...new Set((Array.isArray(body.scorecardCriteria) ? body.scorecardCriteria : [])
      .map((x: any) => String(x).trim().slice(0, 40)).filter(Boolean))] as string[];
    if (!list.length || list.length > 8) throw new PlacementError('The scorecard needs between 1 and 8 things to rate.');
    $set.scorecardCriteria = list;
  }
  await getConfig(tenantId);
  return PlacementProgramConfig.findOneAndUpdate({ tenantId }, { $set }, { new: true, runValidators: true });
}

/** Whether this candidate must pay before the calendar opens to them. */
export function mustPayFirst(c: IPlacementCandidate, cfg: IPlacementProgramConfig): boolean {
  if (!cfg.paymentBeforeBooking || !cfg.feeInr) return false;
  if (c.fee?.waived) return false;
  return c.fee?.status !== 'paid' && c.fee?.status !== 'refunded';
}

async function byToken(token: string) {
  const t = String(token || '').trim();
  if (t.length < 20) throw new PlacementError('This link is not valid.', 404);
  const c = await PlacementCandidate.findOne({ portalToken: t });
  if (!c) throw new PlacementError('This link is not valid.', 404);
  return c;
}

async function activeBooking(candidateId: any) {
  return PlacementBooking.findOne({ candidateId, status: 'booked', endsAt: { $gt: new Date() } }).populate('interviewerId', 'name');
}

/** What the candidate's page shows. */
export async function portalView(token: string) {
  const c = await byToken(token);
  const cfg = await getConfig(String(c.tenantId));
  const booking = await activeBooking(c._id);
  const tenant = await Tenant.findById(c.tenantId).select('name').lean() as any;
  const payFirst = mustPayFirst(c, cfg);
  const feeDue = !!cfg.feeInr && !c.fee?.waived && c.fee?.status !== 'paid' && c.fee?.status !== 'refunded';
  return {
    org: tenant?.name || 'CodeBegun',
    name: c.name.split(' ')[0],
    stage: c.stage,
    fee: { amountInr: cfg.feeInr, refundablePct: cfg.refundablePct, due: feeDue, paid: c.fee?.status === 'paid', waived: !!c.fee?.waived, payFirst },
    canBook: !payFirst && !booking,
    agreement: c.agreement?.sentAt ? {
      title: c.agreement.title || 'Agreement', text: c.agreement.text || '', signed: !!c.agreement.signedAt,
      signedAt: c.agreement.signedAt, signedName: c.agreement.signedName, fullName: c.name,
    } : null,
    cheque: c.agreement?.signedAt ? {
      status: c.cheque?.status || null, number: c.cheque?.number, bank: c.cheque?.bank, amountInr: c.cheque?.amountInr,
    } : null,
    booking: booking ? {
      id: String(booking._id), startsAt: booking.startsAt, endsAt: booking.endsAt, meetingUrl: booking.meetingUrl,
      interviewer: (booking.interviewerId as any)?.name || '',
      canCancel: booking.startsAt.getTime() - Date.now() > cfg.minNoticeHours * 3_600_000,
    } : null,
  };
}

/** Free times, from every active interviewer's hours minus their bookings. */
async function freeSlots(tenantId: string, cfg: IPlacementProgramConfig): Promise<{ slots: Slot[]; names: Record<string, string> }> {
  const ivs = await PlacementInterviewer.find({ tenantId, active: true }).lean();
  const bookings = await PlacementBooking.find({ tenantId, status: 'booked', endsAt: { $gt: new Date() } }).select('interviewerId startsAt endsAt').lean();
  const slots = generateSlots(
    ivs.map((i: any) => ({ id: String(i._id), name: i.name, active: i.active, meetingUrl: i.meetingUrl, weekly: i.weekly || [], daysOff: i.daysOff || [] })),
    bookings.map((b: any) => ({ interviewerId: String(b.interviewerId), startsAt: b.startsAt, endsAt: b.endsAt })),
    cfg,
  );
  return { slots, names: Object.fromEntries(ivs.map((i: any) => [String(i._id), i.name])) };
}

export async function portalSlots(token: string) {
  const c = await byToken(token);
  const cfg = await getConfig(String(c.tenantId));
  if (mustPayFirst(c, cfg)) throw new PlacementError('Please pay the interview fee first.', 402);
  const { slots } = await freeSlots(String(c.tenantId), cfg);
  return slots.map((s) => ({ startsAt: s.startsAt, endsAt: s.endsAt }));
}

// ── Fee ──────────────────────────────────────────────────────────────────────

export async function portalCreateOrder(token: string) {
  const c = await byToken(token);
  const tenantId = String(c.tenantId);
  const cfg = await getConfig(tenantId);
  if (!cfg.feeInr) throw new PlacementError('There is no fee to pay.');
  if (c.fee?.waived) throw new PlacementError('Your fee has been waived — you can book directly.');
  if (c.fee?.status === 'paid') throw new PlacementError('Your fee is already paid.');
  if (!razorpay.isConfigured(tenantId)) throw new PlacementError('Online payment is not set up yet. Please contact us.', 503);

  // Reuse a still-open order for the same amount, so a retry does not leave a trail of orders.
  if (c.fee?.status === 'created' && c.fee.orderId && c.fee.amountInr === cfg.feeInr) {
    const o = await razorpay.fetchOrder(tenantId, c.fee.orderId).catch(() => null);
    if (o && o.status !== 'paid' && o.amount === cfg.feeInr * 100) {
      // The public key id only — the secret never leaves the server.
      return { orderId: o.id, amount: o.amount, currency: 'INR', keyId: razorpay.getConfig(tenantId)?.keyId, name: c.name, mobile: c.mobile, email: c.email };
    }
  }
  const order = await razorpay.createOrder(tenantId, cfg.feeInr, `pp_${String(c._id).slice(-12)}_${Date.now().toString(36)}`, {
    purpose: 'placement_interview_fee', candidateId: String(c._id),
  }).catch((e: any) => {
    // Razorpay's own error (bad keys, outage) is for the log; the candidate gets something they can act on.
    console.error('[placement] Razorpay order failed:', e?.statusCode, e?.error?.description || e?.message);
    throw new PlacementError('Online payment could not be started just now. Please try again in a few minutes, or contact us.', 502);
  });
  c.fee = { ...(c.fee || {}), status: 'created', orderId: order.id, amountInr: cfg.feeInr, refundablePct: cfg.refundablePct };
  if (c.stage === 'registered') { c.stage = 'payment_pending'; c.stageChangedAt = new Date(); }
  await c.save();
  await event(tenantId, c._id, 'stage', `Payment started (₹${cfg.feeInr})`, { orderId: order.id });
  return { orderId: order.id, amount: order.amount, currency: order.currency, keyId: order.keyId, name: c.name, mobile: c.mobile, email: c.email };
}

/**
 * Mark the fee paid, once. The update only matches a row still waiting on THIS order, so the
 * browser callback and Razorpay's webhook can both arrive and only one of them takes effect.
 */
export async function settleFee(orderId: string, paymentId: string, captured?: { amount: number; currency: string }) {
  const c = await PlacementCandidate.findOne({ 'fee.orderId': orderId });
  if (!c) return { found: false };
  const tenantId = String(c.tenantId);
  if (c.fee?.status === 'paid') return { found: true, alreadyPaid: true };
  const expectPaise = Math.round((c.fee?.amountInr || 0) * 100);
  const cap = captured || await razorpay.fetchPayment(tenantId, paymentId).then((p) => p && (p.status === 'captured' || p.status === 'authorized') ? { amount: p.amount, currency: p.currency } : null).catch(() => null);
  if (!cap || cap.amount !== expectPaise || cap.currency !== 'INR') return { found: true, refused: 'Payment does not match the fee.' };
  const claimed = await PlacementCandidate.findOneAndUpdate(
    { _id: c._id, 'fee.orderId': orderId, 'fee.status': 'created' },
    { $set: { 'fee.status': 'paid', 'fee.paymentId': paymentId, 'fee.paidAt': new Date(), ...(['registered', 'payment_pending'].includes(c.stage) ? { stage: 'paid', stageChangedAt: new Date() } : {}) } },
    { new: true },
  );
  if (!claimed) return { found: true, alreadyPaid: true };
  await event(tenantId, c._id, 'stage', `Interview fee paid (₹${c.fee?.amountInr})`, { paymentId });
  return { found: true, paid: true };
}

export async function portalVerifyPayment(token: string, body: { orderId: string; paymentId: string; signature: string }) {
  const c = await byToken(token);
  const tenantId = String(c.tenantId);
  if (!body?.orderId || body.orderId !== c.fee?.orderId) throw new PlacementError('This payment does not belong to this link.');
  if (!razorpay.verifyPaymentSignature(tenantId, body.orderId, body.paymentId, body.signature)) throw new PlacementError('Payment could not be verified.');
  const r = await settleFee(body.orderId, body.paymentId);
  if ((r as any).refused) throw new PlacementError((r as any).refused);
  return { ok: true };
}

/** Admin: refund the refundable share of a paid fee through Razorpay. */
export async function refundFee(tenantId: string, id: string, actorId: string, reason?: string) {
  const c = await PlacementCandidate.findOne({ _id: id, tenantId });
  if (!c) throw new PlacementError('Not found', 404);
  if (c.fee?.status !== 'paid' || !c.fee.paymentId) throw new PlacementError('Only a paid fee can be refunded.');
  const pct = c.fee.refundablePct ?? 50;
  const amount = Math.floor(((c.fee.amountInr || 0) * pct) / 100);
  if (amount <= 0) throw new PlacementError('Nothing is refundable on this fee.');
  const r = await razorpay.refundPayment(tenantId, c.fee.paymentId, amount).catch((e: any) => {
    console.error('[placement] Razorpay refund failed:', e?.statusCode, e?.error?.description || e?.message);
    throw new PlacementError(`Razorpay refused the refund: ${e?.error?.description || e?.message || 'unknown error'}`, 502);
  });
  c.fee = { ...c.fee, status: 'refunded', refund: { amountInr: amount, refundId: r?.id, at: new Date(), reason: String(reason || '').slice(0, 300), by: actorId } };
  c.markModified('fee');
  await c.save();
  await event(tenantId, c._id, 'stage', `Refunded ₹${amount} (${pct}% of the fee)${reason ? ` — ${String(reason).slice(0, 200)}` : ''}`, { refundId: r?.id }, actorId);
  return c;
}

/** Admin: charge or waive the fee for this candidate. */
export async function setWaived(tenantId: string, id: string, waived: boolean, actorId: string) {
  const c = await PlacementCandidate.findOne({ _id: id, tenantId });
  if (!c) throw new PlacementError('Not found', 404);
  c.fee = { ...(c.fee || {}), waived };
  c.markModified('fee');
  if (waived && ['registered', 'payment_pending'].includes(c.stage)) { c.stage = 'paid'; c.stageChangedAt = new Date(); }
  await c.save();
  await event(tenantId, c._id, 'stage', waived ? 'Interview fee waived' : 'Interview fee will be charged', undefined, actorId);
  return c;
}

// ── Booking ──────────────────────────────────────────────────────────────────

async function notifyBooked(c: IPlacementCandidate, b: IPlacementBooking, interviewer: any, org: string, cancelled = false) {
  const when = istLabel(b.startsAt);
  const summary = `${org} — Placement Program interview`;
  const description = `Interview with ${c.name}${interviewer?.name ? ` (interviewer: ${interviewer.name})` : ''}.\nJoin: ${b.meetingUrl}\nCandidate page: ${c.portalToken ? portalUrl(c.portalToken) : ''}`;
  const ics = buildIcs({
    uid: `placement-${b._id}@codebegun`, startsAt: b.startsAt, endsAt: b.endsAt, summary, description, url: b.meetingUrl, cancelled,
    attendees: [{ name: c.name, email: c.email || '' }, { name: interviewer?.name || '', email: interviewer?.email || '' }],
  });
  const mail = new EmailService(String(c.tenantId));
  const att = [{ filename: cancelled ? 'interview-cancelled.ics' : 'interview.ics', content: Buffer.from(ics) }];
  const html = (who: string) => `<p>Hi ${who},</p><p>${cancelled ? 'This interview has been <b>cancelled</b>' : 'Your interview is confirmed'}:</p>
    <p><b>${when} (IST)</b><br/>${cancelled ? '' : `Join: <a href="${b.meetingUrl}">${b.meetingUrl}</a>`}</p>
    <p>${cancelled ? '' : 'The attached invite adds it to your calendar.'}</p><p>— ${org}</p>`;
  if (c.email) await mail.sendGenericEmail(c.email, `${cancelled ? 'Cancelled' : 'Confirmed'}: interview on ${when}`, html(c.name.split(' ')[0]), undefined, att).catch(() => false);
  if (interviewer?.email) await mail.sendGenericEmail(interviewer.email, `${cancelled ? 'Cancelled' : 'New interview'}: ${c.name} — ${when}`, html(interviewer.name || 'there'), undefined, att).catch(() => false);
  if (!cancelled) {
    const wa = await sendByPurpose(String(c.tenantId), c.mobile, BOOKED_PURPOSE, [c.name.split(' ')[0], when, b.meetingUrl])
      .catch((e: any) => ({ ok: false, error: e?.message }));
    await event(c.tenantId, c._id, 'whatsapp', wa.ok ? 'WhatsApp booking confirmation sent' : `WhatsApp booking confirmation not sent: ${(wa as any).error}`);
  }
}

export async function portalBook(token: string, startsAt: string) {
  const c = await byToken(token);
  const tenantId = String(c.tenantId);
  const cfg = await getConfig(tenantId);
  if (mustPayFirst(c, cfg)) throw new PlacementError('Please pay the interview fee first.', 402);
  if (await activeBooking(c._id)) throw new PlacementError('You already have an interview booked. Cancel it first to pick another time.');
  const { slots, names } = await freeSlots(tenantId, cfg);
  const want = new Date(startsAt).toISOString();
  const slot = slots.find((s) => s.startsAt === want);
  if (!slot) throw new PlacementError('That time is no longer available. Please pick another.', 409);

  const upcoming = await PlacementBooking.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), status: 'booked', startsAt: { $gt: new Date() } } },
    { $group: { _id: '$interviewerId', n: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(upcoming.map((u: any) => [String(u._id), u.n]));
  // Try the least-loaded free interviewer; if a racing booking took them, fall through to the next.
  const order = [...slot.interviewerIds].sort((a, b) => (counts[a] || 0) - (counts[b] || 0) || String(names[a]).localeCompare(String(names[b])));
  for (const ivId of order) {
    const iv = await PlacementInterviewer.findById(ivId).lean() as any;
    if (!iv?.meetingUrl) continue;
    try {
      const startsAtD = new Date(slot.startsAt);
      const b = await PlacementBooking.create({
        tenantId, candidateId: c._id, interviewerId: ivId, startsAt: startsAtD, endsAt: new Date(slot.endsAt), meetingUrl: iv.meetingUrl,
        // A booking made inside a reminder window does not get that reminder: the confirmation just went.
        reminded: { ...(startsAtD.getTime() - Date.now() < 24 * 3_600_000 ? { h24: new Date() } : {}) },
      });
      c.stage = 'interview_booked'; c.stageChangedAt = new Date();
      c.interview = { ...(c.interview || {}), interviewerId: iv._id, startsAt: b.startsAt, endsAt: b.endsAt, meetUrl: iv.meetingUrl };
      c.markModified('interview');
      await c.save();
      await event(tenantId, c._id, 'stage', `Interview booked for ${istLabel(b.startsAt)} with ${iv.name}`, { bookingId: String(b._id) });
      const tenant = await Tenant.findById(tenantId).select('name').lean() as any;
      notifyBooked(c, b, iv, tenant?.name || 'CodeBegun').catch((e) => console.error('[placement] booking notice failed:', e?.message));
      return { ok: true, startsAt: b.startsAt, meetingUrl: b.meetingUrl, interviewer: iv.name };
    } catch (e: any) {
      if (e?.code === 11000) continue; // someone booked this interviewer at this time a moment ago
      throw e;
    }
  }
  throw new PlacementError('That time was just taken. Please pick another.', 409);
}

async function cancelBookingDoc(b: IPlacementBooking, reason: string, actorId?: string) {
  b.status = 'cancelled'; b.cancelledReason = reason.slice(0, 300);
  await b.save();
  const c = await PlacementCandidate.findById(b.candidateId);
  if (c) {
    if (c.stage === 'interview_booked') { c.stage = c.fee?.status === 'paid' || c.fee?.waived ? 'paid' : 'registered'; c.stageChangedAt = new Date(); }
    c.interview = undefined; c.markModified('interview');
    await c.save();
    await event(b.tenantId, c._id, 'stage', `Interview on ${istLabel(b.startsAt)} cancelled${reason ? ` — ${reason.slice(0, 200)}` : ''}`, { bookingId: String(b._id) }, actorId);
    const iv = await PlacementInterviewer.findById(b.interviewerId).lean();
    const tenant = await Tenant.findById(b.tenantId).select('name').lean() as any;
    notifyBooked(c, b, iv, tenant?.name || 'CodeBegun', true).catch(() => undefined);
  }
}

export async function portalCancel(token: string) {
  const c = await byToken(token);
  const cfg = await getConfig(String(c.tenantId));
  const b = await PlacementBooking.findOne({ candidateId: c._id, status: 'booked', endsAt: { $gt: new Date() } });
  if (!b) throw new PlacementError('There is no interview to cancel.');
  if (b.startsAt.getTime() - Date.now() < cfg.minNoticeHours * 3_600_000) {
    throw new PlacementError(`Interviews can be changed up to ${cfg.minNoticeHours} hours before. Please contact us.`);
  }
  await cancelBookingDoc(b, 'Cancelled by the candidate');
  return { ok: true };
}

export async function adminCancelBooking(tenantId: string, bookingId: string, actorId: string, reason?: string) {
  const b = await PlacementBooking.findOne({ _id: bookingId, tenantId, status: 'booked' });
  if (!b) throw new PlacementError('Booking not found', 404);
  await cancelBookingDoc(b, String(reason || 'Cancelled by the team'), actorId);
  return { ok: true };
}

/** Interviewer or admin: did they attend? Moves the candidate's stage with it. */
export const RECOMMENDATIONS = ['strong_yes', 'yes', 'maybe', 'no'] as const;
const REC_LABEL: Record<string, string> = { strong_yes: 'Strong yes', yes: 'Yes', maybe: 'Maybe', no: 'No' };

/**
 * Check a scorecard against the configured criteria: every criterion rated 1–5, a recommendation,
 * optional notes. Pure, so it is tested without a database.
 */
export function cleanScorecard(input: any, criteria: string[]) {
  const ratings = criteria.map((criterion) => {
    const found = (Array.isArray(input?.ratings) ? input.ratings : []).find((r: any) => r?.criterion === criterion);
    return { criterion, score: Number(found?.score) };
  });
  const missing = ratings.filter((r) => !Number.isInteger(r.score) || r.score < 1 || r.score > 5).map((r) => r.criterion);
  if (missing.length) throw new PlacementError(`Rate ${missing.join(', ')} from 1 to 5.`);
  const recommendation = String(input?.recommendation || '');
  if (!(RECOMMENDATIONS as readonly string[]).includes(recommendation)) throw new PlacementError('Choose a recommendation.');
  const average = Math.round((ratings.reduce((a, r) => a + r.score, 0) / ratings.length) * 10) / 10;
  return { ratings, recommendation: recommendation as typeof RECOMMENDATIONS[number], notes: String(input?.notes || '').trim().slice(0, 2000), average };
}

export async function setOutcome(tenantId: string, bookingId: string, outcome: 'attended' | 'no_show', actorId: string, isAdmin = false, scorecardInput?: any) {
  if (!['attended', 'no_show'].includes(outcome)) throw new PlacementError('Unknown outcome');
  const b = await PlacementBooking.findOne({ _id: bookingId, tenantId });
  if (!b || b.status === 'cancelled') throw new PlacementError('Booking not found', 404);
  // Only this booking's interviewer, or a placement admin, may record what happened.
  if (!isAdmin) {
    const iv = await PlacementInterviewer.findById(b.interviewerId).select('userId').lean() as any;
    if (!iv?.userId || String(iv.userId) !== String(actorId)) throw new PlacementError('Only the interviewer or an admin can mark this interview.', 403);
  }
  if (b.startsAt.getTime() > Date.now()) throw new PlacementError('An interview can be marked once it has started.');
  // Attended needs the scorecard: "attended" alone tells the admin nothing about whether to select them.
  const card = outcome === 'attended' ? cleanScorecard(scorecardInput, (await getConfig(tenantId)).scorecardCriteria) : undefined;
  b.status = outcome;
  if (card) b.scorecard = { ...card, by: actorId && mongoose.Types.ObjectId.isValid(actorId) ? new mongoose.Types.ObjectId(actorId) : undefined, at: new Date() };
  await b.save();
  const c = await PlacementCandidate.findById(b.candidateId);
  if (c) {
    c.stage = outcome === 'attended' ? 'interview_attended' : 'interview_no_show'; c.stageChangedAt = new Date();
    c.interview = { ...(c.interview || {}), outcome, ...(card ? { score: card.average, recommendation: card.recommendation, notes: card.notes } : {}) };
    c.markModified('interview');
    await c.save();
    await event(tenantId, c._id, 'stage', outcome === 'attended'
      ? `Attended the interview — scored ${card!.average}/5, recommendation: ${REC_LABEL[card!.recommendation]}`
      : 'Did not attend the interview', { bookingId }, actorId);
  }
  return { ok: true };
}

/** Bookings for the interviews screen: an interviewer sees their own; an admin sees everyone's. */
export async function listBookings(tenantId: string, q: { mine?: string; userId?: string; range?: 'upcoming' | 'past' }) {
  const filter: any = { tenantId, status: { $ne: 'cancelled' } };
  if (q.range === 'past') filter.startsAt = { $lt: new Date() }; else filter.endsAt = { $gt: new Date(Date.now() - 6 * 3_600_000) };
  if (q.mine && q.userId) {
    const ivs = await PlacementInterviewer.find({ tenantId, userId: q.userId }).select('_id').lean();
    filter.interviewerId = { $in: ivs.map((i: any) => i._id) };
  }
  return PlacementBooking.find(filter).sort({ startsAt: q.range === 'past' ? -1 : 1 }).limit(200)
    .populate('candidateId', 'name mobile email college targetRole stage').populate('interviewerId', 'name').lean();
}

/** Every candidate, compact, for the Kanban board (capped — the board is for working, not archiving). */
export async function board(tenantId: string) {
  return PlacementCandidate.find({ tenantId, stage: { $ne: 'withdrawn' } })
    .select('name mobile college targetRole stage stageChangedAt fee.status fee.waived interview.startsAt interview.score interview.recommendation createdAt')
    .sort({ stageChangedAt: -1 }).limit(1000).lean();
}

// ── Interviewers ─────────────────────────────────────────────────────────────

const cleanWeekly = (w: any) => (Array.isArray(w) ? w : [])
  .map((x: any) => ({ day: Number(x?.day), start: String(x?.start || ''), end: String(x?.end || '') }))
  .filter((x) => x.day >= 0 && x.day <= 6 && /^\d{1,2}:\d{2}$/.test(x.start) && /^\d{1,2}:\d{2}$/.test(x.end) && x.end > x.start);
const cleanDays = (d: any) => (Array.isArray(d) ? d : []).map(String).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)).slice(0, 200);

export const listInterviewers = (tenantId: string) => PlacementInterviewer.find({ tenantId }).sort({ active: -1, name: 1 }).lean();

export async function saveInterviewer(tenantId: string, id: string | null, body: any) {
  const name = String(body?.name || '').trim().slice(0, 80);
  if (!name) throw new PlacementError('Interviewer name is required.');
  const meetingUrl = String(body?.meetingUrl || '').trim();
  if (meetingUrl && !/^https:\/\/\S+$/.test(meetingUrl)) throw new PlacementError('Meeting link must start with https://');
  const doc: any = {
    name, email: String(body?.email || '').trim().toLowerCase().slice(0, 120), meetingUrl,
    active: body?.active !== false, weekly: cleanWeekly(body?.weekly), daysOff: cleanDays(body?.daysOff),
    userId: body?.userId && mongoose.Types.ObjectId.isValid(body.userId) ? body.userId : undefined,
  };
  if (!id) return PlacementInterviewer.create({ tenantId, ...doc });
  const r = await PlacementInterviewer.findOneAndUpdate({ _id: id, tenantId }, { $set: doc }, { new: true });
  if (!r) throw new PlacementError('Interviewer not found', 404);
  return r;
}

export async function deleteInterviewer(tenantId: string, id: string) {
  const upcoming = await PlacementBooking.countDocuments({ tenantId, interviewerId: id, status: 'booked', startsAt: { $gt: new Date() } });
  if (upcoming) throw new PlacementError(`This interviewer has ${upcoming} upcoming interview(s). Switch them off instead, or cancel those first.`);
  await PlacementInterviewer.deleteOne({ _id: id, tenantId });
  return { ok: true };
}

/** Ensure a candidate has a portal link (older records from Phase 1 do not). */
export async function ensurePortalToken(tenantId: string, id: string) {
  const c = await PlacementCandidate.findOne({ _id: id, tenantId });
  if (!c) throw new PlacementError('Not found', 404);
  if (!c.portalToken) { c.portalToken = newPortalToken(); await c.save(); }
  return { url: portalUrl(c.portalToken) };
}

// ── Reminders (scheduler) ────────────────────────────────────────────────────

/**
 * Send due interview reminders. Each reminder is CLAIMED in the database before it is sent, so
 * two servers ticking at once (blue and green overlap during a deploy) cannot both send it.
 */
export async function fireDueReminders(now: Date = new Date()) {
  const soon = await PlacementBooking.find({ status: 'booked', startsAt: { $gt: now, $lt: new Date(now.getTime() + 24 * 3_600_000) } }).lean();
  let sent = 0;
  for (const b of soon as any[]) {
    const left = b.startsAt.getTime() - now.getTime();
    const which: 'h24' | 'h1' | null = left <= 60 * 60_000 ? (b.reminded?.h1 ? null : 'h1') : (b.reminded?.h24 ? null : 'h24');
    if (!which) continue;
    const claimed = await PlacementBooking.findOneAndUpdate(
      { _id: b._id, status: 'booked', [`reminded.${which}`]: { $exists: false } },
      { $set: { [`reminded.${which}`]: now, ...(which === 'h1' ? { 'reminded.h24': b.reminded?.h24 || now } : {}) } },
    );
    if (!claimed) continue;
    const c = await PlacementCandidate.findById(b.candidateId).select('tenantId name mobile').lean() as any;
    if (!c) continue;
    const wa = await sendByPurpose(String(c.tenantId), c.mobile, REMINDER_PURPOSE, [c.name.split(' ')[0], istLabel(b.startsAt), b.meetingUrl])
      .catch((e: any) => ({ ok: false, error: e?.message }));
    await event(c.tenantId, c._id, 'whatsapp', wa.ok ? `Reminder sent (${which === 'h1' ? '1 hour' : '24 hours'} before)` : `Reminder not sent: ${(wa as any).error}`);
    if (wa.ok) sent++;
  }

  /*
   * Interviews nobody marked. Half an hour after the end, the interviewer gets one email asking them
   * to record attendance and the scorecard — without it the candidate sits at "Interview booked" and
   * nobody notices. Claimed in the database first, like the reminders above.
   */
  const unmarked = await PlacementBooking.find({
    status: 'booked', 'reminded.outcome': { $exists: false },
    endsAt: { $lt: new Date(now.getTime() - 30 * 60_000), $gt: new Date(now.getTime() - 7 * 86_400_000) },
  }).lean();
  for (const b of unmarked as any[]) {
    const claimed = await PlacementBooking.findOneAndUpdate(
      { _id: b._id, status: 'booked', 'reminded.outcome': { $exists: false } }, { $set: { 'reminded.outcome': now } },
    );
    if (!claimed) continue;
    const [iv, c] = await Promise.all([
      PlacementInterviewer.findById(b.interviewerId).select('name email').lean() as any,
      PlacementCandidate.findById(b.candidateId).select('name').lean() as any,
    ]);
    if (!iv?.email) continue;
    await new EmailService(String(b.tenantId)).sendGenericEmail(iv.email, `Please mark: interview with ${c?.name || 'a candidate'}`,
      `<p>Hi ${iv.name || 'there'},</p><p>Your interview with <b>${c?.name || 'a candidate'}</b> on <b>${istLabel(b.startsAt)} (IST)</b> has not been marked yet.</p>
       <p>Please record whether they attended and fill the scorecard: <a href="${PUBLIC_BASE()}/placement-program/my-interviews">My Placement Interviews</a>.</p>`,
    ).catch(() => false);
  }
  return sent;
}
