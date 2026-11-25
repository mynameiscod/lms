import mongoose from 'mongoose';
import * as svc from '../services/studentRulesService';

/**
 * Inactivity alerts (Student Rules): once a day, at each institute's chosen hour (IST), WhatsApp the
 * students, trainers and parents whose inactivity crossed a threshold. Each person is told once per
 * spell of inactivity (InactivityAlert), so a restart or a second run the same day sends nothing new.
 */

const lastRunDay = new Map<string, string>();
const istNow = () => new Date(Date.now() + 5.5 * 3600_000);

async function tick() {
  if (mongoose.connection.readyState !== 1) return;
  const now = istNow();
  const day = now.toISOString().slice(0, 10);
  for (const tenantId of await svc.inactivityTenants()) {
    if (lastRunDay.get(tenantId) === day) continue;
    try {
      const r = await svc.getRules(tenantId, true);
      if (!r.inactivity.enabled) continue;
      if (now.getUTCHours() < r.inactivity.sendHourIst) continue;
      if (r.inactivity.skipSundays && now.getUTCDay() === 0) { lastRunDay.set(tenantId, day); continue; }
      lastRunDay.set(tenantId, day);
      const res = await svc.runInactivity(tenantId);
      console.log(`[inactivity] ${tenantId}: student ${res.student}, trainer ${res.trainer}, parent ${res.parent}, failed ${res.failed}`);
    } catch (e: any) {
      console.error('[inactivity] run failed', tenantId, e?.message);
    }
  }
}

export function startInactivityScheduler() {
  setTimeout(() => { tick().catch(() => undefined); }, 90_000);
  setInterval(() => { tick().catch((e) => console.error('[inactivity] tick', e?.message)); }, 10 * 60_000);
  console.log('📅 Inactivity alert scheduler started (daily, institute-chosen hour IST)');
}
