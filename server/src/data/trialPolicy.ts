/**
 * CareerPilot TRIALS — limited access for a chosen student, for a set number of days.
 *
 * A complimentary grant is a membership nobody paid for: everything opens. A trial is not a
 * membership. It is its own record (`passport.trial`) saying which parts of CareerPilot this
 * student may use and how much of each, until it ends. When it ends, or an admin ends it, the
 * student is back to what any free sign-up sees; everything they did stays theirs.
 *
 * FAILS CLOSED. A trial never sets `passport.active`, so any code that asks "is this a member?"
 * gets no. Only code that knows about trials (isEntitled and the counted limits) opens anything
 * for them — a screen nobody taught about trials shows a lock, never free full access.
 *
 * NO MONEY, NO SKILL. A trial changes what can be opened, nothing else.
 */

/** One thing a trial can open, and what its number counts when it has one. */
export interface TrialItem {
  key: TrialItemKey;
  label: string;
  /** The tenant's entitlement keys this item opens (PassportConfig.entitlements). */
  features: string[];
  /** What the limit counts. Absent = on or off only. */
  limit?: { unit: string; hint: string };
  icon: string;
}

export type TrialItemKey =
  | 'journey' | 'practice' | 'interview' | 'communication' | 'thinkingLab'
  | 'resume' | 'companies' | 'codingSets' | 'playground' | 'experiences'
  | 'questionBooks' | 'mentor' | 'news' | 'industry' | 'profile';

export const TRIAL_ITEMS: TrialItem[] = [
  { key: 'journey', label: 'Journey classes', features: ['roadmap_full', 'daily_missions'], icon: 'bi-calendar2-week',
    limit: { unit: 'days', hint: 'The first days of their journey. Day 1 to this number open; the rest stay locked.' } },
  { key: 'practice', label: 'Practice problems', features: ['practice'], icon: 'bi-code-slash',
    limit: { unit: 'problems', hint: 'How many problems their Practice page shows. They can solve only these.' } },
  { key: 'interview', label: 'Mock interviews', features: ['mock_interview'], icon: 'bi-mic',
    limit: { unit: 'interviews', hint: 'Each interview they start counts, finished or not.' } },
  { key: 'communication', label: 'Communication Lab', features: ['communication_lab'], icon: 'bi-chat-quote',
    limit: { unit: 'recordings', hint: 'Each recording they send for feedback counts.' } },
  { key: 'thinkingLab', label: 'Thinking Lab', features: ['thinking_lab'], icon: 'bi-lightbulb',
    limit: { unit: 'challenges', hint: 'Each new challenge they are given counts.' } },
  { key: 'resume', label: 'Resume Center', features: ['resume'], icon: 'bi-file-earmark-person' },
  { key: 'companies', label: 'Company questions & mock tests', features: ['company_questions'], icon: 'bi-building' },
  { key: 'codingSets', label: 'Coding Sets', features: ['coding_sets'], icon: 'bi-collection' },
  { key: 'playground', label: 'Code Playground', features: ['code_playground'], icon: 'bi-terminal' },
  { key: 'experiences', label: 'Interview Experiences', features: ['interview_experiences'], icon: 'bi-people' },
  { key: 'questionBooks', label: 'Question Books', features: ['question_books'], icon: 'bi-journal-text' },
  { key: 'mentor', label: 'AI Mentor', features: ['ai_mentor'], icon: 'bi-robot' },
  { key: 'news', label: 'Tech News', features: ['tech_news'], icon: 'bi-newspaper' },
  { key: 'industry', label: 'Industry Connect', features: ['industry_connect'], icon: 'bi-briefcase' },
  { key: 'profile', label: 'CareerPilot Profile', features: ['career_passport'], icon: 'bi-person-badge' },
];

export const TRIAL_ITEM_KEYS = TRIAL_ITEMS.map(i => i.key);
export const TRIAL_MAX_DAYS = 90;
export const TRIAL_MAX_LIMIT = 10_000;

/** One item's setting: off, on without a limit (limit null), or on up to `limit`. */
export interface TrialItemSetting { on: boolean; limit: number | null }
export type TrialItems = Partial<Record<TrialItemKey, TrialItemSetting>>;

/** The trial as stored on a member (passport.trial). Items are a copy of the plan when it was given. */
export interface MemberTrial {
  planId?: any; planName?: string;
  startedAt?: Date | string; endsAt?: Date | string; endedAt?: Date | string | null;
  convertedAt?: Date | string | null;
  items?: TrialItems;
  practiceIds?: any[];
  /** The plan named its problems: practiceIds is exactly those. */
  practicePicked?: boolean;
}

/** How many problems one plan may name. */
export const TRIAL_MAX_PICKED = 500;

const paidNow = (passport: any, now: Date) =>
  !!passport?.active && (!passport?.expiresAt || new Date(passport.expiresAt).getTime() >= now.getTime());

/** Running now: started, not past its end, not ended by an admin, and not superseded by a paid membership. */
export function trialActive(passport: any, now: Date = new Date()): boolean {
  const t: MemberTrial | undefined = passport?.trial;
  if (!t?.startedAt || !t?.endsAt || t.endedAt) return false;
  if (paidNow(passport, now)) return false;
  const n = now.getTime();
  return new Date(t.startedAt).getTime() <= n && n < new Date(t.endsAt).getTime();
}

/** This item's setting for a member on a running trial; null when they are not on one. */
export function trialItem(passport: any, key: TrialItemKey, now: Date = new Date()): TrialItemSetting | null {
  if (!trialActive(passport, now)) return null;
  const s = (passport.trial.items || {})[key];
  return s ? { on: !!s.on, limit: s.limit === null || s.limit === undefined ? null : Number(s.limit) } : { on: false, limit: null };
}

/** Does a running trial open this entitlement key? False when not on a trial. */
export function trialAllowsFeature(passport: any, featureKey: string, now: Date = new Date()): boolean {
  if (!trialActive(passport, now)) return false;
  const item = TRIAL_ITEMS.find(i => i.features.includes(featureKey));
  if (!item) return false;
  const s = trialItem(passport, item.key, now);
  return !!s?.on && (s.limit === null || s.limit > 0);
}

/**
 * A plan's items from an admin's form, cleaned: every known item present, unknown ones dropped, a
 * limit only where the item counts something. Returns the reason when something is wrong.
 */
export function cleanTrialItems(raw: any): { items: TrialItems } | { error: string } {
  const items: TrialItems = {};
  for (const it of TRIAL_ITEMS) {
    const r = raw?.[it.key] || {};
    const on = !!r.on;
    let limit: number | null = null;
    if (it.limit && on && r.limit !== null && r.limit !== undefined && r.limit !== '') {
      const n = Number(r.limit);
      if (!Number.isInteger(n) || n < 1 || n > TRIAL_MAX_LIMIT) return { error: `${it.label}: the limit must be a whole number from 1 to ${TRIAL_MAX_LIMIT.toLocaleString('en-IN')}, or empty for no limit.` };
      limit = n;
    }
    items[it.key] = { on, limit };
  }
  return { items };
}

/** Why something is refused for a trial member, as the client is told. */
export const TRIAL_LIMIT_CODE = 'TRIAL_LIMIT';
