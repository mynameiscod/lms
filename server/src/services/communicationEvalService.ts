/**
 * communicationEvalService — the brain of the AI Communication Lab.
 *
 * Reuses the existing Whisper transcription and Claude/GPT clients. Speech metrics
 * (words-per-minute, filler words, repeated phrases) are computed deterministically on the
 * server from the transcript — never trusted from the client or the AI. The AI is used only
 * for the qualitative judgement, forced into a strict JSON schema and validated before storage.
 */
import { getAnthropic, getOpenAI, isAnthropicEnabled } from './aiClients';
import { recordUsage } from './aiGateway';
import * as settings from './settingsService';
import { IEvaluation } from '../models/CommunicationAttempt';
import { ICommunicationProfile } from '../models/CommunicationProfile';
import { ICommunicationChallenge } from '../models/CommunicationChallenge';

const FILLERS = ['um', 'uh', 'umm', 'uhh', 'hmm', 'like', 'actually', 'basically', 'so', 'you know', 'i mean', 'right', 'okay', 'ok', 'literally', 'kind of', 'sort of', 'yeah'];

const clamp = (n: any): number => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
};
const arr = (a: any): string[] => (Array.isArray(a) ? a.filter((x) => typeof x === 'string' && x.trim()).slice(0, 12) : []);
const pairs = (a: any): { original: string; improved: string }[] =>
  Array.isArray(a) ? a.filter((x) => x && x.original && x.improved).map((x) => ({ original: String(x.original), improved: String(x.improved) })).slice(0, 12) : [];

// ── Server-side speech metrics (authoritative) ────────────────────────────────
export function computeSpeechMetrics(transcript: string, durationSec: number) {
  const text = (transcript || '').trim();
  const words = text ? text.split(/\s+/) : [];
  const wordCount = words.length;
  const minutes = Math.max(durationSec / 60, 0.01);
  const wordsPerMinute = Math.round(wordCount / minutes);

  const lower = ' ' + text.toLowerCase().replace(/[.,!?;:]/g, ' ') + ' ';
  const fillerCounts: Record<string, number> = {};
  let fillerTotal = 0;
  for (const f of FILLERS) {
    const m = lower.match(new RegExp(`\\s${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s`, 'g'));
    if (m && m.length) { fillerCounts[f] = m.length; fillerTotal += m.length; }
  }

  // repeated 3-word phrases
  const repeated: string[] = [];
  const seen: Record<string, number> = {};
  for (let i = 0; i + 2 < words.length; i++) {
    const p = `${words[i]} ${words[i + 1]} ${words[i + 2]}`.toLowerCase();
    seen[p] = (seen[p] || 0) + 1;
    if (seen[p] === 2 && p.length > 8 && !repeated.includes(p)) repeated.push(p);
  }

  let speedStatus = 'GOOD';
  if (wordsPerMinute > 160) speedStatus = 'TOO_FAST';
  else if (wordsPerMinute > 0 && wordsPerMinute < 110) speedStatus = 'TOO_SLOW';

  return {
    wordCount,
    wordsPerMinute,
    speakingSpeed: { wordsPerMinute, status: speedStatus, recommendedRange: '120-150' },
    fillerWords: { total: fillerTotal, words: fillerCounts },
    repeatedPhrases: repeated.slice(0, 6),
  };
}

// ── Personalized self-introduction template (no AI, purely from profile) ──────
export function generateTemplate(p: Partial<ICommunicationProfile> | null): string {
  const g = (v?: string, fallback = '') => (v && v.trim() ? v.trim() : fallback);
  const list = (a?: string[], fallback = '') => (a && a.length ? a.join(', ') : fallback);
  const name = g(p?.fullName, '[Your Name]');
  return [
    'Good morning. Thank you for giving me this opportunity to introduce myself.',
    `My name is ${name}, and I am from ${g(p?.currentCity, '[Your City]')}.`,
    `I completed my ${g(p?.degree, '[Degree]')} in ${g(p?.specialization, '[Specialization]')} from ${g(p?.college, '[College]')} in ${g(p?.graduationYear, '[Year]')} with ${g(p?.cgpaOrPercentage, '[CGPA/Percentage]')}.`,
    `My technical skills include ${list(p?.primarySkills, '[Your Skills]')}.`,
    `I completed my training at ${g(p?.trainingInstitute, 'CodeBegun')}, where I gained hands-on experience in ${list(p?.projectTechnologies, '[Technologies]')}.`,
    `My main project is ${g(p?.projectName, '[Project Name]')}. The objective of the project is ${g(p?.projectObjective, '[Objective]')}. In this project, I worked on ${g(p?.projectResponsibilities, '[Responsibilities]')}.`,
    `My strengths are ${list(p?.strengths, '[Strengths]')}.`,
    `My short-term goal is ${g(p?.shortTermGoal, '[Short-Term Goal]')}, and my long-term goal is ${g(p?.longTermGoal, '[Long-Term Goal]')}.`,
    'Thank you for your time. I would be happy to answer your questions.',
  ].join('\n\n');
}

function readiness(overall: number): string {
  if (overall >= 90) return 'Advanced Communicator';
  if (overall >= 80) return 'Interview Ready';
  if (overall >= 65) return 'Confident Speaker';
  if (overall >= 45) return 'Developing Speaker';
  return 'Beginner Speaker';
}

function stripJson(s: string): string {
  return String(s || '').replace(/```json/gi, '').replace(/```/g, '').trim();
}

function buildPrompt(profile: Partial<ICommunicationProfile> | null, challenge: Partial<ICommunicationChallenge>, transcript: string, metrics: any, recordingType: string) {
  const profileCtx = profile
    ? `Student profile (use ONLY these facts — never invent skills, projects, companies, or education):\n${JSON.stringify({
        name: profile.fullName, city: profile.currentCity, degree: profile.degree, specialization: profile.specialization,
        college: profile.college, year: profile.graduationYear, cgpa: profile.cgpaOrPercentage,
        primarySkills: profile.primarySkills, secondarySkills: profile.secondarySkills, training: profile.trainingInstitute,
        internship: profile.internshipDetails, project: profile.projectName, projectObjective: profile.projectObjective,
        projectTech: profile.projectTechnologies, responsibilities: profile.projectResponsibilities,
        strengths: profile.strengths, shortTermGoal: profile.shortTermGoal, longTermGoal: profile.longTermGoal,
        targetRole: profile.targetRole,
      })}`
    : 'The student has not filled a communication profile — evaluate on the transcript alone and note in missingSections that a profile would help.';

  const system =
    'You are a warm but honest communication coach for Indian engineering freshers preparing for job interviews. ' +
    'You evaluate a student\'s spoken self-introduction. Be constructive and encouraging — never insulting or demotivating. ' +
    'Base your evaluation ONLY on the transcript and the given profile facts. Never invent skills, projects, companies, ' +
    'responsibilities, or education the student did not provide. Keep suggestions realistic and in simple professional English. ' +
    'Respond with STRICT JSON only — no markdown, no commentary.';

  const user =
    `${profileCtx}\n\n` +
    `Challenge: ${challenge.title || 'Self Introduction'}${challenge.description ? ' — ' + challenge.description : ''}\n` +
    `Recording type: ${recordingType} (do NOT evaluate visual/body-language metrics — no video frames are provided).\n` +
    `Measured speaking speed: ${metrics.wordsPerMinute} wpm (${metrics.speakingSpeed.status}). Filler words counted: ${metrics.fillerWords.total}.\n\n` +
    `Transcript:\n"""${(transcript || '').slice(0, 6000)}"""\n\n` +
    `Return JSON exactly in this shape (all scores 0-100 integers):\n` +
    `{"overallScore":n,"confidenceScore":n,"clarityScore":n,"fluencyScore":n,"grammarScore":n,"vocabularyScore":n,` +
    `"contentScore":n,"structureScore":n,"technicalScore":n,"projectExplanationScore":n,"strengthExplanationScore":n,` +
    `"careerGoalScore":n,"greetingScore":n,"closingScore":n,` +
    `"strengths":["..."],"areasToImprove":["..."],"missingSections":["..."],` +
    `"grammarCorrections":[{"original":"...","improved":"..."}],"sentenceImprovements":[{"original":"...","improved":"..."}],` +
    `"improvedIntroduction":"a realistic, natural rewrite using ONLY the student's real facts","dailyCoachMessage":"2-3 encouraging sentences","nextPracticeFocus":"one concrete focus for tomorrow"}`;

  return { system, user };
}

// ── Main evaluation (Claude-first → GPT fallback → safe fallback) ─────────────
export async function evaluateIntroduction(
  profile: Partial<ICommunicationProfile> | null,
  challenge: Partial<ICommunicationChallenge>,
  transcript: string,
  durationSec: number,
  recordingType: 'audio' | 'video',
  tenantId?: string
): Promise<IEvaluation> {
  const metrics = computeSpeechMetrics(transcript, durationSec);
  const { system, user } = buildPrompt(profile, challenge, transcript, metrics, recordingType);

  let parsed: any = {};
  let aiProvider = '';
  let aiModel = '';

  try {
    if (isAnthropicEnabled()) {
      const client = getAnthropic();
      const model = settings.getStr('INTERVIEW_AI_MODEL', 'claude-sonnet-4-6', tenantId);
      const r: any = await client!.messages.create({
        model, max_tokens: 2000, system, messages: [{ role: 'user', content: user }],
      });
      const text = r?.content?.[0]?.text || '';
      parsed = JSON.parse(stripJson(text));
      aiProvider = 'anthropic'; aiModel = model;
      recordUsage({ tenantId, module: 'communication_lab', provider: 'anthropic', model, inputTokens: r?.usage?.input_tokens, outputTokens: r?.usage?.output_tokens }).catch(() => {});
    } else {
      throw new Error('anthropic disabled');
    }
  } catch {
    // Fallback to OpenAI
    try {
      const client = getOpenAI();
      const model = settings.getStr('OPENAI_MODEL', 'gpt-4o-mini', tenantId);
      const r: any = await client!.chat.completions.create({
        model, max_tokens: 2000, response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      });
      parsed = JSON.parse(stripJson(r?.choices?.[0]?.message?.content || '{}'));
      aiProvider = 'openai'; aiModel = model;
      recordUsage({ tenantId, module: 'communication_lab', provider: 'openai', model, inputTokens: r?.usage?.prompt_tokens, outputTokens: r?.usage?.completion_tokens, fellBack: true }).catch(() => {});
    } catch {
      parsed = {}; // safe fallback — scores default to 0, qualitative empty
    }
  }

  const overall = clamp(parsed.overallScore);
  const evaluation: IEvaluation = {
    overallScore: overall,
    confidenceScore: clamp(parsed.confidenceScore),
    clarityScore: clamp(parsed.clarityScore),
    fluencyScore: clamp(parsed.fluencyScore),
    grammarScore: clamp(parsed.grammarScore),
    vocabularyScore: clamp(parsed.vocabularyScore),
    contentScore: clamp(parsed.contentScore),
    structureScore: clamp(parsed.structureScore),
    technicalScore: clamp(parsed.technicalScore),
    projectExplanationScore: clamp(parsed.projectExplanationScore),
    strengthExplanationScore: clamp(parsed.strengthExplanationScore),
    careerGoalScore: clamp(parsed.careerGoalScore),
    greetingScore: clamp(parsed.greetingScore),
    closingScore: clamp(parsed.closingScore),
    // Visual metrics: no frame analysis → Not Evaluated
    eyeContactScore: null,
    facialExpressionScore: null,
    postureScore: null,
    speakingSpeed: metrics.speakingSpeed,     // server-computed, authoritative
    fillerWords: metrics.fillerWords,         // server-computed, authoritative
    repeatedPhrases: metrics.repeatedPhrases,
    strengths: arr(parsed.strengths),
    areasToImprove: arr(parsed.areasToImprove),
    missingSections: arr(parsed.missingSections),
    grammarCorrections: pairs(parsed.grammarCorrections),
    sentenceImprovements: pairs(parsed.sentenceImprovements),
    improvedIntroduction: String(parsed.improvedIntroduction || '').slice(0, 4000),
    dailyCoachMessage: String(parsed.dailyCoachMessage || '').slice(0, 1000),
    nextPracticeFocus: String(parsed.nextPracticeFocus || '').slice(0, 500),
    readinessLevel: readiness(overall),
    aiProvider,
    aiModel,
    evaluatedAt: new Date(),
  };
  return evaluation;
}
