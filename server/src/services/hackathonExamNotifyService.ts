import HackathonExam, { IHackathonExam } from '../models/HackathonExam';
import { publicBase } from './hackathonNoticeService';
import HackathonExamAttempt, { IHackathonExamAttempt } from '../models/HackathonExamAttempt';
import Hackathon from '../models/Hackathon';
import { EmailService } from './emailService';
import { sendWhatsAppTemplate } from './assessmentOtpService';
import * as settings from './settingsService';
import { logger } from '../utils/logger';

/**
 * Telling candidates about the exam: the invitation, the reminders before the gun, and the
 * result afterwards.
 *
 * ── WHY EVERY SEND IS FLAGGED ON THE ROW ──────────────────────────────────────────────────
 *
 * The scheduler is a timer, and timers fire twice: a deploy restarts the process mid-window, a
 * tick runs long and overlaps the next. Without a durable record of what has already gone out,
 * eight hundred people get the same WhatsApp four times — which costs real money and is the
 * fastest way to have a template revoked. The flag is written per attempt per reminder, so a
 * reminder added to the config later cannot re-fire the ones already sent.
 *
 * ── AND WHY A FAILED SEND NEVER STOPS THE LOOP ────────────────────────────────────────────
 *
 * One bad phone number must not prevent the other 799 invitations. Each send is caught
 * individually and logged; the flag is only set when it actually succeeded, so a transient
 * failure is retried on the next tick rather than lost.
 */

const emailService = new EmailService();

const examUrl = (token: string): string => {
  /*
   * The same base every other outbound link uses. This resolved through its own key with its
   * own fallback — app.codebegun.com — a host that does not exist and never has, so every
   * exam link ever emailed went to a DNS error while the payment links beside them worked.
   * One resolver now, because two conventions means one of them is wrong and nobody finds out
   * until a candidate cannot open their paper.
   */
  return `${publicBase()}/hackathon-exam/${token}`;
};

const istWhen = (d: Date | string): string =>
  new Date(d).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

/* ── email bodies ──────────────────────────────────────────────────────────── */

const shell = (title: string, body: string): string => `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#eef2f7;padding:28px 12px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e9edf4;border-radius:16px;overflow:hidden">
    <div style="background:linear-gradient(120deg,#0a1a4f,#12276e 55%,#1d4ed8);color:#fff;padding:24px 26px">
      <div style="font-size:12.5px;font-weight:700;color:#c7d2fe;letter-spacing:.4px">CODEBEGUN</div>
      <div style="font-size:21px;font-weight:800;margin-top:6px">${title}</div>
    </div>
    <div style="padding:24px 26px;color:#0f172a;font-size:14.5px;line-height:1.65">${body}</div>
  </div>
</div>`;

const button = (url: string, label: string): string =>
  `<a href="${url}" style="display:inline-block;background:linear-gradient(90deg,#1d4ed8,#4f46e5);color:#fff;text-decoration:none;font-weight:800;padding:13px 22px;border-radius:11px;margin:16px 0">${label}</a>`;

const inviteHtml = (a: IHackathonExamAttempt, exam: IHackathonExam, eventTitle: string): string => shell(
  `${eventTitle} — your exam link`,
  `<p>Hi ${a.memberName},</p>
   <p>Your team <b>${a.teamName}</b> (<code>${a.registrationCode}</code>) is confirmed, and your exam is scheduled.</p>
   <p><b>Starts:</b> ${istWhen(exam.startAt)}<br/>
      <b>You get:</b> ${exam.durationMins} minutes once you begin<br/>
      <b>Questions:</b> ${a.drawnItems.length}</p>
   <p>Everyone on your team sits it at the same time, and each of you gets a different set of
      questions. Your team's result is the average of all ${a.teamName ? 'member' : ''} scores, so
      every member turning up matters.</p>
   ${button(examUrl(a.examToken), 'Open my exam')}
   <p style="color:#64748b;font-size:12.5px">This link is yours alone — it opens your paper and nobody else's.
      You will be asked for a code sent to your mobile before you can start.</p>`,
);

const reminderHtml = (a: IHackathonExamAttempt, exam: IHackathonExam, eventTitle: string, minutesBefore: number): string => {
  const soon = minutesBefore <= 0 ? 'is live now'
    : minutesBefore < 60 ? `starts in ${minutesBefore} minutes`
      : minutesBefore < 1440 ? `starts in ${Math.round(minutesBefore / 60)} hour(s)`
        : `starts in ${Math.round(minutesBefore / 1440)} day(s)`;
  return shell(
    minutesBefore <= 0 ? `${eventTitle} is live` : `${eventTitle} ${soon}`,
    `<p>Hi ${a.memberName},</p>
     <p>Your exam ${soon}.</p>
     <p><b>${istWhen(exam.startAt)}</b><br/>${exam.durationMins} minutes · ${a.drawnItems.length} questions</p>
     ${button(examUrl(a.examToken), minutesBefore <= 0 ? 'Start now' : 'Open my exam')}
     <p style="color:#64748b;font-size:12.5px">Have your mobile with you — a code is sent to it before you can start.</p>`,
  );
};

const resultHtml = (a: IHackathonExamAttempt, eventTitle: string, teamScore: number, members: number): string => shell(
  `${eventTitle} — your result`,
  `<p>Hi ${a.memberName},</p>
   <p><b>Your score:</b> ${a.score ?? 0} / ${a.totalMarks ?? 0} (${a.percentage ?? 0}%)<br/>
      <b>Time taken:</b> ${Math.round((a.timeSpentSec || 0) / 60)} minutes</p>
   <p><b>Team ${a.teamName}:</b> ${teamScore} — the average across all ${members} registered member(s).</p>
   ${button(examUrl(a.examToken) + '/result', 'See my result')}
   <p style="color:#64748b;font-size:12.5px">Thanks for taking part.</p>`,
);

/* ── sending ───────────────────────────────────────────────────────────────── */

type Channel = 'email' | 'whatsapp';

interface SendCounts { email: number; whatsapp: number; failed: number }

async function deliver(
  a: IHackathonExamAttempt,
  channels: Channel[],
  subject: string,
  html: string,
  waBody: string[],
  purpose: string,
  counts: SendCounts,
): Promise<{ email: boolean; whatsapp: boolean }> {
  const done = { email: false, whatsapp: false };

  if (channels.includes('email') && a.memberEmail) {
    try {
      await emailService.sendGenericEmail(a.memberEmail, subject, html);
      done.email = true; counts.email++;
    } catch (e: any) {
      counts.failed++;
      logger.warn('hackathon exam email failed', { to: a.memberEmail, error: e?.message });
    }
  }

  if (channels.includes('whatsapp') && a.memberMobile) {
    try {
      const r = await sendWhatsAppTemplate(String(a.tenantId), a.memberMobile, {
        body: waBody, urlButtonParam: a.examToken, purpose,
      });
      if (r.ok) { done.whatsapp = true; counts.whatsapp++; }
      else { counts.failed++; logger.warn('hackathon exam whatsapp failed', { to: a.memberMobile, error: r.error }); }
    } catch (e: any) {
      counts.failed++;
      logger.warn('hackathon exam whatsapp threw', { to: a.memberMobile, error: e?.message });
    }
  }

  return done;
}

/**
 * Send the exam link to everyone who has not had it.
 *
 * Skips anyone already invited on that channel, so pressing the button twice — or pressing it
 * again after more teams register — reaches only the people who still need it.
 */
export async function sendInvitations(exam: IHackathonExam): Promise<SendCounts & { skipped: number }> {
  const h = await Hackathon.findById(exam.hackathonId).lean() as any;
  const eventTitle = h?.title || exam.title;
  const channels = (exam.inviteChannels || []) as Channel[];
  const counts: SendCounts = { email: 0, whatsapp: 0, failed: 0 };
  let skipped = 0;

  const pending = await HackathonExamAttempt.find({
    examId: exam._id,
    $or: [
      ...(channels.includes('email') ? [{ 'invitesSent.email': { $ne: true } }] : []),
      ...(channels.includes('whatsapp') ? [{ 'invitesSent.whatsapp': { $ne: true } }] : []),
    ],
  }).limit(5000);

  for (const a of pending) {
    const need = channels.filter(c => !a.invitesSent?.[c]);
    if (!need.length) { skipped++; continue; }

    const done = await deliver(
      a, need,
      `${eventTitle} — your exam link`,
      inviteHtml(a, exam, eventTitle),
      [a.memberName, eventTitle, istWhen(exam.startAt)],
      'hackathon_exam_invite',
      counts,
    );

    if (done.email) a.invitesSent.email = true;
    if (done.whatsapp) a.invitesSent.whatsapp = true;
    if (done.email || done.whatsapp) await a.save();
  }

  return { ...counts, skipped };
}

/**
 * Send one candidate's invitation again, whether or not they have already had it.
 *
 * sendInvitations deliberately skips anyone already invited — pressing it twice must not
 * message eight hundred people twice. That is right for the bulk button and useless for the
 * case this exists for: the first invitation went out and was wrong, or never arrived, and
 * the one person who needs it is the one the bulk send will now always skip.
 *
 * So this takes one attempt and ignores the flag. It goes through the same deliver() as the
 * bulk send rather than composing its own message — a candidate who lost their link should
 * get back exactly what everyone else got, not an admin-flavoured variant that drifts.
 */
export async function resendInvitation(
  exam: IHackathonExam,
  attempt: IHackathonExamAttempt,
): Promise<SendCounts> {
  const h = await Hackathon.findById(exam.hackathonId).lean() as any;
  const eventTitle = h?.title || exam.title;
  const channels = (exam.inviteChannels || []) as Channel[];
  const counts: SendCounts = { email: 0, whatsapp: 0, failed: 0 };

  const done = await deliver(
    attempt, channels,
    `${eventTitle} — your exam link`,
    inviteHtml(attempt, exam, eventTitle),
    [attempt.memberName, eventTitle, istWhen(exam.startAt)],
    'hackathon_exam_invite',
    counts,
  );

  if (done.email) attempt.invitesSent.email = true;
  if (done.whatsapp) attempt.invitesSent.whatsapp = true;
  if (done.email || done.whatsapp) await attempt.save();

  return counts;
}

/**
 * Fire any reminder whose moment has arrived.
 *
 * Each configured offset is its own flag, keyed by the offset itself. Five reminders the day
 * before is five entries, and each fires exactly once per candidate however many times the
 * scheduler ticks or the process restarts.
 */
export async function fireDueReminders(now = new Date()): Promise<{ sent: number; byOffset: Record<string, number> }> {
  const live = await HackathonExam.find({
    status: { $in: ['ready', 'live'] },
    endAt: { $gte: now },
  });

  let sent = 0;
  const byOffset: Record<string, number> = {};

  for (const exam of live) {
    const h = await Hackathon.findById(exam.hackathonId).lean() as any;
    const eventTitle = h?.title || exam.title;
    const startMs = new Date(exam.startAt).getTime();

    for (const r of exam.reminders || []) {
      const dueAt = startMs - r.minutesBefore * 60_000;
      /*
       * A ten-minute window, not an instant. A scheduler ticking every few minutes would
       * otherwise step straight over the exact moment and the reminder would never go.
       */
      if (now.getTime() < dueAt || now.getTime() > dueAt + 10 * 60_000) continue;

      const flag = `r${r.minutesBefore}`;
      const pending = await HackathonExamAttempt.find({
        examId: exam._id,
        status: { $in: ['invited', 'verified'] },
        remindersSent: { $ne: flag },
      }).limit(2000);

      const counts: SendCounts = { email: 0, whatsapp: 0, failed: 0 };
      for (const a of pending) {
        const done = await deliver(
          a, (r.channels || ['email']) as Channel[],
          r.minutesBefore <= 0 ? `🔴 ${eventTitle} is live` : `Reminder: ${eventTitle}`,
          reminderHtml(a, exam, eventTitle, r.minutesBefore),
          [a.memberName, eventTitle, istWhen(exam.startAt)],
          'hackathon_exam_reminder',
          counts,
        );
        if (done.email || done.whatsapp) {
          a.remindersSent.push(flag);
          await a.save();
          sent++;
          byOffset[flag] = (byOffset[flag] || 0) + 1;
        }
      }
    }
  }

  if (sent) logger.info('hackathon exam reminders sent', { sent, byOffset });
  return { sent, byOffset };
}

/**
 * Send results, once an admin has published.
 *
 * Refuses on an unpublished exam rather than quietly doing nothing — sending a score before
 * the leaderboard is final is not recoverable.
 */
export async function sendResults(exam: IHackathonExam): Promise<SendCounts & { skipped: number }> {
  if (exam.status !== 'published' || !exam.publishedAt) {
    throw new Error('Publish the results before sending them.');
  }

  const h = await Hackathon.findById(exam.hackathonId).lean() as any;
  const eventTitle = h?.title || exam.title;
  const channels = (exam.resultChannels || []) as Channel[];
  const counts: SendCounts = { email: 0, whatsapp: 0, failed: 0 };
  let skipped = 0;

  const { computeTeamResult } = await import('./hackathonExamGradingService');

  const all = await HackathonExamAttempt.find({ examId: exam._id }).limit(5000);
  const byTeam = new Map<string, IHackathonExamAttempt[]>();
  for (const a of all) byTeam.set(a.registrationCode, [...(byTeam.get(a.registrationCode) || []), a]);

  for (const [, members] of byTeam) {
    const team = computeTeamResult(exam, members);
    for (const a of members) {
      const need = channels.filter(c => !a.resultSent?.[c]);
      if (!need.length) { skipped++; continue; }

      const done = await deliver(
        a, need,
        `${eventTitle} — your result`,
        resultHtml(a, eventTitle, team.teamScore, team.registeredMembers),
        [a.memberName, eventTitle, `${a.score ?? 0}/${a.totalMarks ?? 0}`],
        'hackathon_exam_result',
        counts,
      );
      if (done.email) a.resultSent.email = true;
      if (done.whatsapp) a.resultSent.whatsapp = true;
      if (done.email || done.whatsapp) await a.save();
    }
  }

  return { ...counts, skipped };
}
