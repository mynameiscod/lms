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

/**
 * The invitation email.
 *
 * ── WHY IT IS A WHOLE DOCUMENT AND ALL TABLES ─────────────────────────────────────────────
 *
 * Not because tables are nice, but because Outlook still lays out with Word and float and
 * flex do nothing there. The <style> block carries only the mobile stacking rules; every
 * colour, size and spacing is inline, so a client that drops the block still renders the
 * whole thing correctly — it just stops stacking on a narrow screen.
 *
 * ── ONLY IMAGES THAT EXIST ────────────────────────────────────────────────────────────────
 *
 * The design called for four illustrations. We have two real assets — our logo and whatever
 * artwork the event set — so the rest is done in type and colour rather than with <img> tags
 * pointing at files nobody uploaded. A broken image in an invitation reads as a broken
 * invitation, and the one thing this email must never do is look untrustworthy: it is asking
 * somebody to click a link and prove their identity.
 *
 * Every value that came from a person is escaped. A team is named by whoever registered it.
 */
const esc = (v: unknown): string => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const istDate = (d: Date | string): string =>
  new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
const istTime = (d: Date | string): string =>
  new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });

const LOGO = 'https://platform.codebegun.com/assets/logo.png';

const statCell = (bg: string, icon: string, label: string, value: string, last = false): string => `
  <td class="stat" width="25%" align="center" valign="top" style="padding:18px 8px;${last ? '' : 'border-right:1px solid #d9e4f2;'}">
    <div style="width:46px;height:46px;border-radius:50%;background:${bg};margin:0 auto 9px;line-height:46px;font-size:22px;">${icon}</div>
    <div style="font-size:12px;font-weight:800;color:#102b70;">${label}</div>
    <div style="margin-top:7px;font-size:12.5px;line-height:1.45;color:#27375d;">${value}</div>
  </td>`;

const featureCell = (icon: string, text: string, last = false): string => `
  <td class="feature-col" width="25%" valign="middle" style="padding:15px 12px;${last ? '' : 'border-right:1px solid #dbe5f1;'}">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="font-size:24px;padding-right:10px;">${icon}</td>
      <td style="font-size:11px;line-height:1.4;font-weight:800;color:#203462;">${text}</td>
    </tr></table>
  </td>`;

const inviteHtml = (
  a: IHackathonExamAttempt, exam: IHackathonExam, eventTitle: string, bannerUrl?: string,
): string => {
  const url = examUrl(a.examToken);
  const title = esc(eventTitle);
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
<title>${title} — your exam link</title>
<style>
  html,body{margin:0!important;padding:0!important;width:100%!important;background:#eef4fa;}
  table{border-collapse:separate;border-spacing:0;}
  img{border:0;outline:none;text-decoration:none;display:block;}
  a{text-decoration:none;}
  @media screen and (max-width:640px){
    .container{width:100%!important;max-width:100%!important;}
    .mobile-block{display:block!important;width:100%!important;}
    .mobile-hide{display:none!important;}
    .px{padding-left:18px!important;padding-right:18px!important;}
    .hero-left{padding:26px 22px!important;}
    .stat{display:inline-block!important;width:48%!important;border-right:0!important;margin-bottom:10px!important;}
    .feature-col{display:inline-block!important;width:48%!important;border-right:0!important;margin-bottom:10px!important;}
    .footer-col{display:block!important;width:100%!important;text-align:center!important;padding:10px 0!important;border-left:0!important;}
    .headline{font-size:27px!important;}
    .brand-right{display:none!important;}
  }
</style></head>
<body style="margin:0;padding:0;background:#eef4fa;font-family:Arial,Helvetica,sans-serif;color:#10265d;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
  Your ${title} exam link is ready — ${esc(istDate(exam.startAt))}, ${esc(istTime(exam.startAt))}.
</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#eef4fa;">
<tr><td align="center" style="padding:24px 10px 32px;">
  <table role="presentation" class="container" width="720" cellpadding="0" cellspacing="0" border="0"
         style="width:720px;max-width:720px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 32px rgba(14,44,98,.08);">

    <!-- brand -->
    <tr><td class="px" style="padding:24px 28px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="mobile-block" width="48%" valign="middle">
          <a href="https://codebegun.com/" target="_blank"><img src="${LOGO}" width="210" alt="CodeBegun" style="width:100%;max-width:210px;height:auto;"></a>
        </td>
        <td class="brand-right" width="52%" align="right" valign="middle">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:1.1;font-style:italic;color:#11326f;">
            Your Career<br><span style="color:#1ca9ba;">Co-Pilot</span>
          </div>
        </td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;"><tr>
        <td width="30%"><div style="height:1px;background:#b7c7df;"></div></td>
        <td align="center" style="padding:0 12px;font-size:10px;font-weight:700;letter-spacing:1.6px;color:#4d6590;white-space:nowrap;">POWERED BY CODEBEGUN + CAREERPILOT</td>
        <td width="30%"><div style="height:1px;background:#b7c7df;"></div></td>
      </tr></table>
    </td></tr>

    <!-- hero -->
    <tr><td class="px" style="padding:0 22px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="background:#0a2b70;background-image:linear-gradient(135deg,#08265f 0%,#0c3ca5 64%,#139fb0 100%);border-radius:18px;overflow:hidden;">
        <tr><td class="hero-left" valign="middle" style="padding:30px 26px;color:#ffffff;">
          <div style="font-size:12.5px;font-weight:800;letter-spacing:.7px;color:#9fd6ff;">CODEBEGUN</div>
          <div class="headline" style="font-size:32px;line-height:1.15;font-weight:800;letter-spacing:-.6px;margin-top:11px;">${title}</div>
          <div style="font-size:14px;letter-spacing:3.4px;color:#62dced;margin-top:11px;">YOUR EXAM LINK IS READY</div>
          <div style="width:58px;height:4px;border-radius:6px;background:#2bd3df;margin-top:17px;"></div>
          <div style="font-size:17px;font-weight:700;margin-top:18px;">Code Today, Build Tomorrow.</div>
        </td></tr>
      </table>
    </td></tr>

    <!-- greeting + stats -->
    <tr><td class="px" style="padding:22px 28px 0;">
      <div style="font-size:26px;line-height:1.2;font-weight:800;color:#102b70;">Hi ${esc(a.memberName)},</div>
      <div style="margin-top:8px;font-size:16px;line-height:1.55;color:#1a2b57;">
        Your team <strong>${esc(a.teamName)}</strong> (${esc(a.registrationCode)}) is confirmed, and your exam is scheduled.
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:18px;background:#f4f8fd;border-radius:16px;"><tr>
        ${statCell('#d9efff', '&#128197;', 'Start date', esc(istDate(exam.startAt)))}
        ${statCell('#d9f7f3', '&#128336;', 'Start time', esc(istTime(exam.startAt)))}
        ${statCell('#ece7ff', '&#8987;', 'Duration', `${exam.durationMins} minutes<br>(once you begin)`)}
        ${statCell('#fff0d8', '&#128196;', 'Questions', `<span style="font-size:18px;font-weight:800;">${a.drawnItems.length}</span>`, true)}
      </tr></table>

      <div style="margin-top:18px;font-size:15px;line-height:1.65;color:#24355f;">
        Everyone on your team sits it at the same time, and each of you gets a different set of
        questions. Your team&rsquo;s result is the average of all member scores, so every member
        turning up matters.
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;"><tr><td align="center">
        <a href="${url}" target="_blank"
           style="display:inline-block;min-width:240px;padding:15px 26px;border-radius:12px;background:#0c45b3;background-image:linear-gradient(90deg,#0d47b8 0%,#1ca7b8 100%);font-size:18px;line-height:1;font-weight:800;color:#ffffff;">
          Open my exam &nbsp;&rarr;
        </a>
      </td></tr></table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;"><tr>
        <td width="26" valign="top" align="center" style="font-size:16px;">&#128274;</td>
        <td style="font-size:12px;line-height:1.5;color:#5d6d8a;">
          This link is yours alone &mdash; it opens your paper and nobody else&rsquo;s.<br>
          You will be asked for a code sent to your mobile before you can start.
        </td>
      </tr></table>
    </td></tr>
${bannerUrl ? `
    <!-- event artwork, only when the event actually set one -->
    <tr><td class="px" style="padding:20px 28px 0;">
      <img src="${esc(bannerUrl)}" alt="" width="664" style="width:100%;max-width:664px;height:auto;border-radius:14px;">
    </td></tr>` : ''}

    <!-- what this is -->
    <tr><td class="px" style="padding:20px 28px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f9fd;border-radius:14px;"><tr>
        ${featureCell('&#128737;', 'Fair &amp; Secure<br>Exam Environment')}
        ${featureCell('&#128101;', 'Team Performance<br>Matters')}
        ${featureCell('&#127919;', 'Real-World<br>Problem Solving')}
        ${featureCell('&#127942;', 'Learn. Compete.<br>Grow Together.', true)}
      </tr></table>
    </td></tr>

    <!-- footer -->
    <tr><td class="px" style="padding:20px 28px 26px;">
      <div style="height:1px;background:#c8d7ea;margin-bottom:16px;"></div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td class="footer-col" width="60%" valign="middle">
          <div style="font-size:13px;line-height:1.55;color:#42547b;">
            Thanks for being part of the <strong>CodeBegun community.</strong><br>
            Let&rsquo;s build a better, brighter future &mdash; together.
          </div>
          <div style="margin-top:10px;font-size:15px;font-weight:800;color:#102b70;">Team CodeBegun</div>
          <div style="margin-top:3px;font-size:11px;color:#506387;">Software Training &amp; Career Solutions</div>
        </td>
        <td class="footer-col" width="40%" valign="middle" align="right" style="border-left:1px solid #cad8e9;padding-left:16px;">
          <div style="font-size:12px;font-weight:700;color:#254273;">
            <a href="https://codebegun.com/" style="color:#254273;">CodeBegun</a> &nbsp;&bull;&nbsp;
            <a href="https://careerpilot.codebegun.com/" style="color:#1599a9;">CareerPilot</a>
          </div>
          <div style="margin-top:11px;font-size:10px;letter-spacing:1.3px;font-weight:700;color:#687aa0;">TRAIN &nbsp;|&nbsp; PRACTICE &nbsp;|&nbsp; PLACEMENTS</div>
        </td>
      </tr></table>
    </td></tr>

  </table>
</td></tr></table>
</body></html>`;
};

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
   ${button(examUrl(a.examToken), 'Open my exam page')}
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
export async function sendInvitations(
  exam: IHackathonExam,
  opts: { resend?: boolean } = {},
): Promise<SendCounts & { skipped: number }> {
  const h = await Hackathon.findById(exam.hackathonId).lean() as any;
  const eventTitle = h?.title || exam.title;
  const channels = (exam.inviteChannels || []) as Channel[];
  const counts: SendCounts = { email: 0, whatsapp: 0, failed: 0 };
  let skipped = 0;

  /*
   * `resend` sends to everyone again, flags and all.
   *
   * Skipping the already-invited is the right default — a double click must not message a
   * cohort twice. It is the wrong behaviour when the first batch was wrong, which has now
   * happened twice: once with a stray {{1}} in the link and once with a host that did not
   * exist. The operator decides which of those they are doing; the screen asks them, and
   * tells them how many people it is about to message.
   */
  const pending = await HackathonExamAttempt.find(
    opts.resend
      ? { examId: exam._id }
      : {
        examId: exam._id,
        $or: [
          ...(channels.includes('email') ? [{ 'invitesSent.email': { $ne: true } }] : []),
          ...(channels.includes('whatsapp') ? [{ 'invitesSent.whatsapp': { $ne: true } }] : []),
        ],
      },
  ).limit(5000);

  for (const a of pending) {
    const need = opts.resend ? channels : channels.filter(c => !a.invitesSent?.[c]);
    if (!need.length) { skipped++; continue; }

    const done = await deliver(
      a, need,
      `${eventTitle} — your exam link`,
      inviteHtml(a, exam, eventTitle, h?.bannerUrl),
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
    inviteHtml(attempt, exam, eventTitle, h?.bannerUrl),
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
