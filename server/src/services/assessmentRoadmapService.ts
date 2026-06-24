import { getAnthropic } from './aiClients';
import * as settings from './settingsService';
import mongoose from 'mongoose';
import LearningCurriculum, { ILearningCurriculum } from '../models/LearningCurriculum';
import { IAssessmentSubmission, IRoadmap } from '../models/AssessmentSubmission';
import { DIMENSION_LABELS } from '../constants/assessment';
import { findMasterTrackForCandidate, personalizeTrackForCandidate } from './trackPersonalizationService';

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

/** Best-effort Claude call: choose + narrate from a curricula list. Null on no key / failure. */
async function aiNarrate(
  submission: IAssessmentSubmission,
  curricula: ILearningCurriculum[]
): Promise<{ planId?: mongoose.Types.ObjectId; gaps: string[]; narrative: string; salaryBand: string; timelineWeeks?: number } | null> {
  const client = getAnthropic();
  if (!client || !curricula.length) return null;
  try {
    const resp = await client.messages.create({
      model: MODEL(),
      max_tokens: 700,
      system: [
        { type: 'text', text: SYSTEM_PROMPT },
        // Cacheable: the per-tenant catalog is reused across candidates within the TTL.
        { type: 'text', text: `Available Learning Plans:\n${buildCatalog(curricula)}`, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: `Candidate profile:\n${buildProfile(submission)}\n\nReturn the roadmap JSON.` }],
    });
    const text = resp.content.map((b: any) => (b.type === 'text' ? b.text : '')).join('').trim();
    const json = JSON.parse(text.replace(/^```(?:json)?|```$/g, '').trim());
    const chosen = curricula.find((c) => String(c._id) === String(json.planId)) || curricula[0];
    return {
      planId: chosen._id as mongoose.Types.ObjectId,
      gaps: Array.isArray(json.gaps) ? json.gaps.slice(0, 3) : [],
      narrative: String(json.narrative || '').slice(0, 600),
      salaryBand: json.salaryBand || '',
      timelineWeeks: Number(json.timelineWeeks) || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Generate a roadmap for a graded submission. Best-effort; never throws.
 *
 * Master-track hybrid: if a mentor-approved master-track matches the candidate's
 * role + level, we PERSONALIZE it (clone, trimmed/expanded by their sub-scores)
 * and the roadmap points at that personalized plan. Otherwise we fall back to
 * selecting an ordinary published curriculum so a roadmap is always produced.
 */
export async function generateRoadmap(submission: IAssessmentSubmission): Promise<IRoadmap | null> {
  const targetRole = submission.candidate?.targetRole;
  try {
    // ── Master-track hybrid path ────────────────────────────────────────────
    const master = await findMasterTrackForCandidate(submission);
    if (master) {
      let planId = master._id as mongoose.Types.ObjectId;
      let planTitle = master.title;
      if (submission.candidateUserId) {
        try {
          const p = await personalizeTrackForCandidate(submission, master);
          if (p) { planId = p.curriculumId; planTitle = `${master.title} · ${(submission.candidate?.name || 'You')}`.trim(); }
        } catch (e: any) {
          console.error('[roadmap] personalize failed, using master-track as-is:', e?.message);
        }
      }
      const ai = await aiNarrate(submission, [master]);
      const fb = fallbackRoadmap(submission, [master]);
      return {
        generatedAt: new Date(),
        planId,
        planTitle,
        gaps: ai?.gaps?.length ? ai.gaps : fb.gaps,
        narrative: ai?.narrative || fb.narrative,
        targetRole,
        salaryBand: ai?.salaryBand || fb.salaryBand,
        timelineWeeks: master.pace?.targetWeeks || ai?.timelineWeeks || fb.timelineWeeks,
        generatedBy: ai ? MODEL() : 'master-track',
      };
    }

    // ── Legacy path: no master-track → pick an ordinary published curriculum ──
    const curricula = await LearningCurriculum.find({
      tenantId: submission.tenantId, isPublished: true, isMasterTrack: { $ne: true }, personalizedFor: null,
    })
      .select('title description targetCourse totalDays topics enrollmentCount')
      .lean<ILearningCurriculum[]>();
    if (!curricula.length) return fallbackRoadmap(submission, []);
    const ai = await aiNarrate(submission, curricula);
    if (!ai) return fallbackRoadmap(submission, curricula);
    const chosen = curricula.find((c) => String(c._id) === String(ai.planId)) || curricula[0];
    return {
      generatedAt: new Date(),
      planId: chosen._id as mongoose.Types.ObjectId,
      planTitle: chosen.title,
      gaps: ai.gaps,
      narrative: ai.narrative,
      targetRole,
      salaryBand: ai.salaryBand,
      timelineWeeks: ai.timelineWeeks,
      generatedBy: MODEL(),
    };
  } catch (err) {
    // Any failure → deterministic fallback so the candidate always gets a roadmap.
    try {
      const curricula = await LearningCurriculum.find({ tenantId: submission.tenantId, isPublished: true, isMasterTrack: { $ne: true }, personalizedFor: null })
        .select('title targetCourse totalDays topics enrollmentCount').lean<ILearningCurriculum[]>();
      return fallbackRoadmap(submission, curricula);
    } catch {
      return null;
    }
  }
}
