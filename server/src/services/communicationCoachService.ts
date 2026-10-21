/**
 * communicationCoachService — the Communication Coach: measure, diagnose, prescribe, prove.
 *
 * A student does a short baseline once (four real questions), then a short daily session that
 * is chosen from where they are weakest and how hesitant they sound. Every recording is stored
 * as an ordinary CommunicationAttempt (kind 'coach'), so the streak, Practice Pass, the lab gate
 * and the weekly report all count it with no further wiring.
 *
 * Nothing here is stored as "the student's level": it is always worked out from their recent
 * attempts, so it can never go stale and an instructor's override of a score flows through.
 */
import mongoose from 'mongoose';
import CommunicationAttempt from '../models/CommunicationAttempt';
import CommunicationChallenge from '../models/CommunicationChallenge';
import User from '../models/User';
import { getAnthropic, getOpenAI, isAnthropicEnabled } from './aiClients';
import { recordUsage } from './aiGateway';
import * as settings from './settingsService';
import { generateTemplate } from './communicationEvalService';
import { HesitationSignals } from './communicationSignalsService';

export type Area = 'intro' | 'project' | 'technical' | 'hr';
export const AREAS: Area[] = ['intro', 'project', 'technical', 'hr'];
export const AREA_LABEL: Record<Area, string> = { intro: 'Introduction', project: 'Project explanation', technical: 'Technical explanation', hr: 'HR questions' };
export const AREA_TYPE: Record<Area, string> = { intro: 'self_introduction', project: 'project_explanation', technical: 'technical_explanation', hr: 'hr_questions' };

export const LEVEL_NAME = ['', 'Read it aloud', 'Answer with a guide', 'Answer on your own', 'Interview pressure'];
export const MAX_COACH_ATTEMPTS_PER_DAY = 12;

const HR_QUESTIONS = [
  'Tell me about your strengths.', 'What is your biggest weakness, and what are you doing about it?', 'Why should we hire you?',
  'Where do you see yourself in five years?', 'Why do you want to work in IT?', 'Tell me about a challenge you faced and how you handled it.',
  'Why did you choose this career path?', 'How do you handle pressure or tight deadlines?', 'Are you willing to relocate or work in shifts?',
];
const HR_FRAMES = [
  'Start with one clear sentence that answers the question. Then give one real example. End with what you learned.',
  'Say it in three parts: the situation, what you did, and what happened because of it.',
];
const FOLLOW_UPS: Record<Area, string[]> = {
  intro: ['Why should we hire you?', 'What is your biggest strength?'],
  project: ['What was the hardest bug you fixed, and how?', 'What would you do differently if you built it again?'],
  technical: ['How is it different from a similar technology?', 'Where would you NOT use it?'],
  hr: ['Can you give an example from your own life?', 'What did you learn from that?'],
};

export interface CoachPrompt {
  area: Area; level: number; title: string; ask: string;
  script: string | null;          // level 1: the words to read aloud
  guide: string[];                // levels 1–2: the order to say things in
  followUp: string | null;        // level 4: a question to answer straight after
  targetSec: number; minSec: number; maxSec: number;
}

const pick = <T,>(a: T[], seed: number): T => a[Math.abs(seed) % a.length];

/** The question and the help for one area at one level. Deterministic: same day, same step, same prompt. */
export function buildPrompt(area: Area, level: number, profile: any, seed = 0): CoachPrompt {
  const lv = Math.max(1, Math.min(4, Math.round(level)));
  const base = { area, level: lv, script: null as string | null, guide: [] as string[], followUp: lv === 4 ? pick(FOLLOW_UPS[area], seed) : null, targetSec: [0, 60, 60, 75, 90][lv], minSec: 20, maxSec: 180 };
  const skill = profile?.primarySkills?.length ? pick<string>(profile.primarySkills, seed) : 'your main programming language';
  const q = pick(HR_QUESTIONS, seed);
  if (area === 'intro') {
    return { ...base, title: 'Introduce yourself', ask: 'Introduce yourself the way you would to an interviewer.',
      script: lv === 1 ? generateTemplate(profile) : null,
      guide: lv <= 2 ? ['Greet and say your name', 'Your education and college', 'Your skills', 'Your project, in one line', 'Your goal', 'Thank them'] : [] };
  }
  if (area === 'project') {
    const pr = profile?.projectName ? `your project "${profile.projectName}"` : 'your main project';
    return { ...base, title: 'Explain your project', ask: `Explain ${pr} as if the interviewer has never seen it.`,
      script: lv === 1 ? `My main project is ${profile?.projectName || '[project name]'}. The problem it solves is ${profile?.projectObjective || '[what problem it solves]'}. I built it using ${(profile?.projectTechnologies || []).join(', ') || '[technologies]'}. My role was ${profile?.projectResponsibilities || '[what you built]'}. The result is [what works now]. The hardest part was [one challenge], and I solved it by [how].` : null,
      guide: lv <= 2 ? ['The problem it solves', 'The technologies you used', 'Your own role', 'One hard problem and how you solved it', 'The result'] : [] };
  }
  if (area === 'technical') {
    return { ...base, title: `Explain ${skill}`, ask: `Explain ${skill} in simple words, with one example, as if to a friend who is new to it.`,
      guide: lv <= 2 ? ['What it is, in one sentence', 'Why people use it', 'One simple example', 'One mistake beginners make'] : [] };
  }
  return { ...base, title: 'HR question', ask: q, guide: lv <= 2 ? [pick(HR_FRAMES, seed)] : [],
    script: lv === 1 ? `Here is one way to start: "Thank you for asking. In short, ..." — then give one real example from your own life.` : null };
}

// ── What the numbers say, in words a student can act on ───────────────────────

export function signalTips(s: HesitationSignals | null | undefined): string[] {
  if (!s) return [];
  const tips: string[] = [];
  if (!s.hasTiming) return ['We could not measure your pauses this time — speak a little closer to the microphone.'];
  if (s.timeToFirstWordSec >= 4) tips.push(`You took ${s.timeToFirstWordSec}s to start. Say the first line aloud the moment you press record: "Good morning, my name is …".`);
  if (s.longPauseCount >= 1) tips.push(`You went silent for 3 seconds or more ${s.longPauseCount} time${s.longPauseCount > 1 ? 's' : ''} (longest ${s.longestPauseSec}s). When you lose your thought, say "let me think for a moment" and carry on: it sounds calm, silence sounds lost.`);
  else if (s.pausesPerMinute >= 6) tips.push(`You paused ${s.pauseCount} times. Keep a steady flow: connect your points with "and", "because", "so".`);
  if (s.paceVariation >= 0.45) tips.push('Your speed jumped between fast and slow. Breathe at the end of each sentence and keep one even pace.');
  if (s.fillerPer100Words >= 6) tips.push(`About ${Math.round(s.fillerPer100Words)} filler words in every 100. Replace "um", "like", "actually" with a short silent breath.`);
  if (s.restarts >= 2) tips.push(`You restarted ${s.restarts} times. Finish the sentence you started, even if it is not perfect: interviewers forgive a rough sentence faster than a restart.`);
  if (s.stoppedEarly) tips.push('You stopped well before the time asked. Use the guide on screen: one more example almost always fits.');
  if (!tips.length) tips.push(s.label === 'calm' ? 'Steady and calm. This is what interviewers want to hear. Now work on the content.' : 'Good flow. Keep practising the same way tomorrow.');
  return tips.slice(0, 4);
}

// ── The student's picture, from their own attempts ────────────────────────────

const istDate = (d = new Date()) => new Date(d.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
export const coachToday = () => istDate();
const avg = (a: number[]) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);

export function levelFrom(recent: { overall: number; hes: number }[]): number {
  if (!recent.length) return 1;
  const o = avg(recent.map((r) => r.overall)); const h = avg(recent.map((r) => r.hes));
  if (h >= 60 || o < 35) return 1;
  if (h >= 45 || o < 50) return 2;
  if (h >= 30 || o < 65) return 3;
  return 4;
}

interface Row { _id: any; practiceDate: string; createdAt: Date; overall: number; hes: number; skills: any; area: Area | null; baseline: boolean; step: number | null }

const toRow = (a: any): Row => ({
  _id: a._id, practiceDate: a.practiceDate, createdAt: a.createdAt,
  overall: a.overriddenScore ?? a.evaluation?.overallScore ?? 0,
  hes: a.coach?.signals?.hesitationIndex ?? 0, skills: a.coach?.skills || null,
  area: a.coach?.area || null, baseline: !!a.coach?.isBaseline, step: typeof a.coach?.step === 'number' ? a.coach.step : null,
});

const SKILLS = ['fluency', 'confidence', 'clarity', 'structure', 'content', 'language'] as const;
export const SKILL_LABEL: Record<string, string> = { fluency: 'Fluency', confidence: 'Confidence (steadiness)', clarity: 'Clarity', structure: 'Structure', content: 'Content', language: 'Language' };

const skillAvg = (rows: Row[]) => {
  const out: Record<string, number> = {};
  for (const k of SKILLS) { const v = rows.map((r) => r.skills?.[k]).filter((x) => typeof x === 'number'); out[k] = v.length ? avg(v) : 0; }
  return out;
};

export function readinessOf(rows: Row[], baselineAreas: number, threshold: number) {
  const last5 = rows.slice(-5);
  const o = avg(last5.map((r) => r.overall)); const h = avg(last5.map((r) => r.hes));
  const since = istDate(new Date(Date.now() - 14 * 86400_000));
  const days = new Set(rows.filter((r) => r.practiceDate >= since).map((r) => r.practiceDate)).size;
  const consistency = Math.min(100, Math.round((days / 10) * 100));
  const score = last5.length ? Math.round(0.5 * o + 0.3 * (100 - h) + 0.2 * consistency) : 0;
  const reasons: string[] = [];
  if (baselineAreas < AREAS.length) reasons.push('Finish the baseline (all four questions).');
  if (rows.length < 5) reasons.push(`Complete ${5 - rows.length} more practice recording${5 - rows.length === 1 ? '' : 's'}.`);
  if (last5.length && h >= 45) reasons.push('Hesitation is still high: long pauses and restarts.');
  if (last5.length && o < 50) reasons.push('Answers are still thin or unclear.');
  if (days < 5) reasons.push('Practise on more days (aim for 10 of the last 14).');
  if (score < threshold && !reasons.length) reasons.push(`Readiness ${score} is below ${threshold}.`);
  const ready = baselineAreas >= AREAS.length && rows.length >= 5 && days >= 5 && score >= threshold && h < 45;
  return { score, ready, threshold, reasons: ready ? [] : reasons, avgOverall: o, avgHesitation: h, practiceDays14: days };
}

export const readyThreshold = (tenantId: string) => {
  const n = parseInt(settings.getStr('COMMUNICATION_READY_THRESHOLD', '60', tenantId), 10);
  return Number.isFinite(n) ? Math.max(30, Math.min(95, n)) : 60;
};

/** Everything the student's Coach page needs. */
export async function getCoachState(tenantId: string, studentId: string) {
  const [attempts, profile] = await Promise.all([
    CommunicationAttempt.find({ tenantId, studentId, kind: 'coach', status: 'completed' }).sort({ createdAt: 1 }).limit(300)
      .select('practiceDate createdAt evaluation.overallScore overriddenScore coach').lean(),
    mongoose.model('CommunicationProfile').findOne({ tenantId, studentId }).lean(),
  ]);
  const rows = (attempts as any[]).map(toRow);
  const baselineDone = new Set(rows.filter((r) => r.baseline && r.area).map((r) => r.area as Area));
  const inBaseline = baselineDone.size < AREAS.length;
  const today = coachToday();
  const todayRows = rows.filter((r) => r.practiceDate === today);
  const recent = rows.slice(-4).map((r) => ({ overall: r.overall, hes: r.hes }));
  const level = levelFrom(recent);

  // Skill picture: the first five recordings against the latest five.
  const first = rows.slice(0, 5); const latest = rows.slice(-5);
  const skillsNow = skillAvg(latest); const skillsStart = skillAvg(first);
  const skills = SKILLS.map((k) => ({ key: k, label: SKILL_LABEL[k], now: skillsNow[k], start: skillsStart[k], change: rows.length >= 6 ? skillsNow[k] - skillsStart[k] : null }));
  const scored = skills.filter((s) => s.now > 0);
  const weakestSkill = scored.length ? scored.reduce((a, b) => (b.now < a.now ? b : a)) : null;

  // Weakest area: lowest recent average; an area never practised counts as weakest.
  const areaAvg = (ar: Area) => { const v = rows.filter((r) => r.area === ar).slice(-3).map((r) => r.overall); return v.length ? avg(v) : -1; };
  const weakestArea: Area = [...AREAS].sort((a, b) => areaAvg(a) - areaAvg(b))[0];

  const steps: any[] = [];
  const daySeed = parseInt(today.replace(/-/g, ''), 10);
  if (inBaseline) {
    AREAS.forEach((ar, i) => {
      steps.push({ index: i, role: 'baseline', area: ar, areaLabel: AREA_LABEL[ar], done: baselineDone.has(ar), prompt: buildPrompt(ar, 3, profile, daySeed + i) });
    });
  } else {
    const plan: { role: string; area: Area; level: number }[] = [
      { role: 'Warm-up', area: 'intro', level: level >= 3 ? 2 : 1 },
      { role: 'Focus', area: weakestArea, level },
      { role: 'Interview question', area: 'hr', level },
    ];
    plan.forEach((p, i) => {
      steps.push({ index: i, role: p.role, area: p.area, areaLabel: AREA_LABEL[p.area], done: todayRows.some((r) => r.step === i), prompt: buildPrompt(p.area, p.level, profile, daySeed + i) });
    });
  }
  const threshold = readyThreshold(tenantId);
  const readiness = readinessOf(rows, baselineDone.size, threshold);
  const last = rows[rows.length - 1];
  return {
    mode: inBaseline ? 'baseline' : 'daily', level, levelName: LEVEL_NAME[level], today, steps,
    stepsDone: steps.filter((s) => s.done).length, totalSteps: steps.length, practisedToday: todayRows.length,
    dailyLimit: MAX_COACH_ATTEMPTS_PER_DAY, tooMany: todayRows.length >= MAX_COACH_ATTEMPTS_PER_DAY,
    skills, weakestSkill: weakestSkill?.label || null, weakestArea: AREA_LABEL[weakestArea],
    hesitation: { latest: last?.hes ?? null, first: first[0]?.hes ?? null, trend: rows.slice(-14).map((r) => ({ date: r.practiceDate, hesitation: r.hes, score: r.overall })) },
    totalRecordings: rows.length, baselineAreasDone: baselineDone.size, readiness,
  };
}

// ── The AI's part: judge the content, grounded in what was measured ───────────

const clamp = (n: any) => { const v = Math.round(Number(n)); return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0; };
const list = (a: any, max = 6) => (Array.isArray(a) ? a.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.slice(0, 300)).slice(0, max) : []);
const stripJson = (s: string) => String(s || '').replace(/```json/gi, '').replace(/```/g, '').trim();

export interface CoachEval {
  overall: number; fluency: number; clarity: number; structure: number; content: number; language: number;
  strengths: string[]; improve: string[]; modelAnswer: string; coachMessage: string; nextFocus: string; provider: string;
}

async function askJson(tenantId: string, system: string, user: string): Promise<{ parsed: any; provider: string }> {
  try {
    if (isAnthropicEnabled()) {
      const model = settings.getStr('INTERVIEW_AI_MODEL', 'claude-sonnet-4-6', tenantId);
      const r: any = await getAnthropic()!.messages.create({ model, max_tokens: 1500, system, messages: [{ role: 'user', content: user }] });
      recordUsage({ tenantId, module: 'communication_lab', provider: 'anthropic', model, inputTokens: r?.usage?.input_tokens, outputTokens: r?.usage?.output_tokens }).catch(() => {});
      return { parsed: JSON.parse(stripJson(r?.content?.[0]?.text || '')), provider: 'anthropic' };
    }
  } catch { /* fall through to OpenAI */ }
  try {
    const model = settings.getStr('OPENAI_MODEL', 'gpt-4o-mini', tenantId);
    const r: any = await getOpenAI()!.chat.completions.create({ model, max_tokens: 1500, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] });
    recordUsage({ tenantId, module: 'communication_lab', provider: 'openai', model, inputTokens: r?.usage?.prompt_tokens, outputTokens: r?.usage?.completion_tokens, fellBack: true }).catch(() => {});
    return { parsed: JSON.parse(stripJson(r?.choices?.[0]?.message?.content || '{}')), provider: 'openai' };
  } catch { return { parsed: {}, provider: '' }; }
}

export async function evaluateCoachAnswer(o: {
  tenantId: string; prompt: CoachPrompt; profile: any; transcript: string; durationSec: number; signals: HesitationSignals; wordsPerMinute: number;
}): Promise<CoachEval> {
  const { prompt, signals } = o;
  const system = 'You are a kind but honest speaking coach for Indian engineering freshers who are nervous in interviews. '
    + 'Judge only what is in the transcript and the profile facts: never invent skills, projects or education. '
    + 'Scores are 0-100 and CALIBRATED TO A REAL RECRUITER: 70 means an IT company would pass this answer for a fresher; 50 means understandable but hesitant or thin; below 30 means barely answered. '
    + 'Be encouraging, specific and short. The coach message must name one thing they did well and one thing to fix, using the measured numbers. Output STRICT JSON only.';
  const mode = prompt.level === 1 ? 'The student was READING a script aloud: judge delivery (fluency, clarity, steadiness), do not penalise the content for being a script.'
    : prompt.level === 2 ? 'The student had a guide of points to follow.' : 'The student answered without help.';
  const user = `Question asked: "${prompt.ask}"${prompt.followUp ? ` Then they had to answer: "${prompt.followUp}".` : ''}\n${mode}\n`
    + `Profile facts: ${JSON.stringify({ name: o.profile?.fullName, degree: o.profile?.degree, college: o.profile?.college, skills: o.profile?.primarySkills, project: o.profile?.projectName, projectObjective: o.profile?.projectObjective, tech: o.profile?.projectTechnologies, role: o.profile?.projectResponsibilities, goal: o.profile?.shortTermGoal })}\n`
    + `Measured (do not contradict): spoke ${o.durationSec}s (asked ${prompt.targetSec}s), ${o.wordsPerMinute} words/min, ${signals.pauseCount} pauses of 1s+ (longest ${signals.longestPauseSec}s), first word after ${signals.timeToFirstWordSec}s, ${signals.restarts} restarts, ${signals.fillerPer100Words} filler words per 100 words, hesitation index ${signals.hesitationIndex}/100 (${signals.label}).\n\n`
    + `Transcript:\n"""${(o.transcript || '').slice(0, 5000)}"""\n\n`
    + `Return JSON: {"overall":n,"fluency":n,"clarity":n,"structure":n,"content":n,"language":n,"strengths":["..."],"improve":["..."],"modelAnswer":"a natural, realistic answer to the same question in simple English, using ONLY the student's real facts (60-120 words)","coachMessage":"2-3 sentences","nextFocus":"one concrete thing for the next recording"}`;
  const { parsed: p, provider } = await askJson(o.tenantId, system, user);
  return {
    overall: clamp(p.overall), fluency: clamp(p.fluency), clarity: clamp(p.clarity), structure: clamp(p.structure), content: clamp(p.content), language: clamp(p.language),
    strengths: list(p.strengths), improve: list(p.improve), modelAnswer: String(p.modelAnswer || '').slice(0, 1500),
    coachMessage: String(p.coachMessage || '').slice(0, 600), nextFocus: String(p.nextFocus || '').slice(0, 300), provider,
  };
}

/** The six skills for one recording. "Confidence" is the measured steadiness, not the AI's guess. */
export function skillsOf(e: CoachEval, s: HesitationSignals) {
  return { fluency: Math.round((e.fluency + (100 - s.hesitationIndex)) / 2), confidence: 100 - s.hesitationIndex, clarity: e.clarity, structure: e.structure, content: e.content, language: e.language };
}

/** The evaluation in the shape the rest of the Lab (history, leaderboard, achievements) already reads. */
export function toEvaluation(e: CoachEval, s: HesitationSignals, metrics: any, area: Area): any {
  return {
    overallScore: e.overall, confidenceScore: 100 - s.hesitationIndex, clarityScore: e.clarity, fluencyScore: e.fluency,
    grammarScore: e.language, vocabularyScore: e.language, contentScore: e.content, structureScore: e.structure,
    technicalScore: area === 'technical' ? e.content : null, projectExplanationScore: area === 'project' ? e.content : null,
    strengthExplanationScore: null, careerGoalScore: null, greetingScore: null, closingScore: null,
    eyeContactScore: null, facialExpressionScore: null, postureScore: null,
    speakingSpeed: metrics.speakingSpeed, fillerWords: metrics.fillerWords, repeatedPhrases: metrics.repeatedPhrases,
    strengths: e.strengths, areasToImprove: e.improve, missingSections: [], grammarCorrections: [], sentenceImprovements: [],
    improvedIntroduction: e.modelAnswer, dailyCoachMessage: e.coachMessage, nextPracticeFocus: e.nextFocus,
    readinessLevel: e.overall >= 80 ? 'Interview Ready' : e.overall >= 65 ? 'Confident Speaker' : e.overall >= 45 ? 'Developing Speaker' : 'Beginner Speaker',
    aiProvider: e.provider, evaluatedAt: new Date(),
  };
}

// ── Holders so coach recordings fit the existing attempt records ──────────────

const holderCache = new Map<string, Record<string, mongoose.Types.ObjectId>>();
/** One inactive challenge per area. Inactive, so they never enter the daily rotation or the admin's active list. */
export async function ensureCoachChallenges(tenantId: string, userId: string): Promise<Record<Area, mongoose.Types.ObjectId>> {
  const hit = holderCache.get(tenantId);
  if (hit) return hit as any;
  const out: any = {};
  for (const ar of AREAS) {
    const doc: any = await CommunicationChallenge.findOneAndUpdate(
      { tenantId, isCoach: true, challengeType: AREA_TYPE[ar] },
      { $setOnInsert: { tenantId, isCoach: true, challengeType: AREA_TYPE[ar], title: `Coach: ${AREA_LABEL[ar]}`, active: false, minSeconds: 20, targetSeconds: 60, maxSeconds: 180, maxAttempts: 999, audiences: ['lms'], createdBy: userId } },
      { upsert: true, new: true },
    ).lean();
    out[ar] = doc._id;
  }
  holderCache.set(tenantId, out);
  return out;
}

// ── For the trainer: who needs help, who has gone quiet ───────────────────────

export async function coachOverview(tenantId: string, batchId?: string) {
  const sf: any = { tenantId, role: 'STUDENT', isActive: true };
  if (batchId && mongoose.isValidObjectId(batchId)) sf.batchId = batchId;
  const students: any[] = await User.find(sf).select('name firstName lastName email batchId').limit(800).lean();
  const ids = students.map((s) => s._id);
  const since = new Date(Date.now() - 45 * 86400_000);
  const atts: any[] = await CommunicationAttempt.find({ tenantId, studentId: { $in: ids }, status: 'completed', createdAt: { $gte: since } })
    .select('studentId practiceDate createdAt kind evaluation.overallScore overriddenScore coach').lean();
  const base: any[] = await CommunicationAttempt.aggregate([
    { $match: { tenantId: new mongoose.Types.ObjectId(tenantId), studentId: { $in: ids }, kind: 'coach', 'coach.isBaseline': true, status: 'completed' } },
    { $group: { _id: '$studentId', areas: { $addToSet: '$coach.area' } } },
  ]);
  const baseMap = new Map(base.map((b) => [String(b._id), (b.areas || []).length]));
  const by = new Map<string, any[]>();
  for (const a of atts) { const k = String(a.studentId); (by.get(k) || by.set(k, []).get(k)!).push(a); }
  const threshold = readyThreshold(tenantId);
  const today = coachToday();
  const dayDiff = (d: string) => Math.round((Date.parse(today) - Date.parse(d)) / 86400_000);

  const rows = students.map((s) => {
    const mine = (by.get(String(s._id)) || []).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    const coachRows = mine.filter((a) => a.kind === 'coach').map(toRow);
    const last = mine[mine.length - 1];
    const daysSince = last ? dayDiff(last.practiceDate) : null;
    const r = readinessOf(coachRows, baseMap.get(String(s._id)) || 0, threshold);
    const flags: string[] = [];
    if (!mine.length) flags.push('never_started');
    else if (daysSince !== null && daysSince >= 3) flags.push('inactive');
    if (coachRows.length >= 3 && r.avgHesitation >= 50) flags.push('high_hesitation');
    if (coachRows.length >= 3 && r.avgOverall < 40) flags.push('low_score');
    const name = s.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || s.email;
    return {
      studentId: String(s._id), name, email: s.email, batchId: s.batchId ? String(s.batchId) : null,
      lastPracticeDate: last?.practiceDate || null, daysSincePractice: daysSince, recordings: coachRows.length,
      baselineAreas: baseMap.get(String(s._id)) || 0, level: levelFrom(coachRows.slice(-4).map((x) => ({ overall: x.overall, hes: x.hes }))),
      avgScore: r.avgOverall, avgHesitation: r.avgHesitation, readiness: r.score, ready: r.ready, flags,
    };
  });
  const rank = (x: any) => (x.flags.includes('never_started') ? 0 : x.flags.includes('inactive') ? 1 : x.flags.includes('high_hesitation') ? 2 : x.flags.includes('low_score') ? 3 : 4);
  rows.sort((a, b) => rank(a) - rank(b) || a.readiness - b.readiness);
  return {
    threshold, today,
    summary: {
      students: rows.length, ready: rows.filter((r) => r.ready).length, neverStarted: rows.filter((r) => r.flags.includes('never_started')).length,
      inactive: rows.filter((r) => r.flags.includes('inactive')).length, highHesitation: rows.filter((r) => r.flags.includes('high_hesitation')).length,
      practisedToday: rows.filter((r) => r.lastPracticeDate === today).length,
    },
    students: rows,
  };
}

/** Is this student ready to be put in front of a company? Used by the placement side. */
export async function readinessFor(tenantId: string, studentId: string) {
  const rows: any[] = await CommunicationAttempt.find({ tenantId, studentId, kind: 'coach', status: 'completed' }).sort({ createdAt: 1 }).limit(300)
    .select('practiceDate createdAt evaluation.overallScore overriddenScore coach').lean();
  const rr = rows.map(toRow);
  const areas = new Set(rr.filter((r) => r.baseline && r.area).map((r) => r.area)).size;
  return readinessOf(rr, areas, readyThreshold(tenantId));
}
