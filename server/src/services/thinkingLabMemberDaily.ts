/**
 * Which Thinking Lab problem a CareerPilot member gets today.
 *
 * LMS students are served by their batch: an admin schedules a problem for the batch, or the
 * batch's lab track resolves the day. A CareerPilot member has no batch, so that path finds
 * nothing and used to answer "No challenge scheduled yet" for ever. This is the member's rule:
 *
 *   - The bank is the tenant's active problems tagged for CareerPilot, in curriculum order
 *     (`order` ascending; unnumbered problems after the numbered ones, oldest first).
 *   - One new problem per calendar day (IST). The controller only asks for a pick when the
 *     member has no challenge dated today, so revisiting the page never hands out another.
 *   - The pick is the first problem in that order the member has been given the FEWEST times.
 *     While anything is new that means "the next one they have not had yet" — a missed day
 *     does not skip a problem. Once every problem has been given, the counts are all equal
 *     and the sequence starts again from the top: the bank cycles.
 *
 * Pure, so the rule is tested without a database.
 */

export interface MemberBankItem {
  id: string;
  order?: number | null;
  createdAt?: Date | string | null;
}

/** The bank in the order a member meets it. Does not mutate its input. */
export function curriculumOrder<T extends MemberBankItem>(bank: T[]): T[] {
  const ord = (x: MemberBankItem) => (typeof x.order === 'number' && Number.isFinite(x.order) ? x.order : Number.POSITIVE_INFINITY);
  const time = (x: MemberBankItem) => (x.createdAt ? new Date(x.createdAt).getTime() : 0);
  return [...bank].sort((a, b) =>
    (ord(a) - ord(b)) || (time(a) - time(b)) || (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0));
}

/**
 * @param bank       the member's bank (any order)
 * @param givenIds   problem ids of every challenge the member has ever been given, one entry
 *                   per challenge (repeats allowed — a cycled problem appears twice)
 * @returns the id to serve, or null when the bank is empty
 */
export function pickMemberProblem(bank: MemberBankItem[], givenIds: string[]): string | null {
  if (!bank.length) return null;
  const times = new Map<string, number>();
  for (const id of givenIds) times.set(String(id), (times.get(String(id)) || 0) + 1);
  let best: MemberBankItem | null = null;
  let bestTimes = Number.POSITIVE_INFINITY;
  for (const p of curriculumOrder(bank)) {
    const t = times.get(String(p.id)) || 0;
    if (t < bestTimes) { best = p; bestTimes = t; }
  }
  return best ? String(best.id) : null;
}

/** 1-based position of a problem in the member's sequence, for "Problem 4 of 30". */
export function positionInBank(bank: MemberBankItem[], id: string): number {
  const i = curriculumOrder(bank).findIndex(p => String(p.id) === String(id));
  return i < 0 ? 0 : i + 1;
}
