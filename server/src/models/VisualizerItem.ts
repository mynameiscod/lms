import mongoose, { Schema, Document } from 'mongoose';

/**
 * One entry in the Code Visualizer library.
 *
 * Two kinds share one collection on purpose, because students browse them together:
 *
 *   - `problem`  a DSA problem the student solves and then WATCHES run, line by line. The
 *                statement comes with a breakdown — the same problem split several ways —
 *                because understanding the statement is where most students actually stall.
 *   - `concept`  an idea rather than a program (time complexity, how memory is laid out).
 *                There is no code to run; `conceptWidget` names an interactive animation the
 *                client renders.
 *
 * Built to hold thousands: everything a list screen filters on is indexed, and the heavy
 * fields (solution, breakdown) are only read on the detail route.
 */

export const VISUALIZER_KINDS = ['problem', 'concept'] as const;
export type VisualizerKind = typeof VISUALIZER_KINDS[number];

export const VISUALIZER_DIFFICULTIES = ['beginner', 'easy', 'medium', 'hard'] as const;
export type VisualizerDifficulty = typeof VISUALIZER_DIFFICULTIES[number];

/**
 * How the array panel animates. `array_bars` draws values as bars so a swap is visibly a
 * swap; `array_cells` is the plain boxed row, better for searches where height means nothing.
 */
export const VISUALIZER_ANIMATIONS = ['array_bars', 'array_cells', 'none'] as const;
export type VisualizerAnimation = typeof VISUALIZER_ANIMATIONS[number];

export interface IVisualizerBreakdown {
  /** The problem retold in one or two plain sentences, with no jargon. */
  plainEnglish?: string;
  /** What comes in and what must go out, named explicitly. */
  input?: string;
  output?: string;
  /** One example worked by hand, step by step, before any code. */
  walkthrough?: string[];
  /** The approach as ordered steps — the plan, not the code. */
  steps?: string[];
  /** Cases a first attempt usually forgets. */
  edgeCases?: string[];
}

export interface IVisualizerItem extends Document {
  tenantId: string;
  kind: VisualizerKind;
  title: string;
  slug: string;
  topic: string;
  difficulty: VisualizerDifficulty;
  summary?: string;
  order: number;

  /* Problem fields. */
  language: string;
  statement?: string;
  examples: { input: string; output: string; explanation?: string }[];
  constraints?: string;
  breakdown?: IVisualizerBreakdown;
  starterCode?: string;
  solutionCode?: string;
  stdin?: string;
  animation: VisualizerAnimation;

  /* Complexity, as the author states it. The trace adds the measured operation count. */
  timeComplexity?: string;
  spaceComplexity?: string;
  complexityNote?: string;

  /* Concept fields. */
  conceptWidget?: string;
  body?: string;

  published: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VisualizerItemSchema = new Schema<IVisualizerItem>(
  {
    tenantId:   { type: String, required: true, index: true },
    kind:       { type: String, enum: VISUALIZER_KINDS, default: 'problem' },
    title:      { type: String, required: true, trim: true },
    slug:       { type: String, required: true, trim: true, lowercase: true },
    topic:      { type: String, default: 'General', trim: true },
    difficulty: { type: String, enum: VISUALIZER_DIFFICULTIES, default: 'easy' },
    summary:    { type: String, default: '' },
    order:      { type: Number, default: 0 },

    language:     { type: String, default: 'java' },
    statement:    { type: String, default: '' },
    examples:     { type: [{ input: String, output: String, explanation: String, _id: false }], default: [] },
    constraints:  { type: String, default: '' },
    breakdown: {
      plainEnglish: { type: String, default: '' },
      input:        { type: String, default: '' },
      output:       { type: String, default: '' },
      walkthrough:  { type: [String], default: [] },
      steps:        { type: [String], default: [] },
      edgeCases:    { type: [String], default: [] },
    },
    starterCode:  { type: String, default: '' },
    solutionCode: { type: String, default: '' },
    stdin:        { type: String, default: '' },
    animation:    { type: String, enum: VISUALIZER_ANIMATIONS, default: 'array_bars' },

    timeComplexity:  { type: String, default: '' },
    spaceComplexity: { type: String, default: '' },
    complexityNote:  { type: String, default: '' },

    conceptWidget: { type: String, default: '' },
    body:          { type: String, default: '' },

    published: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

VisualizerItemSchema.index({ tenantId: 1, slug: 1 }, { unique: true });
VisualizerItemSchema.index({ tenantId: 1, published: 1, kind: 1, topic: 1, difficulty: 1, order: 1 });

export default mongoose.model<IVisualizerItem>('VisualizerItem', VisualizerItemSchema);
