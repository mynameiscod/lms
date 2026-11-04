import data from './curriculum.json';
import { DsaModuleDetail, DsaModuleSummary } from '../../../api/dsaApi';

/**
 * The curriculum's lessons, bundled with the app (generated from the server seed by
 * server/scripts/gen-dsa-curriculum-client.js; a server test keeps the two identical).
 *
 * They let the Visualizer show every concept card and lesson even when the server does not have the
 * curriculum yet (not deployed, or not set up for the institute). Problem counts, progress and
 * practice sets only exist on the server, so bundled pages leave those out.
 */

export interface BundledModule {
  slug: string; order: number; title: string; summary: string; stage: string;
  prerequisites: string[]; problemTopics: string[]; visualizerSlugs?: string[]; widgets?: string[];
  overview?: string; objectives?: string[];
  concepts?: { title: string; body: string }[]; internals?: { title: string; body: string }[];
  javaExamples?: { title: string; explanation: string; code: string; input?: string; output?: string }[];
  complexity?: { operation: string; time: string; space: string; note?: string }[];
  mistakes?: string[]; edgeCases?: string[];
  assignments?: { title: string; brief: string }[];
  interviewQuestions?: { question: string; answer: string }[];
}

export const BUNDLED_MODULES: BundledModule[] = (data as { modules: BundledModule[] }).modules;

const EMPTY = { easy: 0, medium: 0, hard: 0, total: 0 };

export const bundledSummaries = (): DsaModuleSummary[] => BUNDLED_MODULES.map(m => ({
  slug: m.slug, order: m.order, title: m.title, summary: m.summary, stage: m.stage,
  prerequisites: m.prerequisites, hasLesson: !!m.overview,
  visualizerCount: (m.visualizerSlugs || []).length, widgets: m.widgets || [],
  problems: { ...EMPTY }, solved: 0,
}));

export function bundledDetail(slug: string): DsaModuleDetail | null {
  const m = BUNDLED_MODULES.find(x => x.slug === slug);
  if (!m) return null;
  return {
    slug: m.slug, order: m.order, title: m.title, summary: m.summary, stage: m.stage, hasLesson: !!m.overview,
    prerequisites: m.prerequisites.map(p => ({ slug: p, title: BUNDLED_MODULES.find(x => x.slug === p)?.title || p })),
    overview: m.overview || '', objectives: m.objectives || [], concepts: m.concepts || [], internals: m.internals || [],
    javaExamples: m.javaExamples || [], complexity: m.complexity || [], mistakes: m.mistakes || [], edgeCases: m.edgeCases || [],
    assignments: m.assignments || [], interviewQuestions: m.interviewQuestions || [],
    widgets: m.widgets || [], problemTopics: m.problemTopics,
    visualizers: [],
    problems: { easy: [], medium: [], hard: [] }, problemCounts: { ...EMPTY }, practiceSets: [],
  };
}

/** Visualizer items each module links, by slug, for matching against the live Visualizer list. */
export const visualizerSlugsFor = (slug: string): string[] => BUNDLED_MODULES.find(m => m.slug === slug)?.visualizerSlugs || [];
