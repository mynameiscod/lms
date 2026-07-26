import TechBattle from '../models/TechBattle';
import BattleRegistration from '../models/BattleRegistration';
import { EmailService } from '../services/emailService';
import * as settings from '../services/settingsService';

// Automatic Tech Battle reminders — no admin action. Sends 24h-before, 1h-before, and
// "live now" emails with the exam link to verified registrants who haven't been notified
// for that milestone yet.

const emailService = new EmailService();
const examUrl = (tenantId: string, token: string) =>
  settings.getStr('PUBLIC_SITE_URL', 'https://platform.codebegun.com', tenantId).replace(/\/+$/, '') + '/battles/exam/' + token;

function reminderHtml(name: string, title: string, when: string, url: string, kind: 't24' | 't1' | 'live') {
  const head = kind === 'live' ? `🔴 ${title} is LIVE now!` : kind === 't1' ? `⏰ ${title} starts in 1 hour` : `📅 ${title} is tomorrow`;
  const line = kind === 'live' ? 'your exam is open — go now!' : `it opens at <b>${when} IST</b>.`;
  const cta = kind === 'live' ? 'Start my exam now' : 'Open my exam';
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto">
    <h2 style="color:#1d4ed8">${head}</h2>
    <p>Hi ${name}, ${line}</p>
    <p><a href="${url}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700">${cta}</a></p>
    <p style="color:#64748b;font-size:13px">One attempt · single device. Good luck! 🚀</p>
  </div>`;
}

export async function fireBattleReminders(): Promise<number> {
  const now = Date.now();
  const battles = await TechBattle.find({
    status: 'live',
    endAt: { $gte: new Date(now) },
    startAt: { $lte: new Date(now + 25 * 3600 * 1000) },
  }).lean();

  let sent = 0;
  for (const b of battles as any[]) {
    const msToStart = new Date(b.startAt).getTime() - now;
    let kind: 't24' | 't1' | 'live' | null = null;
    if (msToStart <= 0) kind = 'live';
    else if (msToStart <= 65 * 60 * 1000) kind = 't1';                          // within ~1h
    else if (msToStart > 23 * 3600 * 1000 && msToStart <= 25 * 3600 * 1000) kind = 't24'; // ~24h out
    if (!kind) continue;

    const flag = `remindersSent.${kind}`;
    const regs = await BattleRegistration.find({
      battleId: b._id, verified: true, status: { $ne: 'submitted' }, [flag]: { $ne: true },
    }).select('name email examToken tenantId').limit(2000);

    const when = new Date(b.startAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    for (const r of regs) {
      try {
        const html = reminderHtml(r.name, b.title, when, examUrl(r.tenantId, r.examToken), kind);
        await emailService.sendGenericEmail(r.email, kind === 'live' ? `🔴 LIVE: ${b.title}` : `Reminder: ${b.title}`, html);
        await BattleRegistration.updateOne({ _id: r._id }, { $set: { [flag]: true } });
        sent++;
      } catch { /* keep going */ }
    }
  }
  if (sent > 0) console.log(`🔔 Tech Battle reminders sent: ${sent}`);
  return sent;
}

/** Scheduler — runs every 2 minutes. */
export function startBattleReminderScheduler(): NodeJS.Timeout {
  const handle = setInterval(async () => {
    try { await fireBattleReminders(); } catch (e) { console.error('[battle-reminder] run failed', e); }
  }, 2 * 60 * 1000);
  console.log('🔔 Tech Battle reminder scheduler started (every 2 min)');
  return handle;
}
