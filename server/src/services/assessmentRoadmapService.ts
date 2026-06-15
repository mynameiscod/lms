import { getAnthropic } from './aiClients';
import * as settings from './settingsService';
import mongoose from 'mongoose';
import LearningCurriculum, { ILearningCurriculum } from '../models/LearningCurriculum';
import { IAssessmentSubmission, IRoadmap } from '../models/AssessmentSubmission';
import { DIMENSION_LABELS } from '../constants/assessment';

/**
 * Roadmap service — turns a graded submission into a personalized roadmap by
 * selecting the best-fit existing Learning Plan (curriculum) and naming the
 * candidate's gaps. Claude SELECTS and SEQUENCES existing curricula; it never
 * invents content. Falls back to a deterministic roadmap if the API key or
 * curricula are unavailable, so a roadmap is always produced.
 */

const MODEL = () => settings.getStr('ASSESSMENT_ROADMAP_MODEL', 'claude-sonnet-4-6');

const SYSTEM_PROMPT = `You are a senior software-career mentor at a coding academy.
A candidate has finished a skill assessment. Using ONLY the provided list of available
Learning Plans, pick the single best-fit plan for them and produce a short, motivating
roadmap. Do NOT invent plans or topics outside the provided list.

Return ONLY a raw JSON object (no markdown, no code fences) with this exact schema:
{
  "planId": "string (the _id of the chosen plan from the list)",
  "gaps": ["3 short, specific skill gaps to close, based on their weakest sub-scores"],
  "narrative": "2-3 sentence personal, encouraging summary of where they are and the path forward",
  "targetRole": "string",
  "salaryBand": "string (e.g. '₹12–18 LPA'), or empty string",
  "timelineWeeks": number
}`;

function buildCatalog(curricula: ILearningCurriculum[]): string {
  return curricula
    .map((c) => {
      const topics = (c.topics || []).map((t) => t.title).slice(0, 25).join(', ');
      return `- id:${c._id} | "${c.title}" | target:${c.targetCourse || 'general'} | ${c.totalDays} days | topics: ${topics}`;
    })
    .join('\n');
}

function buildProfile(s: IAssessmentSubmission): string {
  const c = s.candidate;
  const subs = s.subScores.map((x) => `${DIMENSION_LABELS[x.dimension] || x.dimension}: ${x.percentage}%`).join(', ');
  return [
    `Segment: ${c.segment}`,
    c.year ? `Year: ${c.year}` : '',
    c.yearsExperience != null ? `Experience: ${c.yearsExperience} yrs` : '',
    c.currentStack?.length ? `Current stack: ${c.currentStack.join(', ')}` : '',
    c.currentPackage != null ? `Current package: ₹${c.currentPackage} LPA` : '',
    c.targetRole ? `Target role: ${c.targetRole}` : '',
    c.targetCompany ? `Target company: ${c.targetCompany}` : '',
    c.targetSalary != null ? `Target salary: ₹${c.targetSalary} LPA` : '',
    `Readiness Score: ${s.readinessScore ?? 0}/100`,
    `Sub-scores: ${subs}`,
  ].filter(Boolean).join('\n');
}

/** Deterministic roadmap when AI is unavailable — always returns something useful. */
function fallbackRoadmap(s: IAssessmentSubmission, curricula: ILearningCurriculum[]): IRoadmap {
  const c = s.candidate;
  const stack = (c.currentStack || []).map((x) => x.toLowerCase());
  const pick =
    curricula.find((cur) => stack.some((st) => (cur.targetCourse || cur.title || '').toLowerCase().includes(st))) ||
    [...curricula].sort((a, b) => (b.enrollmentCount || 0) - (a.enrollmentCount || 0))[0];

  const weakest = [...s.subScores].sort((a, b) => a.percentage - b.percentage).slice(0, 3);
  const gaps = weakest.map((w) => `Strengthen ${DIMENSION_LABELS[w.dimension] || w.dimension} (currently ${w.percentage}%)`);

  const r = s.readinessScore ?? 0;
  const timelineWeeks = r >= 70 ? 8 : r >= 50 ? 12 : r >= 30 ? 16 : 20;
  const salaryBand = c.targetSalary != null ? `₹${c.targetSalary} LPA${c.currentPackage != null ? ` (from ₹${c.currentPackage})` : ''}` : '';

  return {
    generatedAt: new Date(),
    planId: pick?._id as mongoose.Types.ObjectId | undefined,
    planTitle: pick?.title,
    gaps: gaps.length ? gaps : ['Build consistency with daily practice'],
    narrative: `You're at ${r}/100. With a focused ${timelineWeeks}-week plan${pick ? ` ("${pick.title}")` : ''}, you can close your key gaps and move toward ${c.targetRole || 'your target role'}.`,
    targetRole: c.targetRole,
    salaryBand,
    timelineWeeks,
    generatedBy: 'fallback',
  };
}

/** Generate (and return) a roadmap for a graded submission. Best-effort; never throws. */
export async function generateRoadmap(submission: IAssessmentSubmission): Promise<IRoadmap | null> {
  try {
    const curricula = await LearningCurriculum.find({ tenantId: submission.tenantId, isPublished: true })
      .select('title description targetCourse totalDays topics enrollmentCount')
      .lean<ILearningCurriculum[]>();

    if (!curricula.length) return fallbackRoadmap(submission, []);
    const client = getAnthropic();
    if (!client) return fallbackRoadmap(submission, curricula);

    const catalog = buildCatalog(curricula);
    const profile = buildProfile(submission);

    const resp = await client.messages.create({
      model: MODEL(),
      max_tokens: 700,
      system: [
        { type: 'text', text: SYSTEM_PROMPT },
        // Cacheable: the per-tenant catalog is reused across candidates within the TTL.
        { type: 'text', text: `Available Learning Plans:\n${catalog}`, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: `Candidate profile:\n${profile}\n\nReturn the roadmap JSON.` }],
    });

    const text = resp.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('').trim();
    const json = JSON.parse(text.replace(/^```(?:json)?|```$/g, '').trim());

    const chosen = curricula.find((c) => String(c._id) === String(json.planId)) || curricula[0];
    return {
      generatedAt: new Date(),
      planId: chosen._id as mongoose.Types.ObjectId,
      planTitle: chosen.title,
      gaps: Array.isArray(json.gaps) ? json.gaps.slice(0, 3) : [],
      narrative: String(json.narrative || '').slice(0, 600),
      targetRole: json.targetRole || submission.candidate.targetRole,
      salaryBand: json.salaryBand || '',
      timelineWeeks: Number(json.timelineWeeks) || undefined,
      generatedBy: MODEL(),
    };
  } catch (err) {
    // Any failure → deterministic fallback so the candidate always gets a roadmap.
    try {
      const curricula = await LearningCurriculum.find({ tenantId: submission.tenantId, isPublished: true })
        .select('title targetCourse totalDays topics enrollmentCount').lean<ILearningCurriculum[]>();
      return fallbackRoadmap(submission, curricula);
    } catch {
      return null;
    }
  }
}
