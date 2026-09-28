import mongoose from 'mongoose';
import User from '../models/User';
import PlacementDrive from '../models/PlacementDrive';
import CodingProblem from '../models/CodingProblem';
import ProblemSet from '../models/ProblemSet';
import { Company, CompanyQuestion, InterviewExperience } from '../models/CompanyQuestionModels';
import { InterviewExperienceInvite } from '../models/InterviewExperienceInvite';
import { InterviewHubConfig, PrepPackDelivery, DriveAutomation } from '../models/InterviewHubAutomation';
import { HubError, companyView, createInvites } from './interviewHubService';
import { slugify, predictQuestions, getTaxonomy, refreshQuestionCount } from './companyQuestionService';
import { saveSet } from './problemDeliveryService';
import { EmailService } from './emailService';
import { estimateCost, purposeTemplate, sendByPurpose, waCostPerMessage } from './purposeMessaging';

/**
 * Closing the loop around a placement drive — see models/InterviewHubAutomation.ts.
 *
 * A drive's date is its `driveDate`, or the last round date when that is all an admin filled
 * in. Drives without any date get no scheduled pack and no automatic invite; applicants still
 * get the pack on applying when that is switched on.
 */

const DAY = 86400000;
const oid = (v: string) => new mongoose.Types.ObjectId(v);
const esc = (x: string) => String(x || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
const fmt = (d?: Date | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

function driveDateOf(d: any): Date | null {
  if (d.driveDate) return new Date(d.driveDate);
  const dates = (d.rounds || []).map((r: any) => r.date).filter(Boolean).map((x: any) => new Date(x).getTime());
  return dates.length ? new Date(Math.max(...dates)) : null;
}
/** The end of the drive's day in IST — "before the drive" means before this. */
const endOfDriveDay = (d: Date) => new Date(new Date(d).setUTCHours(18, 29, 59, 999));

/* ── Config ─────────────────────────────────────────────────────────────────────────────── */

export async function getConfig(tenantId: string) {
  const c = await InterviewHubConfig.findOneAndUpdate({ tenantId }, { $setOnInsert: { tenantId } }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
  return c as any;
}

export async function saveConfig(tenantId: string, userId: string, b: any, origin?: string) {
  const ch = (v: any) => {
    const out = (Array.isArray(v) ? v : []).filter((x: string) => x === 'email' || x === 'whatsapp');
    return out.length ? out : ['email'];
  };
  const set: any = { updatedBy: userId };
  if (b.prepPack) {
    const p = b.prepPack;
    if (typeof p.enabled === 'boolean') set['prepPack.enabled'] = p.enabled;
    if (typeof p.onApply === 'boolean') set['prepPack.onApply'] = p.onApply;
    if (p.daysBefore !== undefined) set['prepPack.daysBefore'] = Math.max(0, Math.min(30, Math.round(Number(p.daysBefore) || 0)));
    if (p.channels) set['prepPack.channels'] = ch(p.channels);
    if (typeof p.includePredicted === 'boolean') set['prepPack.includePredicted'] = p.includePredicted;
  }
  if (b.autoInvite) {
    const a = b.autoInvite;
    if (typeof a.enabled === 'boolean') set['autoInvite.enabled'] = a.enabled;
    if (a.daysAfter !== undefined) set['autoInvite.daysAfter'] = Math.max(0, Math.min(14, Math.round(Number(a.daysAfter) || 0)));
    if (a.channels) set['autoInvite.channels'] = ch(a.channels);
  }
  if (origin) set.siteUrl = origin;
  await InterviewHubConfig.updateOne({ tenantId }, { $set: set }, { upsert: true });
  return getConfig(tenantId);
}

/* ── The pack itself ────────────────────────────────────────────────────────────────────── */

const predicting = new Set<string>();

/**
 * AI-predicted questions for a company nobody has reported on — generated once, saved to the
 * company question bank flagged aiPredicted, and reused by every later pack.
 */
async function ensurePredicted(tenantId: string, companyName: string, role: string) {
  const slug = slugify(companyName);
  const key = `${tenantId}:${slug}`;
  if (predicting.has(key)) return;
  const have = await CompanyQuestion.countDocuments({ tenantId, companySlug: slug, status: 'published' });
  if (have) return;
  predicting.add(key);
  try {
    let company: any = await Company.findOne({ tenantId, slug });
    if (!company) company = await Company.create({ tenantId, name: companyName, slug, type: 'service' });
    const tax = await getTaxonomy(tenantId);
    const parsed = await predictQuestions({
      tenantId, companyName, companyType: 'IT services / product', role, round: 'technical', roundLabel: 'Technical Interview',
      count: 12, categories: tax.categories.filter((c) => c.enabled),
    });
    if (parsed.length) {
      await CompanyQuestion.insertMany(parsed.map((p: any) => ({
        tenantId, companyId: company._id, companySlug: slug, role, round: p.round || 'technical', category: p.category || '',
        difficulty: p.difficulty || 'medium', questionText: p.questionText, answer: p.answer || '', tags: p.tags || [],
        source: 'ai', aiPredicted: true, status: 'published',
      })));
      await refreshQuestionCount(tenantId, company._id);
    }
  } catch (e: any) {
    console.warn('[interview-hub] predicting questions failed for', companyName, e?.message);
  } finally { predicting.delete(key); }
}

export async function packContent(tenantId: string, driveId: string, viewer: { userId: string; staff: boolean }) {
  if (!mongoose.isValidObjectId(driveId)) throw new HubError('Drive not found', 404);
  const drive: any = await PlacementDrive.findOne({ _id: driveId, tenantId: oid(tenantId) }).lean();
  if (!drive) throw new HubError('Drive not found', 404);
  const applied = (drive.applicants || []).map(String).includes(viewer.userId);
  if (!applied && !viewer.staff) throw new HubError('The prep pack is for students who applied to this drive.', 403);

  const slug = slugify(drive.companyName);
  const cfg = await getConfig(tenantId);
  const [view, bank, recent, auto] = await Promise.all([
    companyView(tenantId, slug),
    CompanyQuestion.find({ tenantId, companySlug: slug, status: 'published' }).sort({ aiPredicted: 1, upvotes: -1, createdAt: -1 }).limit(40).lean(),
    InterviewExperience.find({ companySlug: slug, status: 'published', $or: [{ tenantId }, { shareGlobal: true }] })
      .sort({ interviewedOn: -1 }).limit(8).select('tips eliminationSummary interviewedOn outcome role').lean(),
    DriveAutomation.findOne({ driveId }).lean() as any,
  ]);
  let predicted = bank.filter((q: any) => q.aiPredicted);
  const banked = bank.filter((q: any) => !q.aiPredicted);
  // Nothing reported and nothing banked: predict once (in the background) and say so.
  let preparing = false;
  if (!view.reports && !banked.length && !predicted.length && cfg.prepPack?.includePredicted !== false) {
    preparing = true;
    ensurePredicted(tenantId, drive.companyName, drive.role || '').catch(() => undefined);
  }
  if (cfg.prepPack?.includePredicted === false) predicted = [];

  return {
    drive: {
      id: String(drive._id), companyName: drive.companyName, companySlug: slug, role: drive.role || '',
      driveDate: driveDateOf(drive), location: drive.location || '', driveType: drive.driveType || '',
      rounds: (drive.rounds || []).map((r: any) => ({ name: r.name, date: r.date || null, venue: r.venue || '' })),
      description: drive.description || '',
    },
    reports: view.reports, avgRounds: (view as any).avgRounds ?? null, roundPattern: view.roundPattern, outcomes: view.outcomes,
    mostAsked: view.mostAsked.slice(0, 20),
    voices: recent.filter((e: any) => e.tips || e.eliminationSummary).map((e: any) => ({
      tips: e.tips || '', eliminated: e.eliminationSummary || '', interviewedOn: e.interviewedOn, outcome: e.outcome, role: e.role || '',
    })),
    bankQuestions: banked.slice(0, 20).map((q: any) => ({ text: q.questionText, answer: q.answer || '', round: q.round, category: q.category })),
    predicted: predicted.slice(0, 15).map((q: any) => ({ text: q.questionText, answer: q.answer || '', round: q.round, category: q.category })),
    preparingPredicted: preparing,
    codingSetId: auto?.codingSetId || '',
  };
}

/* ── Delivery ───────────────────────────────────────────────────────────────────────────── */

function packEmail(o: { name: string; drive: any; link: string; pack: any }) {
  const top = (o.pack.mostAsked.length ? o.pack.mostAsked.map((q: any) => ({ t: q.text, n: q.count }))
    : o.pack.bankQuestions.length ? o.pack.bankQuestions.map((q: any) => ({ t: q.text, n: 0 }))
      : o.pack.predicted.map((q: any) => ({ t: q.text, n: -1 }))).slice(0, 6);
  const flow = o.pack.roundPattern.map((r: any) => esc(r.name)).join(' → ');
  const voice = o.pack.voices.find((v: any) => v.tips);
  return `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:600px;margin:auto;color:#0f172a">
  <div style="background:linear-gradient(135deg,#eef0ff,#ecfeff);border-radius:14px;padding:18px 20px;margin-bottom:14px">
    <div style="font-size:12px;font-weight:700;color:#4f46e5;letter-spacing:.04em">YOUR PREP PACK</div>
    <h2 style="margin:4px 0 2px">${esc(o.drive.companyName)}${o.drive.role ? ` — ${esc(o.drive.role)}` : ''}</h2>
    <div style="color:#475569;font-size:14px">${o.drive.driveDate ? `Drive on <b>${fmt(o.drive.driveDate)}</b>. ` : ''}${o.pack.reports ? `Built from <b>${o.pack.reports}</b> candidate report${o.pack.reports === 1 ? '' : 's'}.` : ''}</div>
  </div>
  <p>Hi ${esc(o.name)}, here is what to expect — from students who faced ${esc(o.drive.companyName)} before you.</p>
  ${flow ? `<p><b>The usual rounds:</b> ${flow}</p>` : ''}
  ${top.length ? `<p style="margin-bottom:6px"><b>${top[0].n === -1 ? 'Likely questions (AI-predicted, not reported)' : 'Most-asked questions'}:</b></p>
  <ol style="padding-left:20px;margin-top:0">${top.map((q: any) => `<li style="margin-bottom:6px">${esc(q.t)}${q.n > 1 ? ` <span style="color:#b91c1c;font-weight:700">· asked ${q.n}×</span>` : ''}</li>`).join('')}</ol>` : ''}
  ${voice ? `<p style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:10px;padding:10px 12px;color:#064e3b">💡 <b>From a recent candidate:</b> ${esc(voice.tips.slice(0, 300))}</p>` : ''}
  <p><a href="${o.link}" style="display:inline-block;background:#4f46e5;color:#fff;padding:11px 20px;border-radius:9px;text-decoration:none;font-weight:700">Open the full prep pack</a></p>
  <p style="color:#64748b;font-size:12px">Includes flashcards to practise every question${o.pack.codingSetId ? ' and a coding practice set' : ''}. After your interview, please share what you were asked — it helps the next batch.</p>
</div>`;
}

/** Send the pack to these applicants — each student at most once per drive. */
export async function deliverPack(tenantId: string, drive: any, userIds: string[], reason: 'apply' | 'schedule' | 'manual') {
  if (!userIds.length) return { sent: 0 };
  const cfg = await getConfig(tenantId);
  const channels: string[] = cfg.prepPack?.channels?.length ? cfg.prepPack.channels : ['email'];
  const already = new Set((await PrepPackDelivery.find({ driveId: String(drive._id), userId: { $in: userIds } }).select('userId').lean()).map((d: any) => d.userId));
  const todo = userIds.filter((u) => !already.has(u));
  if (!todo.length) return { sent: 0 };
  const users = await User.find({ _id: { $in: todo.map(oid) } }).select('firstName email phone').lean();
  const pack = await packContent(tenantId, String(drive._id), { userId: '', staff: true });
  const origin = cfg.siteUrl || 'https://platform.codebegun.com';
  const link = `${origin}/drives/${drive._id}/prep?src=email`;
  const waReady = channels.includes('whatsapp') && !!purposeTemplate(tenantId, 'PREP_PACK');
  const mailer = new EmailService(tenantId);
  let sent = 0;
  for (const u of users as any[]) {
    // Claim first, so two ticks never both send.
    try {
      await PrepPackDelivery.create({ tenantId, driveId: String(drive._id), userId: String(u._id), companyName: drive.companyName, companySlug: slugify(drive.companyName), reason, channels });
    } catch { continue; }
    const set: any = {};
    if (channels.includes('email') && u.email) {
      set.emailSent = !!(await mailer.sendGenericEmail(u.email, `Your ${drive.companyName} prep pack — what they asked before`, packEmail({ name: u.firstName || 'there', drive: pack.drive, link, pack })).catch(() => false));
    }
    if (waReady && u.phone) {
      set.whatsappSent = (await sendByPurpose(tenantId, u.phone, 'PREP_PACK', [u.firstName || 'there', drive.companyName, fmt(pack.drive.driveDate) || 'soon', link])).ok;
      await new Promise((ok) => setTimeout(ok, 150));
    }
    await PrepPackDelivery.updateOne({ driveId: String(drive._id), userId: String(u._id) }, { $set: set });
    sent++;
  }
  return { sent };
}

/** Called after a student applies — sends the pack straight away when the institute wants that. */
export async function onApplied(tenantId: string, driveId: string, userId: string) {
  const cfg = await getConfig(tenantId);
  if (!cfg.prepPack?.enabled || !cfg.prepPack?.onApply) return;
  const auto: any = await DriveAutomation.findOne({ driveId }).lean();
  if (auto?.skipPrep) return;
  const drive: any = await PlacementDrive.findOne({ _id: driveId, tenantId: oid(tenantId) }).lean();
  if (!drive) return;
  await deliverPack(tenantId, drive, [userId], 'apply');
  await syncCodingAudience(drive, auto);
}

export async function markOpened(tenantId: string, userId: string, driveId: string) {
  const drive: any = mongoose.isValidObjectId(driveId) ? await PlacementDrive.findOne({ _id: driveId, tenantId: oid(tenantId) }).select('driveDate rounds companyName').lean() : null;
  if (!drive) return { ok: false };
  const when = driveDateOf(drive);
  const before = !when || Date.now() <= endOfDriveDay(when).getTime();
  await PrepPackDelivery.updateOne(
    { driveId, userId, openedAt: null },
    { $set: { openedAt: new Date(), openedBeforeDrive: before } },
  );
  return { ok: true };
}

/** The packs a student has, soonest drive first — for the dashboard and the Drives page. */
export async function myPacks(tenantId: string, userId: string) {
  const rows = await PrepPackDelivery.find({ tenantId, userId }).sort({ createdAt: -1 }).limit(20).lean();
  const drives = await PlacementDrive.find({ _id: { $in: rows.map((r: any) => oid(r.driveId)) } }).select('companyName role driveDate rounds status').lean();
  const byId = new Map(drives.map((d: any) => [String(d._id), d]));
  return rows.map((r: any) => {
    const d: any = byId.get(r.driveId);
    const when = d ? driveDateOf(d) : null;
    return { driveId: r.driveId, companyName: r.companyName, role: d?.role || '', driveDate: when, opened: !!r.openedAt, upcoming: !!when && endOfDriveDay(when).getTime() >= Date.now() };
  }).filter((p) => p.upcoming).sort((a, b) => +new Date(a.driveDate as any) - +new Date(b.driveDate as any));
}

/* ── Coding practice set for a drive ────────────────────────────────────────────────────── */

// Filler in how a question is phrased — never in a problem's name. Words like "two", "sum",
// "array" or "string" stay: they are exactly what problem titles are made of.
const FILLER = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'to', 'and', 'or', 'for', 'with', 'how', 'what', 'is', 'are', 'from', 'that', 'this', 'you', 'your', 'write', 'program', 'code', 'function', 'given', 'find', 'solve', 'problem', 'question', 'explain', 'implement', 'using', 'without', 'return', 'check', 'whether', 'asked', 'me', 'them', 'they', 'can', 'which', 'its', 'it', 'by', 'be', 'do', 'does']);
const words = (t: string) => String(t || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !FILLER.has(w));

/** Coding questions this company asked (reported or banked), each with Problem Bank look-alikes. */
export async function codingSuggestions(tenantId: string, driveId: string) {
  const drive: any = await PlacementDrive.findOne({ _id: driveId, tenantId: oid(tenantId) }).lean();
  if (!drive) throw new HubError('Drive not found', 404);
  const pack = await packContent(tenantId, driveId, { userId: '', staff: true });
  const qs = [
    ...pack.mostAsked.filter((q: any) => /coding|online|dsa/i.test(q.round) || q.category === 'dsa').map((q: any) => q.text),
    ...pack.bankQuestions.filter((q: any) => q.category === 'dsa' || q.round === 'coding').map((q: any) => q.text),
    ...pack.predicted.filter((q: any) => q.category === 'dsa' || q.round === 'coding').map((q: any) => q.text),
  ].slice(0, 20);
  const visible = { status: 'published', $or: [{ scope: 'global' }, { scope: 'tenant', tenantId }] };
  const out: any[] = [];
  for (const text of qs) {
    const qw = Array.from(new Set(words(text))).slice(0, 8);
    if (!qw.length) continue;
    const candidates = await CodingProblem.find({ ...visible, $and: [{ $or: qw.map((w) => ({ title: new RegExp(`\\b${w}`, 'i') })) }] } as any)
      .select('title difficulty number').limit(60).lean();
    // How much of the problem's NAME the question mentions: "Two Sum" in "solve the two sum
    // problem" is 2 of 2; a title sharing one common word with the question is not a match.
    const qset = new Set(qw);
    const scored = candidates.map((c: any) => {
      const tw = words(c.title);
      const hit = tw.filter((w) => qset.has(w)).length;
      return { c, hit, ratio: tw.length ? hit / tw.length : 0 };
    }).filter((x) => x.hit >= 1 && x.ratio >= 0.6).sort((a, b) => b.ratio - a.ratio || b.hit - a.hit).slice(0, 3);
    out.push({ question: text, matches: scored.map(({ c }) => ({ id: String(c._id), title: c.title, difficulty: c.difficulty, number: c.number })) });
  }
  const auto: any = await DriveAutomation.findOne({ driveId }).lean();
  return { companyName: drive.companyName, suggestions: out, codingSetId: auto?.codingSetId || '' };
}

async function syncCodingAudience(drive: any, auto?: any) {
  const a = auto || await DriveAutomation.findOne({ driveId: String(drive._id) }).lean();
  if (!a?.codingSetId) return;
  const set: any = await ProblemSet.findById(a.codingSetId);
  if (!set) return;
  const have = new Set((set.audience || []).filter((x: any) => x.type === 'user').map((x: any) => x.id));
  const missing = (drive.applicants || []).map(String).filter((id: string) => !have.has(id));
  if (!missing.length) return;
  const users = await User.find({ _id: { $in: missing.map(oid) } }).select('firstName lastName email').lean();
  set.audience.push(...users.map((u: any) => ({ type: 'user', id: String(u._id), name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email })));
  await set.save();
}

/** Build (or rebuild) the drive's practice set from the chosen problems, for every applicant. */
export async function createCodingSet(tenantId: string, admin: { userId: string; role: string }, driveId: string, problemIds: string[]) {
  const drive: any = await PlacementDrive.findOne({ _id: driveId, tenantId: oid(tenantId) }).lean();
  if (!drive) throw new HubError('Drive not found', 404);
  const ids = Array.from(new Set((problemIds || []).filter((x) => mongoose.isValidObjectId(x))));
  if (!ids.length) throw new HubError('Pick at least one problem.');
  const auto: any = await DriveAutomation.findOne({ driveId }).lean();
  const applicants = (drive.applicants || []).map(String);
  const set: any = await saveSet({ tenantId, userId: admin.userId, role: admin.role }, auto?.codingSetId || null, {
    title: `${drive.companyName} — interview prep`,
    description: `Coding problems like the ones ${drive.companyName} asked earlier candidates. Practise before your drive${driveDateOf(drive) ? ` on ${fmt(driveDateOf(drive))}` : ''}.`,
    kind: 'practice', items: ids.map((problemId) => ({ problemId })),
    audience: applicants.map((id: string) => ({ type: 'user', id })),
    status: applicants.length ? 'published' : 'draft',
  });
  await DriveAutomation.updateOne({ driveId }, { $set: { tenantId, codingSetId: String(set._id) } }, { upsert: true });
  return { codingSetId: String(set._id), problems: ids.length, students: applicants.length };
}

/* ── The schedule ───────────────────────────────────────────────────────────────────────── */

/** Hourly: scheduled packs before each drive, and the invite to share after it. */
export async function tick() {
  const now = Date.now();
  const drives: any[] = await PlacementDrive.find({ isActive: { $ne: false }, status: { $ne: 'cancelled' } })
    .select('tenantId companyName role driveDate rounds applicants status').lean();
  const cfgs = new Map<string, any>();
  let packs = 0; let invites = 0;
  for (const d of drives) {
    const tenantId = String(d.tenantId);
    const when = driveDateOf(d);
    if (!when) continue;
    const endDay = endOfDriveDay(when).getTime();
    if (now - endDay > 15 * DAY || endDay - now > 31 * DAY) continue;
    if (!cfgs.has(tenantId)) cfgs.set(tenantId, await getConfig(tenantId));
    const cfg = cfgs.get(tenantId);
    const auto: any = await DriveAutomation.findOne({ driveId: String(d._id) }).lean();

    // Before: from N days ahead until the drive day ends, anyone who applied gets the pack.
    const days = Number(cfg.prepPack?.daysBefore) || 0;
    if (cfg.prepPack?.enabled && days > 0 && !auto?.skipPrep && now >= endDay - (days + 1) * DAY && now <= endDay && (d.applicants || []).length) {
      try { packs += (await deliverPack(tenantId, d, d.applicants.map(String), 'schedule')).sent; } catch (e: any) { console.error('[interview-hub] pack', d.companyName, e?.message); }
    }
    if (auto?.codingSetId && now <= endDay) await syncCodingAudience(d, auto).catch(() => undefined);

    // After: the invite to share, once, N days after the drive day.
    const after = Number(cfg.autoInvite?.daysAfter ?? 1);
    if (cfg.autoInvite?.enabled && !auto?.skipInvite && !auto?.inviteSentAt && now >= endDay + after * DAY - DAY && (d.applicants || []).length) {
      let created = 0;
      try {
        const r: any = await createInvites(tenantId, 'system', {
          driveId: String(d._id), companyName: d.companyName, role: d.role, interviewedOn: when.toISOString(),
          channels: cfg.autoInvite.channels?.length ? cfg.autoInvite.channels : ['email'], origin: cfg.siteUrl,
          message: 'Your drive is done — the next batch faces this company soon. Please share what you were asked, round by round.',
        });
        created = r.created || 0;
      } catch (e: any) { if (!(e instanceof HubError)) console.error('[interview-hub] auto invite', d.companyName, e?.message); }
      await DriveAutomation.updateOne({ driveId: String(d._id) }, { $set: { tenantId, inviteSentAt: new Date(), invitesCreated: created } }, { upsert: true });
      invites += created;
    }
  }
  return { packs, invites };
}

/* ── Admin: the board, per-drive switches, and the numbers ──────────────────────────────── */

export async function automationBoard(tenantId: string) {
  const cfg = await getConfig(tenantId);
  const drives: any[] = await PlacementDrive.find({ tenantId: oid(tenantId), isActive: { $ne: false }, status: { $ne: 'cancelled' } })
    .select('companyName role driveDate rounds applicants status').sort({ driveDate: -1, createdAt: -1 }).limit(60).lean();
  const ids = drives.map((d) => String(d._id));
  const [autos, deliveries, invites] = await Promise.all([
    DriveAutomation.find({ driveId: { $in: ids } }).lean(),
    PrepPackDelivery.aggregate([{ $match: { driveId: { $in: ids } } }, { $group: { _id: '$driveId', sent: { $sum: 1 }, opened: { $sum: { $cond: [{ $ifNull: ['$openedAt', false] }, 1, 0] } }, openedBefore: { $sum: { $cond: ['$openedBeforeDrive', 1, 0] } } } }]),
    InterviewExperienceInvite.aggregate([{ $match: { tenantId, driveId: { $in: ids } } }, { $group: { _id: '$driveId', invited: { $sum: 1 }, answered: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } } } }]),
  ]);
  const am = new Map(autos.map((a: any) => [a.driveId, a]));
  const dm = new Map(deliveries.map((x: any) => [x._id, x]));
  const im = new Map(invites.map((x: any) => [x._id, x]));
  const now = Date.now();
  return {
    config: cfg,
    whatsapp: { prepPackTemplate: !!purposeTemplate(tenantId, 'PREP_PACK'), inviteTemplate: !!purposeTemplate(tenantId, 'INTERVIEW_EXPERIENCE_INVITE'), costPerMessageInr: waCostPerMessage(tenantId) },
    drives: drives.map((d) => {
      const when = driveDateOf(d);
      const a: any = am.get(String(d._id)) || {};
      const del: any = dm.get(String(d._id)) || {};
      const inv: any = im.get(String(d._id)) || {};
      const applicants = (d.applicants || []).length;
      const endDay = when ? endOfDriveDay(when).getTime() : null;
      let packStatus = 'no date';
      if (endDay) {
        if (a.skipPrep || !cfg.prepPack?.enabled) packStatus = 'off';
        else if (endDay < now) packStatus = 'done';
        else if (cfg.prepPack.daysBefore > 0 && now < endDay - (cfg.prepPack.daysBefore + 1) * DAY) packStatus = `sends ${fmt(new Date(when!.getTime() - cfg.prepPack.daysBefore * DAY))}`;
        else if (!(cfg.prepPack.daysBefore > 0)) packStatus = cfg.prepPack.onApply ? 'on apply' : 'off';
        else packStatus = 'sending';
      }
      let inviteStatus = 'no date';
      if (endDay) {
        if (a.inviteSentAt) inviteStatus = `sent ${fmt(a.inviteSentAt)}`;
        else if (a.skipInvite || !cfg.autoInvite?.enabled) inviteStatus = 'off';
        else inviteStatus = `sends ${fmt(new Date(endDay + (cfg.autoInvite.daysAfter || 0) * DAY))}`;
      }
      return {
        id: String(d._id), companyName: d.companyName, role: d.role || '', driveDate: when, status: d.status, applicants,
        packsSent: del.sent || 0, packsOpened: del.opened || 0, openedBefore: del.openedBefore || 0,
        invited: inv.invited || 0, answered: inv.answered || 0,
        skipPrep: !!a.skipPrep, skipInvite: !!a.skipInvite, packStatus, inviteStatus, codingSetId: a.codingSetId || '',
        waCostInr: estimateCost(tenantId, applicants),
      };
    }),
  };
}

export async function setDriveFlags(tenantId: string, driveId: string, b: { skipPrep?: boolean; skipInvite?: boolean }) {
  const set: any = { tenantId };
  if (typeof b.skipPrep === 'boolean') set.skipPrep = b.skipPrep;
  if (typeof b.skipInvite === 'boolean') set.skipInvite = b.skipInvite;
  await DriveAutomation.updateOne({ driveId }, { $set: set }, { upsert: true });
  return { ok: true };
}

export async function sendPackNow(tenantId: string, driveId: string) {
  const drive: any = await PlacementDrive.findOne({ _id: driveId, tenantId: oid(tenantId) }).lean();
  if (!drive) throw new HubError('Drive not found', 404);
  if (!(drive.applicants || []).length) throw new HubError('Nobody has applied to this drive yet.');
  return deliverPack(tenantId, drive, drive.applicants.map(String), 'manual');
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** The four numbers that say whether the loop works. */
export async function insights(tenantId: string, days = 90) {
  const since = new Date(Date.now() - days * DAY);
  const [invites, published, deliveries] = await Promise.all([
    InterviewExperienceInvite.find({ tenantId, createdAt: { $gte: since }, status: { $ne: 'cancelled' } }).select('status').lean(),
    InterviewExperience.find({ tenantId, status: 'published', publishedAt: { $gte: since } }).select('interviewedOn publishedAt').lean(),
    PrepPackDelivery.find({ tenantId, createdAt: { $gte: since } }).select('driveId userId openedAt openedBeforeDrive').lean(),
  ]);
  const hours = published.map((e: any) => (new Date(e.publishedAt).getTime() - new Date(e.interviewedOn).getTime()) / 3600000).filter((h) => h >= 0);
  // Selection among applicants who got a pack: opened it before the drive vs did not.
  const driveIds = Array.from(new Set(deliveries.map((d: any) => d.driveId)));
  const drives = await PlacementDrive.find({ _id: { $in: driveIds.map(oid) } }).select('applicantStatuses').lean();
  const statusOf = new Map<string, Map<string, string>>();
  drives.forEach((d: any) => statusOf.set(String(d._id), d.applicantStatuses instanceof Map ? d.applicantStatuses : new Map(Object.entries(d.applicantStatuses || {}))));
  const decided = (d: any) => { const s = statusOf.get(d.driveId)?.get(d.userId); return s && ['selected', 'placed', 'rejected'].includes(s) ? s : null; };
  const group = (opened: boolean) => {
    const rows = deliveries.filter((d: any) => !!d.openedBeforeDrive === opened).map(decided).filter(Boolean) as string[];
    return { decided: rows.length, selected: rows.filter((s) => s !== 'rejected').length };
  };
  return {
    days,
    posting: { invited: invites.length, answered: invites.filter((i: any) => i.status === 'submitted').length },
    speed: { published: published.length, medianHours: median(hours), within48h: hours.filter((h) => h <= 48).length },
    packs: { sent: deliveries.length, opened: deliveries.filter((d: any) => d.openedAt).length, openedBefore: deliveries.filter((d: any) => d.openedBeforeDrive).length },
    selection: { usedPack: group(true), didNot: group(false) },
  };
}
