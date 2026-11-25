import mongoose from 'mongoose';
import Hackathon from '../models/Hackathon';
import HackathonRegistration from '../models/HackathonRegistration';
import TechBattle from '../models/TechBattle';
import BattleRegistration from '../models/BattleRegistration';
import EventCollection from '../models/EventCollection';
import EventSubmission from '../models/EventSubmission';
import PlacementCandidate, { PLACEMENT_STAGES } from '../models/PlacementCandidate';
import User from '../models/User';

/**
 * WHO a WhatsApp template can be broadcast to — every module that holds people.
 *
 * The send dialog lists these sources on its own, so a new module that collects people gets onto the
 * "Send to many" list by adding ONE entry to AUDIENCE_SOURCES below:
 *   key        stable id (stored nowhere but the request)
 *   label      what the admin sees next to the radio button
 *   filters()  the choices to narrow it down, each option with how many people it holds
 *   resolve()  the people (name + phone) for the picked options. An empty pick means "all".
 *
 * Paste numbers, Students of a batch and CRM leads are handled by the template service itself.
 */

export interface AudienceOption { value: string; label: string; count?: number }
export interface AudienceFilter {
  key: string;
  label: string;
  options: AudienceOption[];
  /** Exactly one option is picked (the first is the default), instead of any number. */
  single?: boolean;
}
export type AudiencePick = Record<string, string[]>;
export interface AudienceRecipient { phone: string; name: string }
export interface AudienceSource {
  key: string;
  label: string;
  description: string;
  filters(tenantId: string): Promise<AudienceFilter[]>;
  resolve(tenantId: string, pick: AudiencePick): Promise<AudienceRecipient[]>;
}

const oid = (id: string) => new mongoose.Types.ObjectId(id);
const oids = (ids?: string[]) => (ids || []).filter((x) => mongoose.isValidObjectId(x)).map(oid);
const pretty = (s: string) => s.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
const countMap = (rows: { _id: any; n: number }[]) => new Map(rows.map((r) => [String(r._id), r.n]));
const picked = (pick: AudiencePick, key: string) => (pick[key] || []).filter(Boolean);

const hackathons: AudienceSource = {
  key: 'hackathons',
  label: 'Hackathon teams',
  description: 'People registered in a hackathon team',
  async filters(tenantId) {
    const [events, byEvent, byStatus] = await Promise.all([
      Hackathon.find({ tenantId }).select('title').sort({ createdAt: -1 }).limit(60).lean(),
      HackathonRegistration.aggregate([{ $match: { tenantId } }, { $group: { _id: '$hackathonId', n: { $sum: { $size: '$members' } } } }]),
      HackathonRegistration.aggregate([{ $match: { tenantId } }, { $group: { _id: '$status', n: { $sum: { $size: '$members' } } } }]),
    ]);
    const ev = countMap(byEvent), st = countMap(byStatus);
    return [
      { key: 'hackathonIds', label: 'Hackathon', options: events.map((e: any) => ({ value: String(e._id), label: e.title, count: ev.get(String(e._id)) || 0 })) },
      { key: 'statuses', label: 'Registration', options: [
        { value: 'confirmed', label: 'Confirmed' }, { value: 'pending_payment', label: 'Payment pending' },
        { value: 'cancelled', label: 'Cancelled' }, { value: 'refund_due', label: 'Refund due' },
      ].map((o) => ({ ...o, count: st.get(o.value) || 0 })) },
      { key: 'who', label: 'Send to', single: true, options: [{ value: 'all', label: 'Every team member' }, { value: 'lead', label: 'Team leads only' }] },
    ];
  },
  async resolve(tenantId, pick) {
    const q: any = { tenantId };
    const ids = oids(picked(pick, 'hackathonIds'));
    if (ids.length) q.hackathonId = { $in: ids };
    if (picked(pick, 'statuses').length) q.status = { $in: picked(pick, 'statuses') };
    const leadsOnly = picked(pick, 'who')[0] === 'lead';
    const regs = await HackathonRegistration.find(q).select('members').lean();
    return regs.flatMap((r: any) => (r.members || [])
      .filter((m: any) => !leadsOnly || m.isLead)
      .map((m: any) => ({ phone: String(m.mobile || ''), name: m.name || '' })));
  },
};

const battles: AudienceSource = {
  key: 'battles',
  label: 'Tech Battle participants',
  description: 'People registered for a Tech Battle',
  async filters(tenantId) {
    const [events, byEvent, byStatus] = await Promise.all([
      TechBattle.find({ tenantId }).select('title').sort({ createdAt: -1 }).limit(60).lean(),
      BattleRegistration.aggregate([{ $match: { tenantId } }, { $group: { _id: '$battleId', n: { $sum: 1 } } }]),
      BattleRegistration.aggregate([{ $match: { tenantId } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);
    const ev = countMap(byEvent), st = countMap(byStatus);
    return [
      { key: 'battleIds', label: 'Tech Battle', options: events.map((e: any) => ({ value: String(e._id), label: e.title, count: ev.get(String(e._id)) || 0 })) },
      { key: 'statuses', label: 'Status', options: [
        { value: 'registered', label: 'Registered, not started' }, { value: 'started', label: 'Started' },
        { value: 'submitted', label: 'Submitted' }, { value: 'no_show', label: 'No-show' },
      ].map((o) => ({ ...o, count: st.get(o.value) || 0 })) },
    ];
  },
  async resolve(tenantId, pick) {
    const q: any = { tenantId };
    const ids = oids(picked(pick, 'battleIds'));
    if (ids.length) q.battleId = { $in: ids };
    if (picked(pick, 'statuses').length) q.status = { $in: picked(pick, 'statuses') };
    const regs = await BattleRegistration.find(q).select('name mobile whatsapp').lean();
    // They may have given a separate WhatsApp number at registration — that is the one to message.
    return regs.map((r: any) => ({ phone: String(r.whatsapp || r.mobile || ''), name: r.name || '' }));
  },
};

const events: AudienceSource = {
  key: 'events',
  label: 'Event registrations',
  description: 'People who registered through a website Event API',
  async filters(tenantId) {
    const [cols, byCol, byEvent] = await Promise.all([
      EventCollection.find({ tenantId }).select('name').sort({ name: 1 }).lean(),
      EventSubmission.aggregate([{ $match: { tenantId } }, { $group: { _id: '$collectionId', n: { $sum: 1 } } }]),
      EventSubmission.aggregate([{ $match: { tenantId } }, { $group: { _id: '$eventApiId', name: { $last: '$eventName' }, n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 60 }]),
    ]);
    const c = countMap(byCol);
    return [
      { key: 'collectionIds', label: 'Collection', options: cols.map((x: any) => ({ value: String(x._id), label: x.name, count: c.get(String(x._id)) || 0 })) },
      { key: 'eventApiIds', label: 'Event', options: byEvent.map((x: any) => ({ value: String(x._id), label: x.name || 'Event', count: x.n })) },
    ];
  },
  async resolve(tenantId, pick) {
    const q: any = { tenantId, 'contact.phone': { $nin: [null, ''] } };
    const cols = oids(picked(pick, 'collectionIds'));
    const apis = oids(picked(pick, 'eventApiIds'));
    if (cols.length) q.collectionId = { $in: cols };
    if (apis.length) q.eventApiId = { $in: apis };
    const subs = await EventSubmission.find(q).select('contact').sort({ createdAt: -1 }).limit(20000).lean();
    return subs.map((s: any) => ({ phone: String(s.contact?.phone || ''), name: s.contact?.name || '' }));
  },
};

const placement: AudienceSource = {
  key: 'placement',
  label: 'Placement Program applicants',
  description: 'People who applied to the Placement Program',
  async filters(tenantId) {
    const byStage = await PlacementCandidate.aggregate([{ $match: { tenantId: oid(tenantId) } }, { $group: { _id: '$stage', n: { $sum: 1 } } }]);
    const s = countMap(byStage);
    return [{ key: 'stages', label: 'Stage', options: PLACEMENT_STAGES.map((v) => ({ value: v, label: pretty(v), count: s.get(v) || 0 })) }];
  },
  async resolve(tenantId, pick) {
    const q: any = { tenantId: oid(tenantId) };
    if (picked(pick, 'stages').length) q.stage = { $in: picked(pick, 'stages') };
    const rows = await PlacementCandidate.find(q).select('name mobile').lean();
    return rows.map((r: any) => ({ phone: String(r.mobile || ''), name: r.name || '' }));
  },
};

// "Ever a member" is read from activatedAt — passport.active defaults to false on EVERY user, admins included.
const memberBase = (tenantId: string) => ({ tenantId: oid(tenantId), 'passport.activatedAt': { $ne: null }, phone: { $nin: [null, ''] } });
const activeNow = () => ({ 'passport.active': true, $or: [{ 'passport.expiresAt': null }, { 'passport.expiresAt': { $gt: new Date() } }] });

const careerPilot: AudienceSource = {
  key: 'careerpilot',
  label: 'CareerPilot members',
  description: 'CareerPilot by CodeBegun members',
  async filters(tenantId) {
    const base = memberBase(tenantId);
    const [all, active, byStage] = await Promise.all([
      User.countDocuments(base),
      User.countDocuments({ ...base, ...activeNow() }),
      User.aggregate([{ $match: base }, { $group: { _id: '$passport.stage', n: { $sum: 1 } } }]),
    ]);
    const s = countMap(byStage);
    return [
      { key: 'membership', label: 'Membership', options: [{ value: 'active', label: 'Active', count: active }, { value: 'lapsed', label: 'Expired or stopped', count: all - active }] },
      { key: 'stages', label: 'Career stage', options: ['foundation', 'build', 'placement', 'job_seeker'].map((v) => ({ value: v, label: pretty(v), count: s.get(v) || 0 })) },
    ];
  },
  async resolve(tenantId, pick) {
    const q: any = { ...memberBase(tenantId) };
    const m = picked(pick, 'membership');
    if (m.length === 1 && m[0] === 'active') Object.assign(q, activeNow());
    if (m.length === 1 && m[0] === 'lapsed') q.$nor = [activeNow()];
    if (picked(pick, 'stages').length) q['passport.stage'] = { $in: picked(pick, 'stages') };
    const users = await User.find(q).select('name phone').lean();
    return users.map((u: any) => ({ phone: String(u.phone || ''), name: u.name || '' }));
  },
};

/* ── Inactive LMS students (Student Rules) ── */
const INACTIVE_BANDS = [
  { value: '2', label: '2+ days' }, { value: '3', label: '3+ days' }, { value: '7', label: '7+ days' }, { value: '14', label: '14+ days' },
];
const inactiveStudentsSource: AudienceSource = {
  key: 'inactive_students',
  label: 'Inactive LMS students',
  description: 'Students in a running batch who have not opened the LMS for a while',
  async filters(tenantId) {
    const { inactiveStudents } = await import('./studentRulesService');
    const list = await inactiveStudents(tenantId, 2);
    return [
      { key: 'days', label: 'Not opened the LMS for', single: true, options: INACTIVE_BANDS.map((b) => ({ ...b, count: list.filter((s) => s.daysInactive >= Number(b.value)).length })) },
      { key: 'who', label: 'Send to', single: true, options: [{ value: 'student', label: 'The students' }, { value: 'parent', label: 'Their parents' }] },
    ];
  },
  async resolve(tenantId, pick) {
    const { inactiveStudents } = await import('./studentRulesService');
    const days = Number(picked(pick, 'days')[0] || 2);
    const toParent = picked(pick, 'who')[0] === 'parent';
    const list = await inactiveStudents(tenantId, Number.isFinite(days) ? days : 2);
    return list
      .map((s) => (toParent ? { phone: s.parentMobile, name: s.parentName || 'Parent' } : { phone: s.phone, name: s.name }))
      .filter((r) => r.phone);
  },
};

/** The order here is the order on screen. Add a new module's people here. */
export const AUDIENCE_SOURCES: AudienceSource[] = [hackathons, battles, events, placement, careerPilot, inactiveStudentsSource];

export const getAudienceSource = (key: string) => AUDIENCE_SOURCES.find((s) => s.key === key);

/** "Hackathon teams: Code Sprint 2026 · Confirmed" — for the Sent history row. */
export async function describePick(tenantId: string, source: AudienceSource, pick: AudiencePick) {
  const filters = await source.filters(tenantId);
  const parts = filters.flatMap((f) => {
    const chosen = picked(pick, f.key);
    if (!chosen.length || (f.single && chosen[0] === f.options[0]?.value)) return [];
    return [f.options.filter((o) => chosen.includes(o.value)).map((o) => o.label).join(', ')];
  }).filter(Boolean);
  return `${source.label}${parts.length ? `: ${parts.join(' · ')}` : ' (all)'}`;
}
