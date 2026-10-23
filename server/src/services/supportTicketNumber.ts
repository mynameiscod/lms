import SupportCounter from '../models/SupportCounter';

/**
 * Ticket numbers a person can read out on a call: SUP-26-00042.
 *
 * One series per year (Indian calendar year), shared by every college, so a number identifies a
 * ticket on its own when the support HQ looks across tenants. The counter is advanced with a
 * single atomic findOneAndUpdate($inc), which is what makes it safe when many tickets are raised
 * at once; the only race left is two requests creating the year's counter at the same moment,
 * where the loser hits the unique _id and simply tries again.
 */
export const yearOf = (d: Date): string =>
  new Intl.DateTimeFormat('en-IN', { year: '2-digit', timeZone: 'Asia/Kolkata' }).format(d);

export const formatTicketNumber = (yy: string, seq: number): string => `SUP-${yy}-${String(seq).padStart(5, '0')}`;

export async function nextTicketNumber(now = new Date()): Promise<string> {
  const yy = yearOf(now);
  const key = `ticket:${yy}`;
  for (let attempt = 0; ; attempt++) {
    try {
      const c = await SupportCounter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { upsert: true, new: true }).lean();
      return formatTicketNumber(yy, c!.seq);
    } catch (e: any) {
      if (e?.code === 11000 && attempt < 3) continue;
      throw e;
    }
  }
}
