/**
 * Who a piece of content is for.
 *
 * Extracted so the Thinking Lab bank, the Communication Lab and the concept bank all answer
 * "who sees this" the same way. Three near-identical implementations was the alternative,
 * and they would have drifted — one gaining a case-insensitive compare or a degree/program
 * fallback that the others silently lacked, producing content that reaches a member on one
 * screen and not another for no reason anybody could see.
 *
 * EMPTY MEANS EVERYONE, on every axis. The opposite rule would empty every bank the moment
 * targeting shipped, because nothing written beforehand carries tags. Within one axis the
 * values are OR'd; across axes they are AND'd — so Year 2nd plus Branch CSE means
 * second-year CSE members and nobody else.
 */

import { Schema } from 'mongoose';

export interface IMemberAudience {
  years: string[];
  courses: string[];
  branches: string[];
  roles: string[];
  stages: string[];
}

export const EMPTY_MEMBER_AUDIENCE = (): IMemberAudience => ({
  years: [], courses: [], branches: [], roles: [], stages: [],
});

/** Embeddable definition, so every model spells the same field the same way. */
export const MemberAudienceSchema = {
  years:    { type: [String], default: [] },
  courses:  { type: [String], default: [] },
  branches: { type: [String], default: [] },
  roles:    { type: [String], default: [] },
  stages:   { type: [String], default: [] },
};

export interface AudienceMember {
  yearOfStudy?: string | null;
  degree?: string | null;
  program?: string | null;
  branch?: string | null;
  primaryRole?: string | null;
  secondaryRole?: string | null;
  stage?: string | null;
}

const norm = (v: any): string => String(v ?? '').trim().toLowerCase();

/**
 * One axis holds when it is unconstrained, or when any of the member's values is listed.
 *
 * Comparison is case- and padding-insensitive because these values are typed by admins and
 * chosen by students from lists that have themselves been edited over time. An exact match
 * would fail silently, and silence is the whole problem with targeting bugs: nobody reports
 * content they were never shown.
 */
const axisHolds = (allowed: string[] | undefined, values: (string | null | undefined)[]): boolean => {
  if (!allowed || !allowed.length) return true;
  const want = new Set(allowed.map(norm).filter(Boolean));
  if (!want.size) return true;
  return values.some(v => v && want.has(norm(v)));
};

/** Does this content reach this member? */
export function audienceServes(
  audience: IMemberAudience | undefined | null,
  member: AudienceMember | null | undefined,
): boolean {
  if (!audience) return true;
  const m = member || {};

  // `courses` accepts degree OR program: admins say "B.Tech" and do not reliably know which
  // field onboarding wrote it to, and being wrong about that hides content for everybody.
  if (!axisHolds(audience.years,    [m.yearOfStudy])) return false;
  if (!axisHolds(audience.courses,  [m.degree, m.program])) return false;
  if (!axisHolds(audience.branches, [m.branch])) return false;
  if (!axisHolds(audience.roles,    [m.primaryRole, m.secondaryRole])) return false;
  if (!axisHolds(audience.stages,   [m.stage])) return false;
  return true;
}

/** Read an audience off a request body, keeping only strings and dropping blanks. */
export function readMemberAudience(v: any): IMemberAudience {
  const list = (x: any): string[] =>
    (Array.isArray(x) ? x : []).map(s => String(s ?? '').trim()).filter(Boolean);
  return {
    years:    list(v?.years),
    courses:  list(v?.courses),
    branches: list(v?.branches),
    roles:    list(v?.roles).map(r => r.toUpperCase()),
    stages:   list(v?.stages),
  };
}

/** True when nothing is constrained — used to show "Everyone" rather than an empty list. */
export const audienceIsOpen = (a?: IMemberAudience | null): boolean =>
  !a || (!a.years.length && !a.courses.length && !a.branches.length
    && !a.roles.length && !a.stages.length);

export const audienceSchemaFor = () => new Schema(MemberAudienceSchema, { _id: false });
