import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AuthenticatedRequest } from '../types';
import User from '../models/User';
import Tenant from '../models/Tenant';
import * as svc from '../services/demoBookingService';
import { normalizePhone, spendWebsiteVerification } from './publicWebsiteController';

/**
 * CRM: Book a demo.
 *   Admin  (/demo-slots, permission manage_demo_slots): slots, attendees, attendance, settings, report.
 *   Public (/public/demo, no login): the booking page and each visitor's personal booking link.
 */

const fail = (res: Response, e: any) => {
  if (e instanceof svc.DemoError) return res.status(e.status).json({ success: false, message: e.message, ...(e.code ? { code: e.code } : {}) });
  console.error('[demo-booking]', e);
  return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
};
const ok = (res: Response, data: any, status = 200) => res.status(status).json({ success: true, data });
const tid = (req: AuthenticatedRequest) => String(req.tenantId);
const uid = (req: AuthenticatedRequest) => String(req.user?.id || '');

/* ── Admin ────────────────────────────────────────────────────────────────────────────────── */

export const listSlots = async (req: AuthenticatedRequest, res: Response) => {
  try { ok(res, await svc.listSlots(tid(req), req.query as any)); } catch (e) { fail(res, e); }
};
export const createSlots = async (req: AuthenticatedRequest, res: Response) => {
  try { const slots = await svc.createSlots(tid(req), req.body || {}, uid(req)); ok(res, { created: slots.length, slots }, 201); } catch (e) { fail(res, e); }
};
export const updateSlot = async (req: AuthenticatedRequest, res: Response) => {
  try { ok(res, await svc.updateSlot(tid(req), req.params.id, req.body || {}, uid(req))); } catch (e) { fail(res, e); }
};
export const cancelSlot = async (req: AuthenticatedRequest, res: Response) => {
  try { ok(res, await svc.cancelSlot(tid(req), req.params.id, String(req.body?.reason || ''), uid(req))); } catch (e) { fail(res, e); }
};
export const deleteSlot = async (req: AuthenticatedRequest, res: Response) => {
  try { await svc.deleteSlot(tid(req), req.params.id); ok(res, { deleted: true }); } catch (e) { fail(res, e); }
};
export const attendees = async (req: AuthenticatedRequest, res: Response) => {
  try { ok(res, await svc.slotAttendees(tid(req), req.params.id)); } catch (e) { fail(res, e); }
};
export const markAttendance = async (req: AuthenticatedRequest, res: Response) => {
  try { ok(res, await svc.markAttendance(tid(req), req.params.bookingId, String(req.body?.status || ''), uid(req))); } catch (e) { fail(res, e); }
};
export const getSettings = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const t: any = await Tenant.findById(tid(req)).select('slug').lean();
    ok(res, { ...(await svc.getConfig(tid(req))), bookingPage: t?.slug ? svc.bookingPageLink(t.slug) : '' });
  } catch (e) { fail(res, e); }
};
export const saveSettings = async (req: AuthenticatedRequest, res: Response) => {
  try { ok(res, await svc.saveConfig(tid(req), req.body || {}, uid(req))); } catch (e) { fail(res, e); }
};
export const report = async (req: AuthenticatedRequest, res: Response) => {
  try { ok(res, await svc.report(tid(req), req.query as any)); } catch (e) { fail(res, e); }
};
/** Staff who can run a demo. */
export const hosts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rows: any[] = await User.find({ tenantId: new mongoose.Types.ObjectId(tid(req)), isActive: { $ne: false }, role: { $nin: ['STUDENT', 'SUPER_ADMIN'] } })
      .select('firstName lastName email role').sort({ firstName: 1 }).limit(500).lean();
    ok(res, rows.map((u) => ({ _id: u._id, name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email, email: u.email, role: u.role })));
  } catch (e) { fail(res, e); }
};

/* ── Public ───────────────────────────────────────────────────────────────────────────────── */

export const publicCatalog = async (req: Request, res: Response) => {
  try { ok(res, await svc.publicCatalog(req.params.tenantSlug)); } catch (e) { fail(res, e); }
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clip = (v: unknown, n: number) => String(v ?? '').trim().slice(0, n);

export const publicBook = async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    // Hidden "website" field: people never fill it, bots do.
    if (clip(b.website, 200)) return res.status(201).json({ success: true, data: { token: '' } });
    const name = clip(b.name, 120);
    const phone = normalizePhone(b.phone);
    const email = clip(b.email, 200).toLowerCase();
    const fields: Record<string, string> = {};
    if (name.length < 2) fields.name = 'Enter your full name';
    if (!phone) fields.phone = 'Enter a valid 10-digit mobile number';
    if (email && !EMAIL_RE.test(email)) fields.email = 'Enter a valid email, or leave it empty';
    if (Object.keys(fields).length) return res.status(400).json({ success: false, message: 'Please correct the highlighted fields.', data: { fields } });

    const tenant = await svc.tenantForBooking(req.params.tenantSlug);
    const utm: Record<string, string> = {};
    for (const k of ['source', 'medium', 'campaign', 'content', 'term']) { const v = clip(b[`utm_${k}`] ?? b.utm?.[k], 100); if (v) utm[k] = v; }
    const result = await svc.book(req.params.tenantSlug, {
      slotId: clip(b.slotId, 40), name, phone, email, verificationToken: clip(b.verificationToken, 128), utm,
      pageUrl: clip(b.pageUrl, 500) || clip(req.headers.referer, 500),
    }, () => spendWebsiteVerification(String(tenant._id), phone, clip(b.verificationToken, 128)));
    ok(res, { token: result.booking.token, already: !!(result as any).already, rescheduled: !!(result as any).rescheduled }, 201);
  } catch (e) { fail(res, e); }
};

export const publicBooking = async (req: Request, res: Response) => {
  try { ok(res, await svc.publicBookingView(req.params.token)); } catch (e) { fail(res, e); }
};
/** Slots this visitor could move to: the same course first, then the rest. */
export const publicBookingSlots = async (req: Request, res: Response) => {
  try {
    const { booking } = await svc.bookingByToken(req.params.token);
    const t: any = await Tenant.findById(booking.tenantId).select('slug').lean();
    const cat = await svc.publicCatalog(t?.slug || '');
    ok(res, { courseKey: booking.courseKey, slots: cat.slots.filter((s: any) => String(s._id) !== String(booking.slotId)) });
  } catch (e) { fail(res, e); }
};
export const publicJoin = async (req: Request, res: Response) => {
  try { ok(res, { url: await svc.joinUrl(req.params.token) }); } catch (e) { fail(res, e); }
};
export const publicCancel = async (req: Request, res: Response) => {
  try { await svc.cancelByVisitor(req.params.token); ok(res, await svc.publicBookingView(req.params.token)); } catch (e) { fail(res, e); }
};
export const publicReschedule = async (req: Request, res: Response) => {
  try { await svc.rescheduleByVisitor(req.params.token, clip(req.body?.slotId, 40)); ok(res, await svc.publicBookingView(req.params.token)); } catch (e) { fail(res, e); }
};
/** A calendar file for the booking. */
export const publicIcs = async (req: Request, res: Response) => {
  try {
    const { booking, slot } = await svc.bookingByToken(req.params.token);
    const { buildIcs } = await import('../data/placementSlotPolicy');
    const ics = buildIcs({
      uid: `demo-${booking._id}@codebegun`, startsAt: new Date(slot.startsAt),
      endsAt: new Date(new Date(slot.startsAt).getTime() + slot.durationMin * 60_000), summary: slot.title,
      description: `Join, reschedule or cancel: ${svc.bookingLink(booking.token)}`, url: svc.bookingLink(booking.token),
    });
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="demo.ics"');
    res.send(ics);
  } catch (e) { fail(res, e); }
};
