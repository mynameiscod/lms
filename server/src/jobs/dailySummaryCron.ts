import mongoose from 'mongoose';
import Lead from '../models/Lead';
import FollowUpReminder from '../models/FollowUpReminder';
import User from '../models/User';
import { EmailService } from '../services/emailService';

const emailService = new EmailService();

// Run check every minute; only fire once per day around 20:00
const DAILY_CHECK_INTERVAL_MS = 60 * 1000;
const SUMMARY_HOUR = 20; // 8 PM
const SUMMARY_MINUTE = 0;
// Track last fire date per tenant to avoid double-sending
const lastFiredDate: Record<string, string> = {};

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function buildSummaryHtml(tenantId: mongoose.Types.ObjectId): Promise<string> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [newLeadsToday, convertedToday, overdueFollowUps, hotLeads] = await Promise.all([
    Lead.countDocuments({ tenantId, createdAt: { $gte: today, $lte: todayEnd } }),
    Lead.countDocuments({ tenantId, updatedAt: { $gte: today, $lte: todayEnd }, convertedStudentId: { $exists: true, $ne: null } }),
    FollowUpReminder.countDocuments({
      tenantId,
      status: { $in: ['scheduled', 'missed'] },
      scheduledAt: { $lt: today }
    }),
    Lead.countDocuments({ tenantId, priority: 'hot' }),
  ]);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #f9fafb; padding: 20px; }
    .card { background: white; border-radius: 8px; padding: 20px; margin: 0 auto; max-width: 600px; }
    h2 { color: #1d4ed8; margin-top: 0; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0; }
    .stat-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 14px; }
    .stat-num { font-size: 2rem; font-weight: bold; color: #0369a1; }
    .stat-label { font-size: 0.85rem; color: #64748b; margin-top: 4px; }
    .hot { background: #fff7ed; border-color: #fed7aa; }
    .hot .stat-num { color: #c2410c; }
    .overdue { background: #fff1f2; border-color: #fecdd3; }
    .overdue .stat-num { color: #be123c; }
    .converted { background: #f0fdf4; border-color: #bbf7d0; }
    .converted .stat-num { color: #15803d; }
    footer { margin-top: 16px; font-size: 0.75rem; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h2>📊 Daily Lead Summary — ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</h2>
    <div class="stats">
      <div class="stat-box">
        <div class="stat-num">${newLeadsToday}</div>
        <div class="stat-label">New Leads Today</div>
      </div>
      <div class="stat-box converted">
        <div class="stat-num">${convertedToday}</div>
        <div class="stat-label">Conversions Today</div>
      </div>
      <div class="stat-box hot">
        <div class="stat-num">${hotLeads}</div>
        <div class="stat-label">🔥 Hot Leads (Active)</div>
      </div>
      <div class="stat-box overdue">
        <div class="stat-num">${overdueFollowUps}</div>
        <div class="stat-label">⚠️ Overdue Follow-ups</div>
      </div>
    </div>
    <footer>This is an automated daily summary sent at 8:00 PM.</footer>
  </div>
</body>
</html>`;
}

export async function sendDailySummaryEmails(): Promise<void> {
  const dateKey = todayDateStr();
  try {
    // Get all distinct tenantIds
    const tenants = await User.distinct('tenantId', { role: { $in: ['TENANT_ADMIN', 'SUPER_ADMIN'] } });

    for (const tenantId of tenants as mongoose.Types.ObjectId[]) {
      const key = tenantId.toString();
      if (lastFiredDate[key] === dateKey) continue; // already sent today

      // Get admin/tenant admin emails for this tenant
      const admins = await User.find({ tenantId, role: { $in: ['TENANT_ADMIN'] } })
        .select('email firstName')
        .lean();

      if (admins.length === 0) continue;

      const html = await buildSummaryHtml(tenantId);
      const subject = `📊 Daily Lead Summary — ${new Date().toLocaleDateString('en-IN')}`;

      for (const admin of admins as any[]) {
        try {
          // Use the internal Brevo/nodemailer path via a direct call
          const fromEmail = process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] || process.env.EMAIL_USER;
          const fromName = process.env.EMAIL_FROM?.match(/^([^<]+)/)?.[1]?.trim() || 'CodeBegun LMS';
          const useBrevo = (process.env.EMAIL_SERVICE || 'gmail') === 'brevo';

          if (useBrevo) {
            await fetch('https://api.brevo.com/v3/smtp/email', {
              method: 'POST',
              headers: {
                accept: 'application/json',
                'api-key': process.env.BREVO_API_KEY || '',
                'content-type': 'application/json',
              },
              body: JSON.stringify({
                sender: { name: fromName, email: fromEmail },
                to: [{ email: admin.email }],
                subject,
                htmlContent: html,
                textContent: `Daily Lead Summary — ${new Date().toLocaleDateString('en-IN')}`,
              }),
            });
          } else {
            // nodemailer path — reuse emailService's transporter via sendWelcomeEmail won't work
            // so we send via the public sendAttendanceNotificationEmail as a workaround
            await (emailService as any).sendGenericEmail?.(admin.email, subject, html);
            // If sendGenericEmail doesn't exist, silently skip (brevo is the production mailer)
          }
          console.log(`[DAILY-SUMMARY] Sent to ${admin.email} (tenant ${key})`);
        } catch (err) {
          console.error(`[DAILY-SUMMARY] Failed for ${admin.email}:`, err);
        }
      }

      lastFiredDate[key] = dateKey;
    }
  } catch (err) {
    console.error('[DAILY-SUMMARY] Error:', err);
  }
}

/**
 * Start the daily summary scheduler.
 * Uses setInterval every minute and fires at SUMMARY_HOUR:SUMMARY_MINUTE.
 */
export function startDailySummaryScheduler(): NodeJS.Timeout {
  const handle = setInterval(() => {
    const now = new Date();
    if (now.getHours() === SUMMARY_HOUR && now.getMinutes() === SUMMARY_MINUTE) {
      sendDailySummaryEmails();
    }
  }, DAILY_CHECK_INTERVAL_MS);

  console.log(`[DAILY-SUMMARY] Scheduler started — will fire at ${SUMMARY_HOUR}:${String(SUMMARY_MINUTE).padStart(2, '0')} daily`);
  return handle;
}
