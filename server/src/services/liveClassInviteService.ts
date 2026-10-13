import mongoose from 'mongoose';
import crypto from 'crypto';
import LiveClass, { ILiveClass } from '../models/LiveClass';
import LiveClassInvite, { ILiveClassInvite } from '../models/LiveClassInvite';
import User from '../models/User';
import { EmailService } from './emailService';
import { sendByPurpose, purposeTemplate } from './purposeMessaging';
import { buildIcs, istLabel } from '../data/placementSlotPolicy';
import { createNotifications } from '../notifications/notificationService';
import { runWithTenant } from './requestContext';

/**
 * Who a live class is for, and getting the invitation to them.
 *
 * Three ways in, all of which end as one LiveClassInvite row per person:
 *   - an LMS user picked by name                         (kind 'user')
 *   - a pasted email or mobile, LMS account or not       (kind 'contact')
 *   - a student of a batch the class is for              (kind 'batch', added when invites are sent)
 *
 * Each row carries a personal join link (/live/<token>) that works without logging in, which is
 * how a guest with no account gets in. Logged-in students of the class's batches can also join
 * from Live Classes as before.
 */

export class InviteError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export const MAX_INVITES_PER_REQUEST = 1000;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /(?:\+?91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}\b/g;

export const PUBLIC_BASE = () => (process.env.CLIENT_URL || process.env.PUBLIC_APP_URL || process.env.FRONTEND_URL || 'https://platform.codebegun.com').replace(/\/+$/, '');
export const joinLink = (token: string) => `${PUBLIC_BASE()}/live/${token}`;
const newToken = () => crypto.randomBytes(24).toString('base64url');
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export function normalizePhone(raw: unknown): string | null {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? `+91${d}` : null;
}

export interface ParsedContact { email?: string; phone?: string; name?: string }

/**
 * Read what an admin pasted: one person per line, or several emails on one line.
 *
 * "ravi@x.com", "98765 43210", "Ravi Kumar <ravi@x.com>", "Ravi Kumar, ravi@x.com, 9876543210"
 * all work. A line with one email and one mobile is one person; whatever text is left becomes the
 * name. Anything with neither an email nor a mobile is returned as not understood.
 */
export function parseContacts(text: string): { contacts: ParsedContact[]; invalid: string[] } {
  const contacts: ParsedContact[] = [];
  const invalid: string[] = [];
  for (const raw of String(text || '').split(/\r?\n|;/)) {
    const line = raw.trim();
    if (!line) continue;
    const emails = line.match(EMAIL) || [];
    const phones = (line.match(PHONE) || []).map(normalizePhone).filter(Boolean) as string[];
    if (!emails.length && !phones.length) { invalid.push(line.slice(0, 80)); continue; }
    if (emails.length > 1 || phones.length > 1 && !emails.length) {
      for (const e of emails) contacts.push({ email: e.toLowerCase() });
      if (!emails.length) for (const p of phones) contacts.push({ phone: p });
      continue;
    }
    const name = line.replace(EMAIL, ' ').replace(PHONE, ' ').replace(/[<>,"]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);
    contacts.push({ ...(emails[0] ? { email: emails[0].toLowerCase() } : {}), ...(phones[0] ? { phone: phones[0] } : {}), ...(name ? { name } : {}) });
  }
  return { contacts, invalid };
}

/* ── Access ─────────────────────────────────────────────────────────────────────────────── */

export const batchesOf = (lc: Pick<ILiveClass, 'batchId' | 'batchIds'>): string[] =>
  [...new Set([...(lc.batchIds || []).map(String), ...(lc.batchId ? [String(lc.batchId)] : [])])];

/**
 * Open to everyone in the institute. A class saved before audiences existed has openToInstitute
 * unset: with a batch it was that batch's, without one anyone in the institute could join — so
 * that is what it stays.
 */
export const isOpenToInstitute = (lc: Pick<ILiveClass, 'openToInstitute' | 'batchId' | 'batchIds'>) =>
  lc.openToInstitute === true || (lc.openToInstitute === undefined && !batchesOf(lc).length);

/** May this logged-in user see and join this class (hosts are decided separately)? */
export async function userMayJoin(lc: ILiveClass, userId: string): Promise<boolean> {
  if (isOpenToInstitute(lc)) return true;
  const me: any = await User.findOne({ _id: userId, tenantId: lc.tenantId }).select('batchId email').lean();
  if (!me) return false;
  if (me.batchId && batchesOf(lc).includes(String(me.batchId))) return true;
  return !!(await LiveClassInvite.exists({
    liveClassId: lc._id,
    $or: [{ userId: me._id }, ...(me.email ? [{ email: String(me.email).toLowerCase() }] : [])],
  }));
}

/** The classes a logged-in non-host may see: open ones, their batch's, and ones they were invited to. */
export async function visibleClassFilter(tenantId: string, userId: string) {
  const me: any = await User.findOne({ _id: userId, tenantId }).select('batchId email').lean();
  const invited = me ? await LiveClassInvite.find({
    tenantId, $or: [{ userId: me._id }, ...(me.email ? [{ email: String(me.email).toLowerCase() }] : [])],
  }).distinct('liveClassId') : [];
  const or: any[] = [
    { openToInstitute: true },
    { openToInstitute: { $exists: false }, batchId: { $in: [null] }, 'batchIds.0': { $exists: false } },
    { _id: { $in: invited } },
  ];
  if (me?.batchId) or.push({ batchId: me.batchId }, { batchIds: me.batchId });
  return { $or: or };
}

/* ── Adding people ──────────────────────────────────────────────────────────────────────── */

async function upsertInvite(lc: ILiveClass, row: Partial<ILiveClassInvite> & { contactKey: string; kind: ILiveClassInvite['kind'] }, invitedBy?: string) {
  const r = await LiveClassInvite.updateOne(
    { liveClassId: lc._id, contactKey: row.contactKey },
    {
      $setOnInsert: {
        tenantId: lc.tenantId, liveClassId: lc._id, kind: row.kind, contactKey: row.contactKey, token: newToken(),
        ...(invitedBy && mongoose.Types.ObjectId.isValid(invitedBy) ? { invitedBy } : {}),
      },
      // Fill what was missing; never overwrite a name or number someone already has.
      $set: Object.fromEntries(Object.entries({ userId: row.userId, batchId: row.batchId }).filter(([, v]) => v)),
    },
    { upsert: true },
  );
  if (r.upsertedCount) {
    await LiveClassInvite.updateOne({ liveClassId: lc._id, contactKey: row.contactKey }, {
      $set: Object.fromEntries(Object.entries({ name: row.name, email: row.email, phone: row.phone }).filter(([, v]) => v)),
    });
  }
  return !!r.upsertedCount;
}

const keyOf = (c: { email?: string; phone?: string; userId?: any }) =>
  c.email ? c.email.toLowerCase() : c.phone ? c.phone : `user:${c.userId}`;

const userContact = (u: any) => ({
  userId: u._id,
  name: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || undefined,
  email: u.email ? String(u.email).toLowerCase() : undefined,
  phone: normalizePhone(u.phone) || undefined,
});

export async function addInvites(lc: ILiveClass, input: { userIds?: unknown; contacts?: unknown; batchIds?: unknown }, invitedBy?: string) {
  const userIds = (Array.isArray(input.userIds) ? input.userIds : []).map(String).filter((x) => mongoose.Types.ObjectId.isValid(x));
  const { contacts, invalid } = parseContacts(typeof input.contacts === 'string' ? input.contacts : '');
  const batchIds = (Array.isArray(input.batchIds) ? input.batchIds : []).map(String).filter((x) => mongoose.Types.ObjectId.isValid(x));
  if (userIds.length + contacts.length > MAX_INVITES_PER_REQUEST) throw new InviteError(`Add at most ${MAX_INVITES_PER_REQUEST} people at a time.`);

  let added = 0;
  let already = 0;
  const users: any[] = userIds.length
    ? await User.find({ _id: { $in: userIds }, tenantId: lc.tenantId }).select('firstName lastName email phone').lean()
    : [];
  for (const u of users) {
    const c = userContact(u);
    (await upsertInvite(lc, { ...c, kind: 'user', contactKey: keyOf(c) }, invitedBy)) ? added++ : already++;
  }

  // A pasted email that belongs to an LMS user is linked to them, so they also see the class in Live Classes.
  const emails = contacts.map((c) => c.email).filter(Boolean) as string[];
  const known = emails.length
    ? new Map(((await User.find({ tenantId: lc.tenantId, email: { $in: emails } }).select('email').lean()) as any[]).map((u) => [String(u.email).toLowerCase(), u._id]))
    : new Map();
  for (const c of contacts) {
    const userId = c.email ? known.get(c.email) : undefined;
    (await upsertInvite(lc, { ...c, ...(userId ? { userId } : {}), kind: 'contact', contactKey: keyOf(c) }, invitedBy)) ? added++ : already++;
  }

  let batchesAdded = 0;
  if (batchIds.length) {
    const have = new Set(batchesOf(lc));
    const fresh = batchIds.filter((b) => !have.has(b));
    if (fresh.length) {
      await LiveClass.updateOne({ _id: lc._id }, { $addToSet: { batchIds: { $each: fresh.map((b) => new mongoose.Types.ObjectId(b)) } } });
      batchesAdded = fresh.length;
    }
  }
  return { added, already, invalid, batchesAdded };
}

/** Give every student of the class's batches their own invite row (and link). Run before sending. */
export async function expandBatches(lc: ILiveClass): Promise<number> {
  const batches = batchesOf(lc);
  if (!batches.length) return 0;
  const students: any[] = await User.find({ tenantId: lc.tenantId, batchId: { $in: batches }, role: 'STUDENT', isActive: { $ne: false } })
    .select('firstName lastName email phone batchId').lean();
  let added = 0;
  for (const s of students) {
    const c = userContact(s);
    if (await upsertInvite(lc, { ...c, batchId: s.batchId, kind: 'batch', contactKey: keyOf(c) })) added++;
  }
  return added;
}

export async function listInvites(lc: ILiveClass) {
  const rows = await LiveClassInvite.find({ liveClassId: lc._id }).sort({ createdAt: 1 }).lean();
  return {
    batchIds: batchesOf(lc),
    openToInstitute: isOpenToInstitute(lc),
    invites: rows.map((r) => ({
      _id: r._id, kind: r.kind, name: r.name || '', email: r.email || '', phone: r.phone || '', hasAccount: !!r.userId,
      link: joinLink(r.token), emailSentAt: r.emailSentAt, whatsappSentAt: r.whatsappSentAt, lastSendError: r.lastSendError || '',
      firstJoinedAt: r.firstJoinedAt, totalSeconds: r.totalSeconds || 0,
    })),
  };
}

export async function removeInvite(lc: ILiveClass, inviteId: string) {
  if (!mongoose.Types.ObjectId.isValid(inviteId)) throw new InviteError('Invite not found', 404);
  const r = await LiveClassInvite.deleteOne({ _id: inviteId, liveClassId: lc._id });
  if (!r.deletedCount) throw new InviteError('Invite not found', 404);
  return { removed: true };
}

export async function removeBatch(lc: ILiveClass, batchId: string) {
  if (!mongoose.Types.ObjectId.isValid(batchId)) throw new InviteError('Batch not found', 404);
  await LiveClass.updateOne({ _id: lc._id }, { $pull: { batchIds: new mongoose.Types.ObjectId(batchId) }, ...(String(lc.batchId) === batchId ? { $unset: { batchId: 1 } } : {}) });
  // Rows added only because of that batch go too; a person also picked by hand keeps theirs.
  await LiveClassInvite.deleteMany({ liveClassId: lc._id, kind: 'batch', batchId });
  return { removed: true };
}

/* ── Sending ────────────────────────────────────────────────────────────────────────────── */

function emailHtml(lc: ILiveClass, inv: ILiveClassInvite, kind: 'invite' | 'reminder') {
  const when = istLabel(new Date(lc.scheduledAt));
  const link = joinLink(inv.token);
  const hi = inv.name ? `Hi ${esc(inv.name.split(' ')[0])},` : 'Hi,';
  const lead = kind === 'invite'
    ? `You are invited to a live class${lc.instructorName ? ` with <b>${esc(lc.instructorName)}</b>` : ''}.`
    : 'Your live class starts in about 15 minutes.';
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
    <p>${hi}</p>
    <p>${lead}</p>
    <h2 style="margin:14px 0 4px;color:#1a5490">${esc(lc.title)}</h2>
    <p style="margin:0 0 4px"><b>${esc(when)} IST</b> · ${lc.durationMin} minutes</p>
    ${lc.description ? `<p style="color:#4b5563">${esc(lc.description)}</p>` : ''}
    <p style="margin:22px 0"><a href="${link}" style="display:inline-block;background:#1a5490;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold">Join the class</a></p>
    <p style="font-size:13px;color:#6b7280">This link is yours; please do not forward it. It opens the class in your browser (Chrome works best, on a laptop or a phone); no app or login is needed. If the button does not work, paste this into your browser:<br><a href="${link}" style="color:#1a5490;word-break:break-all">${link}</a></p>
    ${kind === 'invite' ? '<p style="font-size:13px;color:#6b7280">The attached calendar invite adds the class to your calendar.</p>' : ''}
  </div>`;
}

export interface SendResult { recipients: number; email: number; whatsapp: number; whatsappSkipped?: string }

/**
 * Send invitations (or the starts-soon reminder) by email and WhatsApp.
 *
 * Runs in the background and records each send on the invite row, so the host's list shows who
 * was reached; the caller gets the counts it is about to attempt. `onlyUnsent` skips anyone
 * already sent this kind by that channel, so pressing Send twice does not message people twice.
 */
export async function sendInvites(
  lc: ILiveClass,
  opts: { inviteIds?: string[]; channels: { email: boolean; whatsapp: boolean }; kind?: 'invite' | 'reminder'; onlyUnsent?: boolean },
): Promise<SendResult> {
  const kind = opts.kind || 'invite';
  if (kind === 'invite') await expandBatches(lc);
  const filter: any = { liveClassId: lc._id };
  if (opts.inviteIds?.length) filter._id = { $in: opts.inviteIds.filter((x) => mongoose.Types.ObjectId.isValid(x)) };
  const rows = await LiveClassInvite.find(filter);
  const emailKey = kind === 'invite' ? 'emailSentAt' : 'reminderSentAt';

  const viaEmail = opts.channels.email ? rows.filter((r) => r.email && !(opts.onlyUnsent && (r as any)[emailKey])) : [];
  const viaWa = opts.channels.whatsapp ? rows.filter((r) => r.phone && !(opts.onlyUnsent && kind === 'invite' && r.whatsappSentAt)) : [];
  const tenantId = String(lc.tenantId);

  const ics = kind === 'invite' ? (inv: ILiveClassInvite) => Buffer.from(buildIcs({
    uid: `liveclass-${lc._id}-${inv._id}@codebegun`,
    startsAt: new Date(lc.scheduledAt),
    endsAt: new Date(new Date(lc.scheduledAt).getTime() + (lc.durationMin || 60) * 60_000),
    summary: lc.title,
    description: `${lc.description ? `${lc.description}\n\n` : ''}Join: ${joinLink(inv.token)}`,
    url: joinLink(inv.token),
  })) : null;

  const work = async () => {
    const mail = new EmailService();
    const when = istLabel(new Date(lc.scheduledAt));
    for (const inv of viaEmail) {
      try {
        const ok = await mail.sendGenericEmail(
          inv.email!,
          kind === 'invite' ? `Invitation: ${lc.title} — ${when} IST` : `Starting soon: ${lc.title}`,
          emailHtml(lc, inv, kind), undefined,
          ics ? [{ filename: 'live-class.ics', content: ics(inv) }] : undefined,
        );
        await LiveClassInvite.updateOne({ _id: inv._id }, ok ? { $set: { [emailKey]: new Date() } } : { $set: { lastSendError: 'Email not sent' } });
      } catch (e: any) {
        await LiveClassInvite.updateOne({ _id: inv._id }, { $set: { lastSendError: `Email: ${String(e?.message || e).slice(0, 200)}` } });
      }
    }
    const purpose = kind === 'invite' ? 'LIVE_CLASS_INVITE' : 'LIVE_CLASS_REMINDER';
    for (const inv of viaWa) {
      const r: any = await sendByPurpose(tenantId, inv.phone!, purpose,
        [(inv.name || 'there').split(' ')[0], lc.title, `${when} IST`, joinLink(inv.token)]).catch((e: any) => ({ ok: false, error: e?.message }));
      await LiveClassInvite.updateOne({ _id: inv._id }, r.ok
        ? { $set: { ...(kind === 'invite' ? { whatsappSentAt: new Date() } : {}) } }
        : { $set: { lastSendError: `WhatsApp: ${String(r.error || 'not sent').slice(0, 200)}` } });
    }
    // In-app for anyone with an LMS account.
    const userIds = rows.filter((r) => r.userId).map((r) => String(r.userId));
    if (userIds.length) {
      await createNotifications(tenantId, userIds, 'general',
        kind === 'invite' ? '🎥 You are invited to a live class' : '🎥 Live class starts soon',
        `"${lc.title}" on ${when} IST.`, '/hms-classes').catch(() => {});
    }
  };
  // Detached from the request, so keep the institute context for branding and per-tenant settings.
  setImmediate(() => { runWithTenant(tenantId, work).catch((e: any) => console.error('[live-invites] send failed', e?.message)); });

  const waReady = !!purposeTemplate(tenantId, kind === 'invite' ? 'LIVE_CLASS_INVITE' : 'LIVE_CLASS_REMINDER');
  return {
    recipients: rows.length,
    email: viaEmail.length,
    whatsapp: viaWa.length,
    ...(opts.channels.whatsapp && !waReady ? { whatsappSkipped: 'No WhatsApp template is assigned for live-class messages yet (Admin → WhatsApp Templates → Where used), so WhatsApp messages will not go out.' } : {}),
  };
}

/* ── Guests: the personal join link ─────────────────────────────────────────────────────── */

export async function inviteByToken(token: string) {
  const t = String(token || '').trim();
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(t)) return null;
  const inv = await LiveClassInvite.findOne({ token: t });
  if (!inv) return null;
  const lc = await LiveClass.findOne({ _id: inv.liveClassId, tenantId: inv.tenantId });
  if (!lc || lc.status === 'cancelled') return null;
  return { inv, lc };
}

export const publicClassInfo = (lc: ILiveClass, inv: ILiveClassInvite) => ({
  title: lc.title,
  description: lc.description || '',
  scheduledAt: lc.scheduledAt,
  durationMin: lc.durationMin,
  instructorName: lc.instructorName || '',
  status: lc.status,
  inviteeName: inv.name || '',
});

/** The 100ms user id a guest joins under, so attendance can find their invite row again. */
export const guestPeerId = (inviteId: unknown) => `invite_${inviteId}`;

export async function recordGuestJoin(peerUserId: string) {
  const id = String(peerUserId || '').replace(/^invite_/, '');
  if (!mongoose.Types.ObjectId.isValid(id)) return;
  const now = new Date();
  await LiveClassInvite.updateOne({ _id: id }, [{ $set: { firstJoinedAt: { $ifNull: ['$firstJoinedAt', now] }, lastSeenAt: now } }]);
}

export async function recordGuestLeave(peerUserId: string, durationSeconds?: number) {
  const id = String(peerUserId || '').replace(/^invite_/, '');
  if (!mongoose.Types.ObjectId.isValid(id)) return;
  await LiveClassInvite.updateOne({ _id: id }, { $set: { lastSeenAt: new Date() }, $inc: { totalSeconds: Math.max(0, Math.round(durationSeconds || 0)) } });
}
