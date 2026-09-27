import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { Response } from 'express';
import User from '../models/User';
import Batch from '../models/Batch';
import PlacementDrive from '../models/PlacementDrive';
import { Company, CompanyQuestion, InterviewExperience } from '../models/CompanyQuestionModels';
import { InterviewExperienceInvite } from '../models/InterviewExperienceInvite';
import { aiComplete } from './aiGateway';
import { transcribeFile } from './speakingService';
import * as bunny from './bunnyStorageService';
import { slugify, refreshQuestionCount } from './companyQuestionService';
import { awardCoins } from './coinService';
import { EmailService } from './emailService';
import { estimateCost, purposeTemplate, sendByPurpose, waCostPerMessage } from './purposeMessaging';

/**
 * Interview Hub — what candidates were actually asked, captured while it is fresh and
 * shared with everyone who faces the same company next.
 *
 * Built on the CareerPilot InterviewExperience rather than beside it: one record per
 * interview, now carrying the rounds and the questions of each, an optional recording, and
 * who may see it. Published reports are a GLOBAL pool — students of every institute see them,
 * and always without the candidate's name when they come from another institute.
 *
 * Capture is made cheap on purpose. A candidate can type, or record a voice note or a video;
 * a recording is transcribed and the transcript is organised into rounds and questions by the
 * model, which the candidate then corrects. Nothing reaches other students until an admin of
 * the candidate's own institute approves it.
 */

export class HubError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

const ROUND_KEYS = ['online_test', 'aptitude', 'coding', 'technical', 'gd', 'system_design', 'managerial', 'hr', 'other'];
const ROUND_LABEL: Record<string, string> = {
  online_test: 'Online Test', aptitude: 'Aptitude', coding: 'Coding Round', technical: 'Technical Interview',
  gd: 'Group Discussion', system_design: 'System Design', managerial: 'Managerial', hr: 'HR Round', other: 'Other',
};
const CATEGORIES = ['dsa', 'oops', 'dbms', 'os', 'networks', 'java', 'python', 'web', 'projects', 'behavioural', 'quantitative', 'other'];
const OUTCOMES = ['offer', 'rejected', 'waiting', 'withdrew'];
/** Whisper refuses files over 25 MB. */
const WHISPER_MAX_BYTES = 24 * 1024 * 1024;

const str = (v: any, max: number) => String(v ?? '').trim().slice(0, max);
const oid = (v: string) => new mongoose.Types.ObjectId(v);
const isId = (v: any) => mongoose.isValidObjectId(v);

/* ── Cleaning what a candidate, an admin or the model sends ─────────────────────────────── */

export function cleanRounds(raw: any): any[] {
  return (Array.isArray(raw) ? raw : []).slice(0, 12).map((r: any) => {
    const key = ROUND_KEYS.includes(r?.key) ? r.key : 'other';
    return {
      key,
      name: str(r?.name, 60) || ROUND_LABEL[key],
      mode: ['online', 'offline', ''].includes(r?.mode) ? r.mode : '',
      durationMins: Number(r?.durationMins) > 0 && Number(r?.durationMins) < 1000 ? Math.round(Number(r.durationMins)) : undefined,
      questions: (Array.isArray(r?.questions) ? r.questions : []).slice(0, 40)
        .map((q: any) => ({
          text: str(typeof q === 'string' ? q : q?.text, 1500),
          category: CATEGORIES.includes(q?.category) ? q.category : '',
          answerHint: str(q?.answerHint, 1500),
        }))
        .filter((q: any) => q.text.length >= 3),
      cleared: typeof r?.cleared === 'boolean' ? r.cleared : undefined,
      notes: str(r?.notes, 1500),
    };
  });
}

/* ── AI: notes or a transcript → rounds and questions ───────────────────────────────────── */

const parseJson = (s: string) => {
  const t = String(s || '').replace(/^```(?:json)?/i, '').replace(/```\s*$/i, '').trim();
  const a = t.indexOf('{'); const b = t.lastIndexOf('}');
  if (a < 0 || b <= a) throw new HubError('The AI returned something unreadable. Fill the rounds in by hand.');
  return JSON.parse(t.slice(a, b + 1));
};

export async function structureNotes(tenantId: string, userId: string, o: { companyName: string; role?: string; text: string }) {
  const system = [
    'You organise a job candidate\'s account of a real interview into structured data.',
    'Use ONLY what the account says. Never invent a question, a round, a result or a tip that is not in it.',
    'Rewrite each question as a clear standalone question, as it was asked. Keep coding problems complete (input/output if given).',
    'Output ONLY raw JSON, no prose.',
  ].join(' ');
  const user = `Company: ${o.companyName}${o.role ? `\nRole: ${o.role}` : ''}

Candidate's account (typed notes and/or a transcript of what they said):
"""${o.text.slice(0, 14000)}"""

Return JSON exactly in this shape:
{"role":"<role if stated, else empty>",
 "outcome":"offer|rejected|waiting|withdrew|",
 "difficultyFelt":"easy|medium|hard|",
 "rounds":[{"key":"${ROUND_KEYS.join('|')}","name":"<round name as they called it>","mode":"online|offline|","durationMins":<number or null>,
   "questions":[{"text":"<the question>","category":"${CATEGORIES.join('|')}","answerHint":"<what they answered or the expected approach, only if they said it>"}],
   "cleared":<true|false|null>,"notes":"<anything else about this round>"}],
 "eliminationSummary":"<where and why people were eliminated, only if said>",
 "tips":"<their advice for the next candidate, only if said>"}
Rounds in the order they happened.`;
  const text = await aiComplete({ tenantId, studentId: userId, module: 'interview_hub_structure', system, user, maxTokens: 4000 });
  const j = parseJson(text);
  return {
    role: str(j.role, 80),
    outcome: OUTCOMES.includes(j.outcome) ? j.outcome : '',
    difficultyFelt: ['easy', 'medium', 'hard'].includes(j.difficultyFelt) ? j.difficultyFelt : '',
    rounds: cleanRounds(j.rounds),
    eliminationSummary: str(j.eliminationSummary, 2000),
    tips: str(j.tips, 3000),
  };
}

/* ── What a viewer is allowed to see ─────────────────────────────────────────────────────── */

const visibleTo = (tenantId: string) => ({ status: 'published', $or: [{ tenantId }, { shareGlobal: true }] });

function byline(e: any, viewerTenant: string) {
  if (String(e.tenantId) !== viewerTenant) return 'A candidate from another institute';
  if (e.anonymous) return 'Anonymous candidate';
  const s = e.studentId;
  return s && typeof s === 'object' ? `${s.firstName || ''} ${(s.lastName || '').slice(0, 1)}`.trim() || 'A candidate' : 'A candidate';
}

function card(e: any, viewerTenant: string) {
  const rounds = e.rounds || [];
  return {
    id: String(e._id),
    companyName: e.companyName || e.companySlug, companySlug: e.companySlug,
    role: e.role || '', interviewedOn: e.interviewedOn, outcome: e.outcome, difficultyFelt: e.difficultyFelt || '',
    rounds: rounds.length ? rounds.map((r: any) => r.name || ROUND_LABEL[r.key] || r.key) : (e.roundsFaced || []).map((k: string) => ROUND_LABEL[k] || k),
    questionCount: rounds.reduce((n: number, r: any) => n + (r.questions?.length || 0), 0),
    captureMode: e.captureMode || 'text',
    hasRecording: !!(e.media?.key && e.media?.shareRecording),
    tips: str(e.tips || e.review, 220),
    by: byline(e, viewerTenant),
    otherInstitute: String(e.tenantId) !== viewerTenant,
    publishedAt: e.publishedAt || e.updatedAt,
  };
}

function full(e: any, viewerTenant: string, opts: { own?: boolean; staff?: boolean } = {}) {
  const sameTenant = String(e.tenantId) === viewerTenant;
  const canHearRecording = !!e.media?.key && (opts.own || (opts.staff && sameTenant) || !!e.media?.shareRecording);
  return {
    ...card(e, viewerTenant),
    rounds: (e.rounds || []).map((r: any) => ({ ...r, label: ROUND_LABEL[r.key] || r.key })),
    roundsFaced: e.roundsFaced || [],
    durationDays: e.durationDays || null, rating: e.rating || null,
    tips: e.tips || '', review: e.review || '',
    eliminationSummary: e.eliminationSummary || '',
    transcript: e.media?.transcript || '',
    recording: canHearRecording ? { contentType: e.media.contentType || '', durationSec: e.media.durationSec || 0 } : null,
    ...(opts.own || (opts.staff && sameTenant) ? {
      status: e.status, reviewNote: e.reviewNote || '', anonymous: !!e.anonymous, shareGlobal: e.shareGlobal !== false,
      shareRecording: !!e.media?.shareRecording, aiStructured: !!e.aiStructured, inviteId: e.inviteId ? String(e.inviteId) : '',
      promotedQuestionIds: e.promotedQuestionIds || [],
      student: opts.staff && e.studentId && typeof e.studentId === 'object'
        ? { id: String(e.studentId._id), name: `${e.studentId.firstName || ''} ${e.studentId.lastName || ''}`.trim(), email: e.studentId.email || '' }
        : undefined,
    } : {}),
  };
}

/* ── Candidate: draft → edit → submit ───────────────────────────────────────────────────── */

type Upload = { path: string; size: number; mimetype: string; originalname: string };
const cleanup = (...files: (Upload | undefined)[]) => files.forEach((f) => f && fs.promises.unlink(f.path).catch(() => undefined));

/**
 * Start a report: store the recording if there is one, transcribe it, and organise the
 * notes and transcript into rounds. Returned as a DRAFT the candidate edits before submitting.
 */
export async function createDraft(tenantId: string, userId: string, body: any, files: { recording?: Upload; audio?: Upload }) {
  try {
    const companyName = str(body.companyName, 80);
    if (companyName.length < 2) throw new HubError('Which company was it?');
    const when = new Date(body.interviewedOn);
    if (isNaN(when.getTime())) throw new HubError('When was the interview?');
    if (when.getTime() > Date.now() + 86400000) throw new HubError('That date is in the future.');
    const captureMode = ['audio', 'video'].includes(body.captureMode) && files.recording ? body.captureMode : 'text';
    const notes = str(body.notes, 20000);
    // Before any paid step: a recording with nowhere to keep it is refused up front.
    if (files.recording && !bunny.isBunnyStorageConfigured()) throw new HubError('Recording storage is not configured on this server. Type your experience instead.');
    const user: any = await User.findById(userId).select('passport').lean();

    let invite: any = null;
    if (body.inviteId && isId(body.inviteId)) {
      invite = await InterviewExperienceInvite.findOne({ _id: body.inviteId, tenantId, userId }).lean();
    }

    // Transcribe first — from the separate audio track when the browser sent one, since a
    // video file is usually too big for speech-to-text.
    let transcript = '';
    let durationSec = 0;
    const toTranscribe = files.audio || (files.recording && files.recording.size <= WHISPER_MAX_BYTES ? files.recording : undefined);
    if (toTranscribe) {
      try { const t = await transcribeFile(toTranscribe.path, tenantId, 'interview_hub_stt'); transcript = t.text; durationSec = t.durationSec; } catch (e: any) {
        console.warn('[interview-hub] transcription failed:', e?.message);
      }
    }

    const slug = slugify(companyName);
    const base: any = {
      tenantId, studentId: userId, companySlug: slug, companyName,
      role: str(body.role, 80), interviewedOn: when,
      outcome: OUTCOMES.includes(body.outcome) ? body.outcome : 'waiting',
      captureMode, status: 'draft',
      product: user?.passport?.active ? 'careerpilot' : 'lms',
      ...(invite ? { inviteId: invite._id } : {}),
    };

    // Organise with the model when there is something to organise.
    const source = [notes, transcript && `Spoken account:\n${transcript}`].filter(Boolean).join('\n\n');
    let structured: any = null;
    let aiError = '';
    if (source.length >= 40 && (transcript || body.useAi === true || body.useAi === 'true')) {
      try { structured = await structureNotes(tenantId, userId, { companyName, role: base.role, text: source }); } catch (e: any) { aiError = e?.message || 'AI could not organise it'; }
    }

    let exp: any = await InterviewExperience.findOne({ tenantId, studentId: userId, companySlug: slug, interviewedOn: when });
    if (exp && exp.status === 'published') throw new HubError('You already have a published report for this interview.', 409);
    if (!exp) exp = new InterviewExperience(base);
    else Object.assign(exp, { companyName, role: base.role || exp.role, captureMode, status: 'draft' });

    if (structured) {
      exp.rounds = structured.rounds;
      exp.roundsFaced = structured.rounds.map((r: any) => r.key);
      if (structured.role && !exp.role) exp.role = structured.role;
      if (structured.outcome) exp.outcome = structured.outcome;
      if (structured.difficultyFelt) exp.difficultyFelt = structured.difficultyFelt;
      exp.eliminationSummary = structured.eliminationSummary;
      exp.tips = structured.tips;
      exp.aiStructured = true;
    } else if (notes && !exp.rounds?.length) {
      exp.review = notes.slice(0, 2000);
    }

    if (files.recording) {
      if (!bunny.isBunnyStorageConfigured()) throw new HubError('Recording storage is not configured on this server. Type your experience instead.');
      const ext = path.extname(files.recording.originalname) || (captureMode === 'audio' ? '.webm' : '.webm');
      const key = `interview-experiences/${tenantId}/${exp._id}${ext}`;
      await bunny.uploadStream(key, fs.createReadStream(files.recording.path), files.recording.mimetype || 'video/webm', files.recording.size);
      if (exp.media?.key && exp.media.key !== key) bunny.deleteFile(exp.media.key).catch(() => undefined);
      exp.media = { key, contentType: files.recording.mimetype || '', durationSec, transcript, shareRecording: !!exp.media?.shareRecording };
    } else if (transcript) {
      exp.media = { ...(exp.media || {}), transcript };
    }
    await exp.save();
    return { experience: full(exp.toObject(), tenantId, { own: true }), transcribed: !!transcript, aiStructured: !!structured, aiError };
  } finally {
    cleanup(files.recording, files.audio);
  }
}

/** Save the candidate's edits; `submit` sends it for review. */
export async function updateMine(tenantId: string, userId: string, id: string, b: any) {
  const exp: any = await InterviewExperience.findOne({ _id: id, tenantId, studentId: userId });
  if (!exp) throw new HubError('Not found', 404);
  if (exp.status === 'published') throw new HubError('This report is already published. Ask your admin to change it.', 409);

  if (b.companyName !== undefined) { exp.companyName = str(b.companyName, 80); exp.companySlug = slugify(exp.companyName); }
  if (b.role !== undefined) exp.role = str(b.role, 80);
  if (b.interviewedOn) { const d = new Date(b.interviewedOn); if (!isNaN(d.getTime())) exp.interviewedOn = d; }
  if (OUTCOMES.includes(b.outcome)) exp.outcome = b.outcome;
  if (['easy', 'medium', 'hard'].includes(b.difficultyFelt)) exp.difficultyFelt = b.difficultyFelt;
  if (Number(b.rating) >= 1 && Number(b.rating) <= 5) exp.rating = Number(b.rating);
  if (Number(b.durationDays) > 0) exp.durationDays = Math.round(Number(b.durationDays));
  if (b.rounds !== undefined) { exp.rounds = cleanRounds(b.rounds); exp.roundsFaced = exp.rounds.map((r: any) => r.key); }
  if (b.tips !== undefined) exp.tips = str(b.tips, 3000);
  if (b.eliminationSummary !== undefined) exp.eliminationSummary = str(b.eliminationSummary, 2000);
  if (b.review !== undefined) exp.review = str(b.review, 2000);
  if (typeof b.anonymous === 'boolean') exp.anonymous = b.anonymous;
  if (typeof b.shareGlobal === 'boolean') exp.shareGlobal = b.shareGlobal;
  if (typeof b.shareRecording === 'boolean' && exp.media?.key) exp.media.shareRecording = b.shareRecording;

  if (b.submit) {
    const questions = (exp.rounds || []).reduce((n: number, r: any) => n + (r.questions?.length || 0), 0);
    if (!exp.rounds?.length) throw new HubError('Add at least one round.');
    if (!questions && !exp.tips && !exp.eliminationSummary) throw new HubError('Add the questions you were asked, or at least a tip for the next person.');
    exp.status = 'pending';
    exp.reviewNote = '';
    if (exp.inviteId) await InterviewExperienceInvite.updateOne({ _id: exp.inviteId }, { $set: { status: 'submitted', experienceId: String(exp._id) } });
    else {
      // A candidate who posts on their own still closes any invite for that company.
      await InterviewExperienceInvite.updateMany({ tenantId, userId, companySlug: exp.companySlug, status: 'sent' }, { $set: { status: 'submitted', experienceId: String(exp._id) } });
    }
  }
  try { await exp.save(); } catch (e: any) {
    if (e?.code === 11000) throw new HubError('You already have a report for this company on that date.', 409);
    throw e;
  }
  return full(exp.toObject(), tenantId, { own: true });
}

export async function deleteMine(tenantId: string, userId: string, id: string) {
  const exp: any = await InterviewExperience.findOne({ _id: id, tenantId, studentId: userId }).lean();
  if (!exp) throw new HubError('Not found', 404);
  if (exp.status === 'published') throw new HubError('A published report can only be removed by an admin.', 409);
  if (exp.media?.key) bunny.deleteFile(exp.media.key).catch(() => undefined);
  await InterviewExperience.deleteOne({ _id: id });
  return { deleted: true };
}

export async function mine(tenantId: string, userId: string) {
  const [rows, invites] = await Promise.all([
    InterviewExperience.find({ tenantId, studentId: userId }).sort({ updatedAt: -1 }).limit(50).lean(),
    InterviewExperienceInvite.find({ tenantId, userId, status: 'sent' }).sort({ createdAt: -1 }).lean(),
  ]);
  return {
    experiences: rows.map((e: any) => ({ ...card(e, tenantId), status: e.status, reviewNote: e.reviewNote || '' })),
    invites: invites.map((i: any) => ({ id: String(i._id), companyName: i.companyName, role: i.role || '', interviewedOn: i.interviewedOn || null, message: i.message || '', createdAt: i.createdAt })),
  };
}

export async function getMine(tenantId: string, userId: string, id: string) {
  const e: any = await InterviewExperience.findOne({ _id: id, tenantId, studentId: userId }).lean();
  if (!e) throw new HubError('Not found', 404);
  return full(e, tenantId, { own: true });
}

export async function getInvite(tenantId: string, userId: string, id: string) {
  if (!isId(id)) throw new HubError('Invite not found', 404);
  const i: any = await InterviewExperienceInvite.findOne({ _id: id, tenantId, userId }).lean();
  if (!i) throw new HubError('Invite not found', 404);
  return { id: String(i._id), companyName: i.companyName, role: i.role || '', interviewedOn: i.interviewedOn || null, message: i.message || '', status: i.status, experienceId: i.experienceId || '' };
}

/* ── Reading: the global pool ────────────────────────────────────────────────────────────── */

export async function feed(tenantId: string, q: { company?: string; q?: string; outcome?: string; round?: string; page?: string }) {
  const filter: any = visibleTo(tenantId);
  const and: any[] = [];
  if (q.company) and.push({ companySlug: slugify(q.company) });
  if (q.outcome && OUTCOMES.includes(q.outcome)) and.push({ outcome: q.outcome });
  if (q.round && ROUND_KEYS.includes(q.round)) and.push({ $or: [{ 'rounds.key': q.round }, { roundsFaced: q.round }] });
  if (q.q) {
    const rx = new RegExp(String(q.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 60), 'i');
    and.push({ $or: [{ companyName: rx }, { role: rx }, { 'rounds.questions.text': rx }, { tips: rx }] });
  }
  if (and.length) filter.$and = and;
  const page = Math.max(0, Number(q.page) || 0);
  const [rows, total, companies] = await Promise.all([
    InterviewExperience.find(filter).sort({ publishedAt: -1, updatedAt: -1 }).skip(page * 24).limit(24)
      .populate('studentId', 'firstName lastName').lean(),
    InterviewExperience.countDocuments(filter),
    InterviewExperience.aggregate([
      { $match: visibleTo(tenantId) },
      { $group: { _id: '$companySlug', name: { $last: '$companyName' }, count: { $sum: 1 }, last: { $max: '$interviewedOn' }, offers: { $sum: { $cond: [{ $eq: ['$outcome', 'offer'] }, 1, 0] } } } },
      { $sort: { last: -1 } }, { $limit: 40 },
    ]),
  ]);
  return {
    total, page,
    items: rows.map((e: any) => card(e, tenantId)),
    companies: companies.map((c: any) => ({ slug: c._id, name: c.name || c._id, count: c.count, offers: c.offers, lastInterviewedOn: c.last })),
  };
}

export async function detail(tenantId: string, userId: string, id: string, staff: boolean) {
  if (!isId(id)) throw new HubError('Not found', 404);
  const e: any = await InterviewExperience.findById(id).populate('studentId', 'firstName lastName email').lean();
  if (!e) throw new HubError('Not found', 404);
  const own = String(e.studentId?._id || e.studentId) === userId && String(e.tenantId) === tenantId;
  const visible = e.status === 'published' && (String(e.tenantId) === tenantId || e.shareGlobal !== false);
  if (!own && !visible && !(staff && String(e.tenantId) === tenantId)) throw new HubError('Not found', 404);
  return full(e, tenantId, { own, staff });
}

const normQ = (s: string) => String(s || '').toLowerCase()
  .replace(/^(q\d*[:.)]\s*|\d+[.)]\s*)/, '')
  .replace(/^(can you |could you |please |tell me |what is |what are |explain |describe )+/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim();

/** One company across every institute: its reports, round pattern and most-asked questions. */
export async function companyView(tenantId: string, slug: string) {
  const s = slugify(slug);
  const rows: any[] = await InterviewExperience.find({ ...visibleTo(tenantId), companySlug: s })
    .sort({ interviewedOn: -1 }).limit(300).populate('studentId', 'firstName lastName').lean();
  if (!rows.length) return { company: { slug: s, name: slug }, reports: 0, experiences: [], mostAsked: [], roundPattern: [], outcomes: {} };

  const outcomes: Record<string, number> = {};
  const roundCounts = new Map<string, { key: string; name: string; seen: number; order: number }>();
  const qMap = new Map<string, { text: string; round: string; category: string; count: number; lastAsked: Date; experienceIds: string[] }>();
  let roundsTotal = 0; let roundsN = 0;
  for (const e of rows) {
    outcomes[e.outcome] = (outcomes[e.outcome] || 0) + 1;
    const rounds = e.rounds?.length ? e.rounds : (e.roundsFaced || []).map((k: string) => ({ key: k, name: ROUND_LABEL[k] || k, questions: [] }));
    if (rounds.length) { roundsTotal += rounds.length; roundsN++; }
    rounds.forEach((r: any, i: number) => {
      const rc = roundCounts.get(r.key) || { key: r.key, name: ROUND_LABEL[r.key] || r.name || r.key, seen: 0, order: 0 };
      rc.seen++; rc.order += i;
      roundCounts.set(r.key, rc);
      for (const q of r.questions || []) {
        const k = normQ(q.text);
        if (k.length < 4) continue;
        const cur = qMap.get(k);
        if (cur) {
          cur.count++; cur.experienceIds.push(String(e._id));
          if (new Date(e.interviewedOn) > cur.lastAsked) cur.lastAsked = new Date(e.interviewedOn);
        } else {
          qMap.set(k, { text: q.text, round: ROUND_LABEL[r.key] || r.key, category: q.category || '', count: 1, lastAsked: new Date(e.interviewedOn), experienceIds: [String(e._id)] });
        }
      }
    });
  }
  const roundPattern = [...roundCounts.values()]
    .map((r) => ({ key: r.key, name: r.name, seenIn: r.seen, avgPosition: r.order / r.seen }))
    .sort((a, b) => a.avgPosition - b.avgPosition);
  const mostAsked = [...qMap.values()]
    .sort((a, b) => b.count - a.count || +b.lastAsked - +a.lastAsked)
    .slice(0, 60)
    .map((q) => ({ ...q, experienceIds: q.experienceIds.slice(0, 5) }));
  return {
    company: { slug: s, name: rows[0].companyName || s },
    reports: rows.length,
    avgRounds: roundsN ? Math.round((roundsTotal / roundsN) * 10) / 10 : null,
    lastInterviewedOn: rows[0].interviewedOn,
    outcomes, roundPattern, mostAsked,
    experiences: rows.map((e) => card(e, tenantId)),
  };
}

/** Stream a recording to someone allowed to hear it. */
export async function streamMedia(tenantId: string, userId: string, id: string, staff: boolean, res: Response) {
  if (!isId(id)) throw new HubError('Not found', 404);
  const e: any = await InterviewExperience.findById(id).select('tenantId studentId status shareGlobal media').lean();
  if (!e?.media?.key) throw new HubError('No recording', 404);
  const sameTenant = String(e.tenantId) === tenantId;
  const own = sameTenant && String(e.studentId) === userId;
  const published = e.status === 'published' && (sameTenant || e.shareGlobal !== false) && e.media.shareRecording;
  if (!own && !(staff && sameTenant) && !published) throw new HubError('Not found', 404);
  const { stream, size } = await bunny.getFileStream(e.media.key);
  res.setHeader('Content-Type', e.media.contentType || 'video/webm');
  if (size) res.setHeader('Content-Length', String(size));
  res.setHeader('Cache-Control', 'private, max-age=3600');
  stream.on('error', () => { if (!res.headersSent) res.status(502).end(); });
  stream.pipe(res);
}

/* ── Admin: review, publish, promote ─────────────────────────────────────────────────────── */

export async function adminList(tenantId: string, q: { status?: string; q?: string }) {
  const filter: any = { tenantId, status: q.status && ['draft', 'pending', 'published', 'rejected'].includes(q.status) ? q.status : 'pending' };
  if (q.q) {
    const rx = new RegExp(String(q.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 60), 'i');
    filter.$or = [{ companyName: rx }, { role: rx }];
  }
  const [rows, counts] = await Promise.all([
    InterviewExperience.find(filter).sort({ updatedAt: -1 }).limit(200).populate('studentId', 'firstName lastName email').lean(),
    InterviewExperience.aggregate([{ $match: { tenantId } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  return {
    counts: Object.fromEntries(counts.map((c: any) => [c._id, c.n])),
    items: rows.map((e: any) => ({
      ...card(e, tenantId), status: e.status, submittedAt: e.updatedAt,
      student: e.studentId ? `${e.studentId.firstName || ''} ${e.studentId.lastName || ''}`.trim() : '',
      email: e.studentId?.email || '', hasMedia: !!e.media?.key, fromInvite: !!e.inviteId,
    })),
  };
}

export async function moderate(tenantId: string, adminId: string, id: string, b: any) {
  const exp: any = await InterviewExperience.findOne({ _id: id, tenantId });
  if (!exp) throw new HubError('Not found', 404);
  // An admin may correct anything the candidate wrote before publishing it.
  const editable = { ...b }; delete editable.submit; delete editable.status;
  if (Object.keys(editable).length) {
    if (editable.companyName !== undefined) { exp.companyName = str(editable.companyName, 80); exp.companySlug = slugify(exp.companyName); }
    if (editable.role !== undefined) exp.role = str(editable.role, 80);
    if (OUTCOMES.includes(editable.outcome)) exp.outcome = editable.outcome;
    if (editable.rounds !== undefined) { exp.rounds = cleanRounds(editable.rounds); exp.roundsFaced = exp.rounds.map((r: any) => r.key); }
    if (editable.tips !== undefined) exp.tips = str(editable.tips, 3000);
    if (editable.eliminationSummary !== undefined) exp.eliminationSummary = str(editable.eliminationSummary, 2000);
    if (typeof editable.anonymous === 'boolean') exp.anonymous = editable.anonymous;
    if (typeof editable.shareGlobal === 'boolean') exp.shareGlobal = editable.shareGlobal;
    if (typeof editable.shareRecording === 'boolean' && exp.media?.key) exp.media.shareRecording = editable.shareRecording;
  }
  const wasPublished = exp.status === 'published';
  if (['pending', 'published', 'rejected'].includes(b.status)) {
    exp.status = b.status;
    if (b.reviewNote !== undefined) exp.reviewNote = str(b.reviewNote, 400);
    if (b.status === 'published' && !exp.publishedAt) exp.publishedAt = new Date();
  }
  await exp.save();
  if (!wasPublished && exp.status === 'published') {
    await awardCoins({ tenantId, studentId: String(exp.studentId), eventKey: 'experience_approved', idempotencyKey: `experience:${exp._id}`, note: `Interview experience - ${exp.companyName || exp.companySlug}` });
    if (exp.inviteId) await InterviewExperienceInvite.updateOne({ _id: exp.inviteId }, { $set: { status: 'submitted', experienceId: String(exp._id) } });
  }
  const e = await InterviewExperience.findById(exp._id).populate('studentId', 'firstName lastName email').lean();
  return full(e, tenantId, { staff: true });
}

export async function adminDelete(tenantId: string, id: string) {
  const exp: any = await InterviewExperience.findOne({ _id: id, tenantId }).lean();
  if (!exp) throw new HubError('Not found', 404);
  if (exp.media?.key) bunny.deleteFile(exp.media.key).catch(() => undefined);
  await InterviewExperience.deleteOne({ _id: id });
  return { deleted: true };
}

/**
 * Copy chosen questions from a report into the company's question bank, where the mock test
 * and CareerPilot's company page draw from. The company is created in this institute if it
 * does not exist yet. Each question is copied once, however many times this is pressed.
 */
export async function promoteQuestions(tenantId: string, id: string, picks: { round: number; question: number }[]) {
  const exp: any = await InterviewExperience.findOne({ _id: id, tenantId });
  if (!exp) throw new HubError('Not found', 404);
  const name = exp.companyName || exp.companySlug;
  let company: any = await Company.findOne({ tenantId, slug: exp.companySlug });
  if (!company) company = await Company.create({ tenantId, name, slug: exp.companySlug, type: 'service' });
  const done = new Set<string>(exp.promotedQuestionIds || []);
  const docs: any[] = [];
  const year = new Date(exp.interviewedOn).getFullYear();
  for (const p of Array.isArray(picks) ? picks : []) {
    const r = exp.rounds?.[p.round]; const q = r?.questions?.[p.question];
    const tag = `${p.round}:${p.question}`;
    if (!q || done.has(tag)) continue;
    done.add(tag);
    docs.push({
      tenantId, companyId: company._id, companySlug: company.slug, role: exp.role || '',
      round: ROUND_KEYS.includes(r.key) && r.key !== 'other' ? r.key : 'technical',
      category: q.category || '', difficulty: exp.difficultyFelt || 'medium', year,
      questionText: q.text, answer: q.answerHint || '', source: 'student', aiPredicted: false,
      status: 'published', contributedBy: exp.studentId, tags: ['interview-experience'],
    });
  }
  if (docs.length) {
    await CompanyQuestion.insertMany(docs);
    await refreshQuestionCount(tenantId, company._id);
  }
  exp.promotedQuestionIds = [...done];
  if (!exp.companyId) exp.companyId = company._id;
  await exp.save();
  return { added: docs.length, companySlug: company.slug };
}

/* ── Admin: invite people to share ───────────────────────────────────────────────────────── */

export interface InviteBody {
  userIds?: string[]; batchId?: string; driveId?: string;
  companyName?: string; role?: string; interviewedOn?: string; message?: string;
  channels?: string[]; dryRun?: boolean; origin?: string;
}

async function inviteTargets(tenantId: string, b: InviteBody) {
  const or: any[] = [];
  let drive: any = null;
  if (b.driveId && isId(b.driveId)) {
    drive = await PlacementDrive.findOne({ _id: b.driveId, tenantId: oid(tenantId) }).lean();
    if (!drive) throw new HubError('Placement drive not found', 404);
    or.push({ _id: { $in: drive.applicants || [] } });
  }
  if (b.batchId && isId(b.batchId)) or.push({ batchId: oid(b.batchId) });
  const ids = (b.userIds || []).filter(isId);
  if (ids.length) or.push({ _id: { $in: ids.map(oid) } });
  if (!or.length) throw new HubError('Pick students, a batch or a placement drive.');
  const users = await User.find({ tenantId: oid(tenantId), isActive: { $ne: false }, $or: or })
    .select('firstName lastName email phone').limit(2000).lean();
  return { users, drive };
}

const inviteEmail = (o: { name: string; company: string; link: string; message?: string }) => `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:auto;color:#0f172a">
  <h2 style="margin:0 0 8px">Hi ${esc(o.name)}, how did your ${esc(o.company)} interview go?</h2>
  <p>The next batch will face <b>${esc(o.company)}</b> soon. What you were asked — round by round — is the most useful thing they can read.</p>
  ${o.message ? `<p style="background:#f8fafc;border-left:3px solid #4f46e5;padding:10px 12px">${esc(o.message)}</p>` : ''}
  <p>It takes 5 minutes: type it, or just <b>record a voice note</b> and we organise it into rounds and questions for you.</p>
  <p><a href="${o.link}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700">Share my interview experience</a></p>
  <p style="color:#64748b;font-size:12px">You can post without your name. Your admin reviews it before anyone else sees it.</p>
</div>`;
const esc = (x: string) => String(x || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);

export async function createInvites(tenantId: string, adminId: string, b: InviteBody) {
  const channels = (b.channels || []).filter((c) => c === 'email' || c === 'whatsapp');
  if (!channels.length) throw new HubError('Choose Email, WhatsApp or both.');
  const { users, drive } = await inviteTargets(tenantId, b);
  const companyName = str(b.companyName || drive?.companyName, 80);
  if (companyName.length < 2) throw new HubError('Which company was the interview with?');
  const slug = slugify(companyName);
  const already = new Set((await InterviewExperienceInvite.find({ tenantId, companySlug: slug, status: { $in: ['sent', 'submitted'] }, userId: { $in: users.map((u: any) => String(u._id)) } }).select('userId').lean()).map((i: any) => i.userId));
  const posted = new Set((await InterviewExperience.find({ tenantId, companySlug: slug, studentId: { $in: users.map((u: any) => u._id) }, status: { $ne: 'draft' } }).select('studentId').lean()).map((e: any) => String(e.studentId)));
  const fresh = users.filter((u: any) => !already.has(String(u._id)) && !posted.has(String(u._id)));
  const withPhone = fresh.filter((u: any) => u.phone).length;
  const waReady = !!purposeTemplate(tenantId, 'INTERVIEW_EXPERIENCE_INVITE');
  const preview = {
    matched: users.length, recipients: fresh.length, alreadyInvited: already.size, alreadyPosted: posted.size,
    withEmail: fresh.filter((u: any) => u.email).length, withPhone,
    whatsappTemplateReady: waReady, costPerMessageInr: waCostPerMessage(tenantId),
    estimatedCostInr: estimateCost(tenantId, channels.includes('whatsapp') && waReady ? withPhone : 0),
    companyName, sample: fresh.slice(0, 8).map((u: any) => `${u.firstName || ''} ${u.lastName || ''}`.trim()),
  };
  if (b.dryRun) return preview;
  if (!fresh.length) throw new HubError('Everyone matched has already been invited or has already posted.');
  if (channels.includes('whatsapp') && !waReady && !channels.includes('email')) {
    throw new HubError('No WhatsApp template is assigned for "Interview experience — invite". Assign one in WhatsApp Templates, or send by email.');
  }
  const origin = b.origin || 'https://platform.codebegun.com';
  let interviewedOn: Date | undefined = b.interviewedOn ? new Date(b.interviewedOn) : undefined;
  if (interviewedOn && isNaN(interviewedOn.getTime())) interviewedOn = undefined;
  if (!interviewedOn && drive) interviewedOn = drive.driveDate || drive.rounds?.[0]?.date || undefined;

  const invites = await InterviewExperienceInvite.insertMany(fresh.map((u: any) => ({
    tenantId, userId: String(u._id), studentName: `${u.firstName || ''} ${u.lastName || ''}`.trim(),
    companyName, companySlug: slug, role: str(b.role || drive?.role, 80), interviewedOn,
    driveId: drive ? String(drive._id) : undefined, message: str(b.message, 600), origin, channels, createdBy: adminId,
  })));

  (async () => {
    const mailer = new EmailService(tenantId);
    const byUser = new Map(fresh.map((u: any) => [String(u._id), u]));
    for (const inv of invites as any[]) {
      const u: any = byUser.get(inv.userId);
      const link = `${origin}/interview-experiences/share?invite=${inv._id}`;
      const set: any = {};
      if (channels.includes('email') && u?.email) {
        set.emailSent = !!(await mailer.sendGenericEmail(u.email, `How did your ${companyName} interview go?`, inviteEmail({ name: u.firstName || 'there', company: companyName, link, message: inv.message })).catch(() => false));
      }
      if (channels.includes('whatsapp') && waReady && u?.phone) {
        set.whatsappSent = (await sendByPurpose(tenantId, u.phone, 'INTERVIEW_EXPERIENCE_INVITE', [u.firstName || 'there', companyName, link])).ok;
        await new Promise((ok) => setTimeout(ok, 150));
      }
      await InterviewExperienceInvite.updateOne({ _id: inv._id }, { $set: set });
    }
  })().catch((e) => console.error('[interview-hub] invite send failed', e?.message));

  return { ...preview, created: invites.length };
}

const OVERDUE_MS = 3 * 86400000;

export async function listInvites(tenantId: string, q: { status?: string }) {
  const filter: any = { tenantId };
  if (q.status === 'overdue') { filter.status = 'sent'; filter.createdAt = { $lt: new Date(Date.now() - OVERDUE_MS) }; } else if (q.status) filter.status = q.status;
  const rows = await InterviewExperienceInvite.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  const all = await InterviewExperienceInvite.aggregate([{ $match: { tenantId } }, { $group: { _id: '$status', n: { $sum: 1 } } }]);
  const overdue = await InterviewExperienceInvite.countDocuments({ tenantId, status: 'sent', createdAt: { $lt: new Date(Date.now() - OVERDUE_MS) } });
  return {
    counts: { ...Object.fromEntries(all.map((c: any) => [c._id, c.n])), overdue },
    items: rows.map((i: any) => ({
      id: String(i._id), student: i.studentName, userId: i.userId, companyName: i.companyName, role: i.role || '',
      interviewedOn: i.interviewedOn || null, status: i.status, channels: i.channels || [],
      emailSent: !!i.emailSent, whatsappSent: !!i.whatsappSent, remindedAt: i.remindedAt || null,
      overdue: i.status === 'sent' && Date.now() - new Date(i.createdAt).getTime() > OVERDUE_MS,
      experienceId: i.experienceId || '', createdAt: i.createdAt,
    })),
  };
}

export async function remindInvite(tenantId: string, id: string, channels: string[], origin?: string) {
  const inv: any = await InterviewExperienceInvite.findOne({ _id: id, tenantId, status: 'sent' });
  if (!inv) throw new HubError('Invite not found or already answered', 404);
  const u: any = await User.findById(inv.userId).select('firstName email phone').lean();
  const link = `${inv.origin || origin || 'https://platform.codebegun.com'}/interview-experiences/share?invite=${inv._id}`;
  const out: any = {};
  if (channels.includes('email') && u?.email) {
    out.email = !!(await new EmailService(tenantId).sendGenericEmail(u.email, `Reminder: your ${inv.companyName} interview experience`, inviteEmail({ name: u.firstName || 'there', company: inv.companyName, link, message: inv.message })).catch(() => false));
  }
  if (channels.includes('whatsapp') && u?.phone) {
    const r = await sendByPurpose(tenantId, u.phone, 'INTERVIEW_EXPERIENCE_INVITE', [u.firstName || 'there', inv.companyName, link]);
    out.whatsapp = r.ok; if (!r.ok) out.whatsappError = r.error;
  }
  inv.remindedAt = new Date();
  await inv.save();
  return out;
}

export async function cancelInvite(tenantId: string, id: string) {
  await InterviewExperienceInvite.updateOne({ _id: id, tenantId, status: 'sent' }, { $set: { status: 'cancelled' } });
  return { cancelled: true };
}

/**
 * The soft nudge: one free email reminder two days after an invite nobody answered. After
 * that the invite just shows as overdue to the admin — nothing is blocked.
 */
export async function autoRemind() {
  const now = Date.now();
  const due = await InterviewExperienceInvite.find({
    status: 'sent', remindedAt: null,
    createdAt: { $lt: new Date(now - 2 * 86400000), $gt: new Date(now - 14 * 86400000) },
  }).limit(300).lean();
  let sent = 0;
  for (const inv of due as any[]) {
    try { const r = await remindInvite(inv.tenantId, String(inv._id), ['email']); if (r.email) sent++; } catch { /* next */ }
  }
  return sent;
}

/* ── Pickers for the invite form ─────────────────────────────────────────────────────────── */

export async function inviteSources(tenantId: string) {
  const [batches, drives] = await Promise.all([
    Batch.find({ tenantId: oid(tenantId), isActive: { $ne: false } }).select('name').sort({ createdAt: -1 }).limit(100).lean(),
    PlacementDrive.find({ tenantId: oid(tenantId), isActive: { $ne: false } }).select('companyName role driveDate status applicants').sort({ driveDate: -1, createdAt: -1 }).limit(60).lean(),
  ]);
  return {
    batches: batches.map((b: any) => ({ id: String(b._id), name: b.name })),
    drives: drives.map((d: any) => ({ id: String(d._id), companyName: d.companyName, role: d.role || '', driveDate: d.driveDate || null, status: d.status, applicants: (d.applicants || []).length })),
  };
}
