/**
 * The Year-3 golden bank, assembled.
 *
 * One file per skill, fifty items each, ten at every difficulty band. Kept apart from the Year-1
 * and Year-2 banks because the three are imported, counted and certified separately: a Year-3
 * question must never change a Year-2 inventory, and a skill an earlier year already measures
 * keeps the questions it has rather than gaining a second set.
 *
 * ── WHAT BELONGS HERE ─────────────────────────────────────────────────────────────────────
 *
 * Only the skills Year 3 introduces. Of the 84 active skills in its stage set, 49 already had
 * three or more questions from the earlier years the day Year 3 was seeded — CODE_REVIEW,
 * REST_APIS, DSA_TREES and the rest are measured perfectly well by the banks that already exist.
 * The 35 that had none are what this file is for, and reusing the others is deliberate rather
 * than an omission.
 */

import { GoldenItem } from './types';
import { DESIGN_PATTERNS } from './designPatterns';

export const YEAR3_BANK: GoldenItem[] = [
  ...DESIGN_PATTERNS,
];

export { GoldenItem };
