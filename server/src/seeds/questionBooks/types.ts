/**
 * A question book written as content, so the same books reach every environment (seedQuestionBooks.ts).
 *
 * `stages` and `tracks` say which CareerPilot members see the book (empty = everyone):
 *   stages: foundation (Year 1) | build (Year 2) | specialize (Year 3) | placement (Year 4)
 *   tracks: career track keys from careerTrackDefinitions.ts — only members on those tracks.
 * Year 3/4 members without a track are matched as Year 2.
 *
 * Questions and answers are Markdown: `code`, ``` blocks ```, **bold** and lists render on the page.
 */
export type SeedDifficulty = 'easy' | 'medium' | 'hard';

export interface SeedQuestion {
  q: string;
  a: string;
  /** Default medium. */
  d?: SeedDifficulty;
  /** Where it is commonly asked ("TCS, Infosys"). */
  at?: string;
  tip?: string;
}

export interface SeedChapter { title: string; questions: SeedQuestion[] }

export interface SeedBook {
  /** The stable key: re-running the seed finds the book by it. Never change it once shipped. */
  slug: string;
  title: string;
  kind: 'topic' | 'company';
  subject: string;
  description: string;
  color: string;
  emblem: string;
  audience: 'all' | 'lms' | 'careerpilot';
  stages: string[];
  tracks: string[];
  order: number;
  chapters: SeedChapter[];
}

/** Years shared by most books, so the book files read plainly. */
export const Y1_Y2 = ['foundation', 'build'];
export const Y2 = ['build'];
export const ALL_YEARS: string[] = [];
