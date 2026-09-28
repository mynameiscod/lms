import mongoose from 'mongoose';
import { PracticePolicy } from '../models/PracticePass';
import * as svc from '../services/practicePassService';
import * as settings from '../services/settingsService';
import { sendWhatsAppTemplate } from '../services/assessmentOtpService';

/**
 * Practice Pass schedule (IST):
 *  - every hour: recompute every institute that has the pass on, so standings and holds stay
 *    current without anyone opening a page (cheap: a few queries per 200 students);
 *  - 19:00: WhatsApp the students who still have tasks left today — only when the institute has
 *    assigned a PRACTICE_REMINDER template (Admin → WhatsApp Templates → Where used). Checked by
 *    its own key so it can never fall back to another event's template.
 */

const REMIND_HOUR_IST = 19;
let lastRecomputeHour = '';
let lastReminderDay = '';

const istNow = () => new Date(Date.now() + 5.5 * 3600_000);

async function enabledTenants(): Promise<string[]> {
  const rows = await PracticePolicy.find({ scope: 'tenant', startDate: { $exists: true, $ne: null } }).select('tenantId').lean();
  return rows.map((r) => r.tenantId);
}

async function tick() {
  if (mongoose.connection.readyState !== 1) return;
  const now = istNow();
  const hourKey = now.toISOString().slice(0, 13);
  const dayKey = now.toISOString().slice(0, 10);

  if (hourKey !== lastRecomputeHour) {
    lastRecomputeHour = hourKey;
    for (const tenantId of await enabledTenants()) {
      try { await svc.recomputeTenant(tenantId); } catch (e: any) { console.error('[practice-pass] recompute failed', tenantId, e?.message); }
    }
  }

  if (now.getUTCHours() >= REMIND_HOUR_IST && lastReminderDay !== dayKey) {
    lastReminderDay = dayKey;
    for (const tenantId of await enabledTenants()) {
      if (!settings.getStr('WHATSAPP_TEMPLATE_PRACTICE_REMINDER', '', tenantId)) continue;
      try {
        const pending = await svc.pendingToday(tenantId);
        let sent = 0;
        for (const p of pending) {
          const r = await sendWhatsAppTemplate(tenantId, p.phone, { purpose: 'PRACTICE_REMINDER', body: [p.name, p.left.join(', ')] });
          if (r.ok) sent++;
          await new Promise((ok) => setTimeout(ok, 150));
        }
        console.log(`[practice-pass] reminders ${tenantId}: ${sent}/${pending.length} sent`);
      } catch (e: any) { console.error('[practice-pass] reminders failed', tenantId, e?.message); }
    }
  }
}

export function startPracticePassScheduler() {
  setTimeout(() => { tick().catch(() => undefined); }, 60_000);
  setInterval(() => { tick().catch((e) => console.error('[practice-pass] tick', e?.message)); }, 5 * 60_000);
  console.log('📅 Practice Pass scheduler started (hourly recompute, 7 PM IST reminders)');
}
